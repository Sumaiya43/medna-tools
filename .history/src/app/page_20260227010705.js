"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CanvasWorkspace from "../components/measurement-tool/CanvasWorkspace/CanvasWorkspace";
import MeasurementControlsBar from "../components/measurement-tool/MeasurementControlsBar/MeasurementControlsBar";
import MeasurementHeader from "../components/measurement-tool/MeasurementHeader/MeasurementHeader";
import MeasurementSummary from "../components/measurement-tool/MeasurementSummary/MeasurementSummary";
import styles from "./page.module.css";

const TOOLS = {
  line: "LINE",
  angle: "ANGLE",
  rect: "RECT",
  circle: "CIRCLE",
  pen: "PEN",
};

const TOOL_SIDEBAR_LABELS = {
  [TOOLS.line]: { icon: "📏", label: "Line" },
  [TOOLS.angle]: { icon: "📐", label: "Angle" },
  [TOOLS.circle]: { icon: "⭕", label: "Circle" },
  [TOOLS.rect]: { icon: "⬛", label: "Rect" },
  [TOOLS.pen]: { icon: "✏️", label: "Draw" },
};

export default function Home() {
  const canvasRef = useRef(null);
  const trashBinRef = useRef(null);

  // How image is drawn in the canvas (scale + offsets)
  const viewRef = useRef({ scale: 1, offX: 0, offY: 0, drawW: 0, drawH: 0 });

  const [imgObj, setImgObj] = useState(null);

  // Drag & drop UI
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Tool + style
  const [tool, setTool] = useState(TOOLS.line);
  const [strokeColor, setStrokeColor] = useState("#ffd400");
  const [lineWidth, setLineWidth] = useState(1);
  const [cursorMarkerSize, setCursorMarkerSize] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const [railHidden, setRailHidden] = useState(false);
  const [railExpanded, setRailExpanded] = useState(true);
  const [railPinned, setRailPinned] = useState(true);

  // Measurement digit (label)
  const [manualCmByTool, setManualCmByTool] = useState({
    line: "1.0",
    rect: "1.0",
    circle: "1.0",
    pen: "1.0",
  });

  // Saved items + draft
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [hoverHandle, setHoverHandle] = useState(null);
  const [timeline, setTimeline] = useState({ past: [], future: [] });
  const itemsRef = useRef([]);
  const selectedIndexRef = useRef(null);
  const dragStartSnapshotRef = useRef(null);
  const dragChangedRef = useRef(false);

  // IMPORTANT: draw ONE shape only, then stop
  const [armed, setArmed] = useState(false);

  // Prevent accidental click after drag
  const suppressClickRef = useRef(false);
  const [deleteHot, setDeleteHot] = useState(false);

  // Drag state:
  //  NONE   : nothing
  //  HANDLE : dragging A/B/V
  //  MOVE   : moving whole shape
  //  DRAW   : drawing rect/circle/pen
  const [drag, setDrag] = useState({ type: "NONE" });

  function clearHistory() {
    setTimeline({ past: [], future: [] });
  }

  function pushHistory(snapshot) {
    setTimeline((prev) => ({
      past: [...prev.past, snapshot].slice(-100),
      future: [],
    }));
  }

  function commitItems(nextItems, nextSelectedIndex) {
    pushHistory({
      items: itemsRef.current,
      selectedIndex: selectedIndexRef.current,
    });
    setItems(nextItems);
    setSelectedIndex(nextSelectedIndex);
  }

  function undo() {
    setTimeline((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const current = {
        items: itemsRef.current,
        selectedIndex: selectedIndexRef.current,
      };
      setItems(previous.items);
      setSelectedIndex(previous.selectedIndex);
      return {
        past: prev.past.slice(0, -1),
        future: [current, ...prev.future].slice(0, 100),
      };
    });
  }

  function redo() {
    setTimeline((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const current = {
        items: itemsRef.current,
        selectedIndex: selectedIndexRef.current,
      };
      setItems(next.items);
      setSelectedIndex(next.selectedIndex);
      return {
        past: [...prev.past, current].slice(-100),
        future: prev.future.slice(1),
      };
    });
  }

  // ---------------- BASIC MATH ----------------
  function dist(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function clampToImage(p) {
    if (!imgObj) return p;
    return {
      x: Math.max(0, Math.min(imgObj.width, p.x)),
      y: Math.max(0, Math.min(imgObj.height, p.y)),
    };
  }

  // distance from point P to segment AB (for clicking line body)
  function pointToSegmentDistance(P, A, B) {
    const ABx = B.x - A.x;
    const ABy = B.y - A.y;
    const APx = P.x - A.x;
    const APy = P.y - A.y;

    const ab2 = ABx * ABx + ABy * ABy;
    if (ab2 === 0) return dist(P, A);

    let t = (APx * ABx + APy * ABy) / ab2;
    t = Math.max(0, Math.min(1, t));

    const closest = { x: A.x + ABx * t, y: A.y + ABy * t };
    return dist(P, closest);
  }

  function angleDeg(A, V, B) {
    const v1 = { x: A.x - V.x, y: A.y - V.y };
    const v2 = { x: B.x - V.x, y: B.y - V.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const m1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const m2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (m1 === 0 || m2 === 0) return 0;

    const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
    return (Math.acos(cos) * 180) / Math.PI;
  }

  // ---------------- COORDS ----------------
  function canvasToImagePoint(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const { scale, offX, offY } = viewRef.current;
    return { x: (cx - offX) / scale, y: (cy - offY) / scale };
  }

  function imageToCanvasPoint(p) {
    const { scale, offX, offY } = viewRef.current;
    return { x: offX + p.x * scale, y: offY + p.y * scale };
  }

  function zoomAtPoint(nextZoom, canvasPoint) {
    if (!imgObj || !canvasRef.current) return;
    const clampedZoom = Math.max(0.25, Math.min(8, nextZoom));
    const rect = canvasRef.current.getBoundingClientRect();
    const baseScale = Math.min(
      rect.width / imgObj.width,
      rect.height / imgObj.height,
    );
    const nextScale = baseScale * clampedZoom;

    const imagePoint = canvasToImagePoint({
      clientX: rect.left + canvasPoint.x,
      clientY: rect.top + canvasPoint.y,
    });

    const centeredOffX = (rect.width - imgObj.width * nextScale) / 2;
    const centeredOffY = (rect.height - imgObj.height * nextScale) / 2;
    const desiredOffX = canvasPoint.x - imagePoint.x * nextScale;
    const desiredOffY = canvasPoint.y - imagePoint.y * nextScale;

    setZoom(clampedZoom);
    setPan({
      x: desiredOffX - centeredOffX,
      y: desiredOffY - centeredOffY,
    });
  }

  function zoomBy(factor) {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    zoomAtPoint(zoomRef.current * factor, {
      x: rect.width / 2,
      y: rect.height / 2,
    });
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function isEventOverTrash(e) {
    if (!trashBinRef.current) return false;
    const r = trashBinRef.current.getBoundingClientRect();
    return (
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom
    );
  }

  function toolKeyForType(type) {
    if (type === "line") return "line";
    if (type === "rect") return "rect";
    if (type === "circle") return "circle";
    if (type === "pen") return "pen";
    return null;
  }

  function manualLabelForType(type, fallback = "") {
    const key = toolKeyForType(type);
    if (!key) return fallback;
    const val = String(manualCmByTool[key] ?? "").trim();
    return val ? val : fallback;
  }

  function measurementLabelForItem(it, fallbackType) {
    const raw = String(it?.measurementCmValue ?? "").trim();
    if (raw) return raw;
    if (it?.measurementCmLabel) return it.measurementCmLabel;
    return manualLabelForType(fallbackType);
  }

  // ---------------- DRAW ----------------
  function drawAll() {
    const canvas = canvasRef.current;
    if (!canvas || !imgObj) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // background
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // contain image in fixed viewer
    const baseScale = Math.min(
      rect.width / imgObj.width,
      rect.height / imgObj.height,
    );
    const scale = baseScale * zoom;
    const drawW = imgObj.width * scale;
    const drawH = imgObj.height * scale;
    const offX = (rect.width - drawW) / 2 + pan.x;
    const offY = (rect.height - drawH) / 2 + pan.y;
    viewRef.current = { scale, offX, offY, drawW, drawH };

    // image
    ctx.save();
    ctx.globalAlpha = 0.98;
    ctx.drawImage(imgObj, offX, offY, drawW, drawH);
    ctx.restore();

    // vignette
    ctx.save();
    const g = ctx.createRadialGradient(
      rect.width / 2,
      rect.height / 2,
      Math.min(rect.width, rect.height) * 0.2,
      rect.width / 2,
      rect.height / 2,
      Math.min(rect.width, rect.height) * 0.75,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.restore();

    // draw saved + draft
    items.forEach((it, idx) => drawItem(ctx, it, false, idx));
    if (draft) drawItem(ctx, draft, true, null);
  }

  function drawItem(ctx, it, isDraft, itemIndex) {
    const color = it.color || strokeColor;
    const width = it.width || lineWidth;

    function main(pathFn) {
      ctx.save();
      pathFn();
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.strokeStyle = color;
      ctx.globalAlpha = isDraft ? 0.85 : 1;
      ctx.stroke();
      ctx.restore();
    }

    function handleDot(pImg) {
      const p = imageToCanvasPoint(pImg);
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fill();
      ctx.restore();
    }

    function shouldShowHandle(key) {
      if (itemIndex === null || itemIndex === undefined) return false;
      if (
        drag.type === "HANDLE" &&
        drag.index === itemIndex &&
        drag.key === key
      )
        return true;
      return hoverHandle?.index === itemIndex && hoverHandle?.key === key;
    }

    // LINE
    if (it.type === "line" && it.A && it.B) {
      const A = imageToCanvasPoint(it.A);
      const B = imageToCanvasPoint(it.B);

      main(() => {
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
      });

      if (shouldShowHandle("A")) handleDot(it.A);
      if (shouldShowHandle("B")) handleDot(it.B);
    }

    // ANGLE
    if (it.type === "angle" && it.A && it.V && it.B) {
      const A = imageToCanvasPoint(it.A);
      const V = imageToCanvasPoint(it.V);
      const B = imageToCanvasPoint(it.B);

      main(() => {
        ctx.beginPath();
        ctx.moveTo(V.x, V.y);
        ctx.lineTo(A.x, A.y);
        ctx.moveTo(V.x, V.y);
        ctx.lineTo(B.x, B.y);
      });

      if (shouldShowHandle("A")) handleDot(it.A);
      if (shouldShowHandle("V")) handleDot(it.V);
      if (shouldShowHandle("B")) handleDot(it.B);
    }

    // RECT
    if (it.type === "rect" && it.A && it.B) {
      const A = imageToCanvasPoint(it.A);
      const B = imageToCanvasPoint(it.B);

      const x = Math.min(A.x, B.x);
      const y = Math.min(A.y, B.y);
      const w = Math.abs(B.x - A.x);
      const h = Math.abs(B.y - A.y);

      main(() => {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
      });

      if (shouldShowHandle("A")) handleDot(it.A);
      if (shouldShowHandle("B")) handleDot(it.B);
    }

    // CIRCLE
    if (it.type === "circle" && it.A && it.B) {
      const A = imageToCanvasPoint(it.A);
      const B = imageToCanvasPoint(it.B);
      const r = Math.sqrt((B.x - A.x) ** 2 + (B.y - A.y) ** 2);

      main(() => {
        ctx.beginPath();
        ctx.arc(A.x, A.y, r, 0, Math.PI * 2);
      });

      if (shouldShowHandle("A")) handleDot(it.A);
      if (shouldShowHandle("B")) handleDot(it.B);
    }

    // PEN
    if (it.type === "pen" && it.points && it.points.length > 1) {
      const pts = it.points.map(imageToCanvasPoint);

      main(() => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      });

      if (shouldShowHandle("P_START")) handleDot(it.points[0]);
      if (shouldShowHandle("P_END")) handleDot(it.points[it.points.length - 1]);
    }
  }

  // ---------------- IMAGE LOAD ----------------
  function loadFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImgObj(image);
      setItems([]);
      setDraft(null);
      setSelectedIndex(null);
      setHoverHandle(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setDrag({ type: "NONE" });
      setDeleteHot(false);
      setArmed(false);
      clearHistory();
    };
    image.src = url;
  }

  // ---------------- HIT TEST (EDIT) ----------------
  const HANDLE_RADIUS = 12;

  function hitHandle(p, h) {
    if (!h) return false;
    return dist(p, h) <= HANDLE_RADIUS;
  }

  function hitItem(p, it) {
    // returns { kind:"HANDLE", key:"A|B|V" } or { kind:"MOVE" } or null
    if (!it) return null;

    if (it.type === "line" && it.A && it.B) {
      if (hitHandle(p, it.A)) return { kind: "HANDLE", key: "A" };
      if (hitHandle(p, it.B)) return { kind: "HANDLE", key: "B" };
      if (pointToSegmentDistance(p, it.A, it.B) <= 10) return { kind: "MOVE" };
    }

    if (it.type === "angle" && it.A && it.V && it.B) {
      if (hitHandle(p, it.A)) return { kind: "HANDLE", key: "A" };
      if (hitHandle(p, it.V)) return { kind: "HANDLE", key: "V" };
      if (hitHandle(p, it.B)) return { kind: "HANDLE", key: "B" };
      const d1 = pointToSegmentDistance(p, it.V, it.A);
      const d2 = pointToSegmentDistance(p, it.V, it.B);
      if (Math.min(d1, d2) <= 10) return { kind: "MOVE" };
    }

    if (it.type === "rect" && it.A && it.B) {
      if (hitHandle(p, it.A)) return { kind: "HANDLE", key: "A" };
      if (hitHandle(p, it.B)) return { kind: "HANDLE", key: "B" };
      const minX = Math.min(it.A.x, it.B.x);
      const maxX = Math.max(it.A.x, it.B.x);
      const minY = Math.min(it.A.y, it.B.y);
      const maxY = Math.max(it.A.y, it.B.y);
      if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY)
        return { kind: "MOVE" };
    }

    if (it.type === "circle" && it.A && it.B) {
      if (hitHandle(p, it.A)) return { kind: "HANDLE", key: "A" };
      if (hitHandle(p, it.B)) return { kind: "HANDLE", key: "B" };
      const r = dist(it.A, it.B);
      const d = Math.abs(dist(p, it.A) - r);
      if (d <= 10) return { kind: "MOVE" };
    }

    if (it.type === "pen" && it.points && it.points.length > 1) {
      for (let i = 0; i < it.points.length; i += 6) {
        if (hitHandle(p, it.points[i])) return { kind: "MOVE" };
      }
    }

    return null;
  }

  function findHoveredHandle(p) {
    for (let index = items.length - 1; index >= 0; index--) {
      const it = items[index];
      if (it.type === "line" || it.type === "rect" || it.type === "circle") {
        if (hitHandle(p, it.A)) return { index, key: "A" };
        if (hitHandle(p, it.B)) return { index, key: "B" };
      }
      if (it.type === "angle") {
        if (hitHandle(p, it.A)) return { index, key: "A" };
        if (hitHandle(p, it.V)) return { index, key: "V" };
        if (hitHandle(p, it.B)) return { index, key: "B" };
      }
      if (it.type === "pen" && it.points?.length > 1) {
        if (hitHandle(p, it.points[0])) return { index, key: "P_START" };
        if (hitHandle(p, it.points[it.points.length - 1]))
          return { index, key: "P_END" };
      }
    }
    return null;
  }

  // ---------------- EVENTS ----------------
  function handleCanvasClick(e) {
    if (!imgObj) return;

    // stop accidental click right after drag
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    // not armed = no new shapes
    if (!armed) return;

    // dragging/editing = ignore
    if (drag.type !== "NONE") return;

    let p = clampToImage(canvasToImagePoint(e));

    // LINE = 2 clicks then STOP
    if (tool === TOOLS.line) {
      if (!draft) {
        setDraft({
          type: "line",
          A: p,
          B: null,
          color: strokeColor,
          width: lineWidth,
          measurementCmValue: manualCmByTool.line,
          measurementCmLabel: manualLabelForType("line"),
        });
      } else if (draft.type === "line" && !draft.B) {
        const done = { ...draft, B: p };
        const next = [...itemsRef.current, done];
        commitItems(next, next.length - 1);
        setDraft(null);
        setArmed(false); // ✅ stop drawing until button clicked again
      }
    }

    // ANGLE = 3 clicks then STOP
    if (tool === TOOLS.angle) {
      if (!draft) {
        setDraft({
          type: "angle",
          A: p,
          V: null,
          B: null,
          color: strokeColor,
          width: lineWidth,
        });
      } else if (draft.type === "angle" && !draft.V) {
        setDraft({ ...draft, V: p });
      } else if (draft.type === "angle" && !draft.B) {
        const done = { ...draft, B: p };
        const next = [...itemsRef.current, done];
        commitItems(next, next.length - 1);
        setDraft(null);
        setArmed(false); // ✅ stop drawing until button clicked again
      }
    }
  }

  function handleMouseDown(e) {
    if (!imgObj) return;

    let p = clampToImage(canvasToImagePoint(e));
    setDeleteHot(false);

    // 1) try EDIT top-most item first
    for (let index = items.length - 1; index >= 0; index--) {
      const it = items[index];
      const hit = hitItem(p, it);
      if (!hit) continue;

      if (hit.kind === "HANDLE") {
        setSelectedIndex(index);
        dragStartSnapshotRef.current = {
          items: itemsRef.current,
          selectedIndex: selectedIndexRef.current,
        };
        dragChangedRef.current = false;
        setDrag({ type: "HANDLE", index, key: hit.key });
        return;
      }

      if (hit.kind === "MOVE") {
        setSelectedIndex(index);
        dragStartSnapshotRef.current = {
          items: itemsRef.current,
          selectedIndex: selectedIndexRef.current,
        };
        dragChangedRef.current = false;
        setDrag({
          type: "MOVE",
          index,
          start: p,
          original: JSON.parse(JSON.stringify(it)),
        });
        return;
      }
    }

    // 2) if not armed, do NOT start new drawings
    if (!armed) {
      setSelectedIndex(null);
      return;
    }

    // 3) DRAW tools (drag)
    if (tool === TOOLS.rect) {
      setDrag({ type: "DRAW" });
      setDraft({
        type: "rect",
        A: p,
        B: p,
        color: strokeColor,
        width: lineWidth,
        measurementCmValue: manualCmByTool.rect,
        measurementCmLabel: manualLabelForType("rect"),
      });
      return;
    }

    if (tool === TOOLS.circle) {
      setDrag({ type: "DRAW" });
      setDraft({
        type: "circle",
        A: p,
        B: p,
        color: strokeColor,
        width: lineWidth,
        measurementCmValue: manualCmByTool.circle,
        measurementCmLabel: manualLabelForType("circle"),
      });
      return;
    }

    if (tool === TOOLS.pen) {
      setDrag({ type: "DRAW" });
      setDraft({
        type: "pen",
        points: [p],
        color: strokeColor,
        width: lineWidth,
        measurementCmValue: manualCmByTool.pen,
        measurementCmLabel: manualLabelForType("pen"),
      });
      return;
    }

    setSelectedIndex(null);
  }

  function handleMouseMove(e) {
    if (!imgObj) return;

    let p = clampToImage(canvasToImagePoint(e));

    if (drag.type === "NONE") {
      setHoverHandle(findHoveredHandle(p));
      return;
    }

    // drag handle
    if (drag.type === "HANDLE") {
      dragChangedRef.current = true;
      setDeleteHot(isEventOverTrash(e));
      setHoverHandle({ index: drag.index, key: drag.key });
      setItems((prev) =>
        prev.map((it, i) => {
          if (i !== drag.index) return it;
          return { ...it, [drag.key]: p };
        }),
      );
      return;
    }

    // move whole shape
    if (drag.type === "MOVE") {
      dragChangedRef.current = true;
      setDeleteHot(isEventOverTrash(e));
      const dx = p.x - drag.start.x;
      const dy = p.y - drag.start.y;

      setItems((prev) =>
        prev.map((it, i) => {
          if (i !== drag.index) return it;

          const o = drag.original;

          if (o.type === "line") {
            return {
              ...it,
              A: { x: o.A.x + dx, y: o.A.y + dy },
              B: { x: o.B.x + dx, y: o.B.y + dy },
            };
          }
          if (o.type === "angle") {
            return {
              ...it,
              A: { x: o.A.x + dx, y: o.A.y + dy },
              V: { x: o.V.x + dx, y: o.V.y + dy },
              B: { x: o.B.x + dx, y: o.B.y + dy },
            };
          }
          if (o.type === "rect" || o.type === "circle") {
            return {
              ...it,
              A: { x: o.A.x + dx, y: o.A.y + dy },
              B: { x: o.B.x + dx, y: o.B.y + dy },
            };
          }
          if (o.type === "pen") {
            return {
              ...it,
              points: o.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })),
            };
          }
          return it;
        }),
      );
      return;
    }

    // drawing drag tools
    if (drag.type === "DRAW" && draft) {
      if (deleteHot) setDeleteHot(false);
      if (draft.type === "rect" || draft.type === "circle") {
        setDraft({ ...draft, B: p });
      } else if (draft.type === "pen") {
        setDraft({ ...draft, points: [...draft.points, p] });
      }
    }
  }

  function handleMouseUp(e) {
    if (drag.type === "NONE") return;

    // block the click that sometimes fires after drag
    suppressClickRef.current = true;

    const canDelete =
      e &&
      (drag.type === "MOVE" || drag.type === "HANDLE") &&
      typeof drag.index === "number";
    const isDropOnDelete = canDelete && isEventOverTrash(e);

    if (isDropOnDelete) {
      const next = itemsRef.current.filter((_, i) => i !== drag.index);
      const nextSelected =
        selectedIndexRef.current === null
          ? null
          : selectedIndexRef.current === drag.index
            ? null
            : selectedIndexRef.current > drag.index
              ? selectedIndexRef.current - 1
              : selectedIndexRef.current;
      commitItems(next, nextSelected);
      setDeleteHot(false);
      setDrag({ type: "NONE" });
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      return;
    }

    // finish draw tools -> save once, then STOP drawing
    if (drag.type === "DRAW" && draft) {
      if (
        draft.type === "rect" ||
        draft.type === "circle" ||
        draft.type === "pen"
      ) {
        const next = [...itemsRef.current, draft];
        commitItems(next, next.length - 1);
        setDraft(null);
        setArmed(false); // ✅ stop drawing until button clicked again
      }
    }

    if (
      (drag.type === "MOVE" || drag.type === "HANDLE") &&
      dragChangedRef.current &&
      dragStartSnapshotRef.current
    ) {
      pushHistory(dragStartSnapshotRef.current);
    }

    setDeleteHot(false);
    setHoverHandle(null);
    setDrag({ type: "NONE" });
    dragChangedRef.current = false;
    dragStartSnapshotRef.current = null;

    // allow clicks again safely
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }

  function resetAll() {
    if (itemsRef.current.length > 0) {
      pushHistory({
        items: itemsRef.current,
        selectedIndex: selectedIndexRef.current,
      });
    }
    setItems([]);
    setDraft(null);
    setSelectedIndex(null);
    setHoverHandle(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setDrag({ type: "NONE" });
    setDeleteHot(false);
    setArmed(false);
  }

  // redraw
  useEffect(() => {
    drawAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    imgObj,
    items,
    draft,
    strokeColor,
    lineWidth,
    zoom,
    pan,
    hoverHandle,
    drag,
  ]);

  useEffect(() => {
    itemsRef.current = items;
    selectedIndexRef.current = selectedIndex;
  }, [items, selectedIndex]);

  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
  }, [zoom, pan]);

  // panel summary
  const activeItem = selectedIndex !== null ? items[selectedIndex] : null;
  const activeTypeName = activeItem
    ? activeItem.type.charAt(0).toUpperCase() + activeItem.type.slice(1)
    : "";
  const activeMeasurementValue = activeItem
    ? String(activeItem.measurementCmValue ?? "").trim()
    : "";

  function updateActiveMeasurement(nextValue) {
    if (!activeItem || activeItem.type === "angle") return;
    const next = itemsRef.current.map((it, i) =>
      i === selectedIndex
        ? {
            ...it,
            measurementCmValue: nextValue,
            measurementCmLabel: nextValue || "",
          }
        : it,
    );
    commitItems(next, selectedIndex);
  }

  let selectedSummary = "—";
  if (
    activeItem &&
    (activeItem.type === "line" ||
      activeItem.type === "rect" ||
      activeItem.type === "circle" ||
      activeItem.type === "pen")
  ) {
    selectedSummary =
      measurementLabelForItem(activeItem, activeItem.type) || "—";
  }
  if (
    activeItem?.type === "angle" &&
    activeItem.A &&
    activeItem.V &&
    activeItem.B
  ) {
    selectedSummary = `${angleDeg(activeItem.A, activeItem.V, activeItem.B).toFixed(1)}°`;
  }

  // ---------------- UI TOOL BUTTONS (ARM ONLY WHEN CLICKED) ----------------
  function armTool(nextTool) {
    setTool(nextTool);
    setDraft(null);
    setArmed(true); // ✅ allow drawing ONE new shape
  }
  const isDraggingExistingShape =
    drag.type === "MOVE" || drag.type === "HANDLE";
  const canUndo = timeline.past.length > 0;
  const canRedo = timeline.future.length > 0;
  const angleValue =
    activeItem?.A && activeItem?.V && activeItem?.B
      ? `${angleDeg(activeItem.A, activeItem.V, activeItem.B).toFixed(1)}°`
      : "—";
  const canvasCursor = useMemo(() => {
    const sizeLevel = Math.max(1, Math.min(8, Number(cursorMarkerSize) || 1));
    const size = 12 + sizeLevel * 8;
    const c = Math.round(size / 2);
    const stroke = Math.max(1, Math.round(size * 0.08));
    const dot = Math.max(1.5, size * 0.08);
    const cursorColor = "#d62828";
    const markerColor = "#c65a00";
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'><line x1='${c}' y1='2' x2='${c}' y2='${size - 2}' stroke='${cursorColor}' stroke-width='${stroke}'/><line x1='2' y1='${c}' x2='${size - 2}' y2='${c}' stroke='${cursorColor}' stroke-width='${stroke}'/><circle cx='${c}' cy='${c}' r='${dot}' fill='${markerColor}'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${c} ${c}, crosshair`;
  }, [cursorMarkerSize]);

  const toolSidebarProps = {
    railHidden,
    railExpanded,
    railPinned,
    tool,
    toolLabels: TOOL_SIDEBAR_LABELS,
    onToggleExpanded: () => setRailExpanded((v) => !v),
    onTogglePinned: () => setRailPinned((v) => !v),
    onHide: () => setRailHidden(true),
    onShow: () => setRailHidden(false),
    onToolSelect: armTool,
    strokeColor,
    lineWidth,
    onStrokeColorChange: setStrokeColor,
    onLineWidthChange: setLineWidth,
  };


  
  return (
    <main className={styles.main}>
      <MeasurementHeader tool={tool} armed={armed} activeTypeName={activeTypeName} />

      <MeasurementControlsBar
        imgObj={imgObj}
        activeTypeName={activeTypeName}
        activeItem={activeItem}
        activeMeasurementValue={activeMeasurementValue}
        angleValue={angleValue}
        manualCmByTool={manualCmByTool}
        canUndo={canUndo}
        canRedo={canRedo}
        cursorMarkerSize={cursorMarkerSize}
        onFileSelect={loadFile}
        onUpdateActiveMeasurement={updateActiveMeasurement}
        onManualToolValueChange={(key, value) =>
          setManualCmByTool((prev) => ({ ...prev, [key]: value }))
        }
        onUndo={undo}
        onRedo={redo}
        onCursorSizeChange={setCursorMarkerSize}
        onReset={resetAll}
      />

      <CanvasWorkspace
        imgObj={imgObj}
        railPinned={railPinned}
        setRailExpanded={setRailExpanded}
        isDraggingFile={isDraggingFile}
        onDropFile={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          loadFile(e.dataTransfer.files?.[0]);
        }}
        onDragOverFile={(e) => e.preventDefault()}
        onDragEnterFile={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeaveFile={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
        }}
        toolSidebarProps={toolSidebarProps}
        canvasRef={canvasRef}
        canvasCursor={canvasCursor}
        onCanvasWheel={(e) => {
          if (!imgObj) return;
          e.preventDefault();
          const rect = canvasRef.current.getBoundingClientRect();
          const zoomFactor = Math.exp(-e.deltaY * 0.0018);
          zoomAtPoint(zoomRef.current * zoomFactor, {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }}
        onCanvasClick={handleCanvasClick}
        onCanvasMouseDown={handleMouseDown}
        onCanvasMouseMove={handleMouseMove}
        onCanvasMouseUp={handleMouseUp}
        onCanvasMouseLeave={(e) => {
          setHoverHandle(null);
          handleMouseUp(e);
        }}
        zoom={zoom}
        onZoomIn={() => zoomBy(1.1)}
        onZoomOut={() => zoomBy(0.9)}
        onZoomReset={resetView}
        trashBinRef={trashBinRef}
        isDraggingExistingShape={isDraggingExistingShape}
        deleteHot={deleteHot}
      />

      <MeasurementSummary selectedSummary={selectedSummary} />
    </main>
  );
}
