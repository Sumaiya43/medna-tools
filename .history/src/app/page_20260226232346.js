// "use client";

// import { useEffect, useRef, useState } from "react";
// import styles from "./page.module.css";

// export default function Home() {
//   const canvasRef = useRef(null);

//   const [imgObj, setImgObj] = useState(null);

//   // Multi-line tool
//   const [lines, setLines] = useState([{ A: null, B: null }]);
//   const [activeIndex, setActiveIndex] = useState(0);

//   // Drag: which line + which point
//   const [drag, setDrag] = useState({ lineIndex: null, point: null });

//   // Calibration (px per 1 cm)
//   const [pxPerCm, setPxPerCm] = useState(100);

//   // View transform for "fit image into fixed canvas"
//   // scale + offsets tell us how image is drawn inside the canvas
//   const viewRef = useRef({ scale: 1, offX: 0, offY: 0, drawW: 0, drawH: 0 });

//   const dotSize = 9; // handles
//   const grabPadding = 10; // easy to grab

//   // -------- Helpers --------
//   function dist(p1, p2) {
//     const dx = p1.x - p2.x;
//     const dy = p1.y - p2.y;
//     return Math.sqrt(dx * dx + dy * dy);
//   }

//   function hitTest(point, dotCenter) {
//     if (!dotCenter) return false;
//     return dist(point, dotCenter) <= dotSize + grabPadding;
//   }

//   function lineColor(i) {
//     const colors = ["#3AA0FF", "#22C55E", "#F97316", "#A855F7", "#EF4444"];
//     return colors[i % colors.length];
//   }

//   // Convert mouse position (canvas space) -> image space
//   function canvasToImagePoint(e) {
//     const canvas = canvasRef.current;
//     const rect = canvas.getBoundingClientRect();

//     // mouse in CSS pixels
//     const cx = e.clientX - rect.left;
//     const cy = e.clientY - rect.top;

//     const { scale, offX, offY } = viewRef.current;

//     // image coords = (canvas coords - offset) / scale
//     const x = (cx - offX) / scale;
//     const y = (cy - offY) / scale;

//     return { x, y };
//   }

//   // Clamp point to image bounds (so user can’t drag outside)
//   function clampToImage(p) {
//     if (!imgObj) return p;
//     return {
//       x: Math.max(0, Math.min(imgObj.width, p.x)),
//       y: Math.max(0, Math.min(imgObj.height, p.y)),
//     };
//   }

//   // -------- Drawing --------
//   function drawAll() {
//     const canvas = canvasRef.current;
//     if (!canvas || !imgObj) return;

//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     // Fixed viewport size based on CSS box
//     const rect = canvas.getBoundingClientRect();
//     const dpr = window.devicePixelRatio || 1;

//     // Make drawing crisp on retina screens
//     canvas.width = Math.round(rect.width * dpr);
//     canvas.height = Math.round(rect.height * dpr);
//     ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw using CSS pixel units

//     // Background (premium)
//     ctx.clearRect(0, 0, rect.width, rect.height);
//     ctx.fillStyle = "#0b1220";
//     ctx.fillRect(0, 0, rect.width, rect.height);

//     // Fit image into canvas (contain)
//     const scale = Math.min(
//       rect.width / imgObj.width,
//       rect.height / imgObj.height,
//     );
//     const drawW = imgObj.width * scale;
//     const drawH = imgObj.height * scale;
//     const offX = (rect.width - drawW) / 2;
//     const offY = (rect.height - drawH) / 2;

//     // Save transform for click mapping
//     viewRef.current = { scale, offX, offY, drawW, drawH };

//     // Draw image (slightly softened)
//     ctx.save();
//     ctx.globalAlpha = 0.98;
//     ctx.drawImage(imgObj, offX, offY, drawW, drawH);
//     ctx.restore();

//     // Subtle vignette overlay (premium look)
//     ctx.save();
//     const g = ctx.createRadialGradient(
//       rect.width / 2,
//       rect.height / 2,
//       Math.min(rect.width, rect.height) * 0.2,
//       rect.width / 2,
//       rect.height / 2,
//       Math.min(rect.width, rect.height) * 0.75,
//     );
//     g.addColorStop(0, "rgba(0,0,0,0)");
//     g.addColorStop(1, "rgba(0,0,0,0.35)");
//     ctx.fillStyle = g;
//     ctx.fillRect(0, 0, rect.width, rect.height);
//     ctx.restore();

//     // Draw all lines (premium)
//     lines.forEach((ln, i) => {
//       const { A, B } = ln;
//       if (!A || !B) return;

//       // Convert image coords -> canvas coords for drawing
//       const Ax = offX + A.x * scale;
//       const Ay = offY + A.y * scale;
//       const Bx = offX + B.x * scale;
//       const By = offY + B.y * scale;

//       const base = lineColor(i);

//       // Glow under-line
//       ctx.save();
//       ctx.beginPath();
//       ctx.moveTo(Ax, Ay);
//       ctx.lineTo(Bx, By);
//       ctx.lineWidth = 8;
//       ctx.lineCap = "round";
//       ctx.strokeStyle = base;
//       ctx.globalAlpha = 0.18;
//       ctx.shadowBlur = 18;
//       ctx.shadowColor = base;
//       ctx.stroke();
//       ctx.restore();

//       // Main line with gradient
//       ctx.save();
//       const grad = ctx.createLinearGradient(Ax, Ay, Bx, By);
//       grad.addColorStop(0, "rgba(255,255,255,0.9)");
//       grad.addColorStop(0.25, base);
//       grad.addColorStop(1, "rgba(255,255,255,0.65)");

//       ctx.beginPath();
//       ctx.moveTo(Ax, Ay);
//       ctx.lineTo(Bx, By);
//       ctx.lineWidth = 4;
//       ctx.lineCap = "round";
//       ctx.strokeStyle = grad;
//       ctx.shadowBlur = 6;
//       ctx.shadowColor = "rgba(0,0,0,0.35)";
//       ctx.stroke();
//       ctx.restore();

//       // Handles (premium ring)
//       drawHandle(ctx, Ax, Ay, i === activeIndex);
//       drawHandle(ctx, Bx, By, i === activeIndex);

//       // Measurement label bubble (premium)
//       const midX = (Ax + Bx) / 2;
//       const midY = (Ay + By) / 2;

//       const dx = B.x - A.x;
//       const dy = B.y - A.y;
//       const distancePx = Math.sqrt(dx * dx + dy * dy);
//       const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

//       const cm = pxPerCm > 0 ? distancePx / pxPerCm : null;
//     });

//     // If active line has only A (first click), draw a small crosshair at A
//     const active = lines[activeIndex];
//     if (active?.A && !active?.B) {
//       const Ax = offX + active.A.x * scale;
//       const Ay = offY + active.A.y * scale;
//       drawCrosshair(ctx, Ax, Ay);
//     }
//   }

//   function drawHandle(ctx, x, y, isActive) {
//     ctx.save();

//     // Outer ring
//     ctx.beginPath();
//     ctx.arc(x, y, isActive ? 10 : 9, 0, Math.PI * 2);
//     ctx.fillStyle = "rgba(255,255,255,0.10)";
//     ctx.fill();

//     ctx.lineWidth = 2;
//     ctx.strokeStyle = isActive
//       ? "rgba(255,255,255,0.85)"
//       : "rgba(255,255,255,0.55)";
//     ctx.stroke();

//     // Inner dot
//     ctx.beginPath();
//     ctx.arc(x, y, isActive ? 4.5 : 4, 0, Math.PI * 2);
//     ctx.fillStyle = "rgba(255,255,255,0.9)";
//     ctx.fill();

//     ctx.restore();
//   }

//   function drawLabel(ctx, x, y, text, accent) {
//     ctx.save();
//     ctx.font = "12px Inter, Arial";
//     ctx.textBaseline = "middle";

//     const padX = 10;
//     const padY = 8;
//     const textW = ctx.measureText(text).width;
//     const boxW = textW + padX * 2;
//     const boxH = 28;

//     const bx = x - boxW / 2;
//     const by = y - 34; // above the line

//     // Background bubble
//     ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
//     ctx.strokeStyle = "rgba(255,255,255,0.18)";
//     ctx.lineWidth = 1;

//     roundRect(ctx, bx, by, boxW, boxH, 10);
//     ctx.fill();
//     ctx.stroke();

//     // Accent bar
//     ctx.fillStyle = accent;
//     roundRect(ctx, bx + 6, by + 6, 4, boxH - 12, 4);
//     ctx.fill();

//     // Text
//     ctx.fillStyle = "rgba(255,255,255,0.92)";
//     ctx.fillText(text, bx + padX + 6, by + boxH / 2);

//     ctx.restore();
//   }

//   function drawCrosshair(ctx, x, y) {
//     ctx.save();
//     ctx.strokeStyle = "rgba(255,255,255,0.6)";
//     ctx.lineWidth = 1;
//     ctx.beginPath();
//     ctx.moveTo(x - 12, y);
//     ctx.lineTo(x + 12, y);
//     ctx.moveTo(x, y - 12);
//     ctx.lineTo(x, y + 12);
//     ctx.stroke();
//     ctx.restore();
//   }

//   function roundRect(ctx, x, y, w, h, r) {
//     const rr = Math.min(r, w / 2, h / 2);
//     ctx.beginPath();
//     ctx.moveTo(x + rr, y);
//     ctx.arcTo(x + w, y, x + w, y + h, rr);
//     ctx.arcTo(x + w, y + h, x, y + h, rr);
//     ctx.arcTo(x, y + h, x, y, rr);
//     ctx.arcTo(x, y, x + w, y, rr);
//     ctx.closePath();
//   }

//   // Redraw whenever lines / activeIndex / image / pxPerCm changes
//   useEffect(() => {
//     drawAll();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [imgObj, lines, activeIndex, pxPerCm]);

//   // -------- Upload --------
//   function handleUpload(e) {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     const url = URL.createObjectURL(file);
//     const image = new Image();

//     image.onload = () => {
//       setImgObj(image);
//       setLines([{ A: null, B: null }]);
//       setActiveIndex(0);
//       setDrag({ lineIndex: null, point: null });
//     };

//     image.src = url;
//   }

//   // -------- Line actions --------
//   function addNewLine() {
//     setLines((prev) => [...prev, { A: null, B: null }]);
//     setActiveIndex(lines.length);
//   }

//   function resetActiveLine() {
//     setLines((prev) =>
//       prev.map((ln, i) => (i === activeIndex ? { A: null, B: null } : ln)),
//     );
//     setDrag({ lineIndex: null, point: null });
//   }

//   function resetAllLines() {
//     setLines([{ A: null, B: null }]);
//     setActiveIndex(0);
//     setDrag({ lineIndex: null, point: null });
//   }

//   // -------- Click to set points (active line) --------
//   function handleCanvasClick(e) {
//     if (!imgObj) return;
//     if (drag.point) return;

//     let p = canvasToImagePoint(e);
//     p = clampToImage(p);

//     setLines((prev) =>
//       prev.map((ln, i) => {
//         if (i !== activeIndex) return ln;
//         if (!ln.A) return { ...ln, A: p };
//         if (!ln.B) return { ...ln, B: p };
//         return ln; // after A and B exist, do nothing on click (drag to adjust)
//       }),
//     );
//   }

//   // -------- Drag handles (any line) --------
//   function handleMouseDown(e) {
//     if (!imgObj) return;

//     let p = canvasToImagePoint(e);
//     p = clampToImage(p);

//     // prioritize active line first
//     const order = [
//       activeIndex,
//       ...lines.map((_, i) => i).filter((i) => i !== activeIndex),
//     ];

//     for (const i of order) {
//       const ln = lines[i];
//       if (hitTest(p, ln.A)) {
//         setDrag({ lineIndex: i, point: "A" });
//         setActiveIndex(i);
//         return;
//       }
//       if (hitTest(p, ln.B)) {
//         setDrag({ lineIndex: i, point: "B" });
//         setActiveIndex(i);
//         return;
//       }
//     }
//   }

//   function handleMouseMove(e) {
//     if (!imgObj) return;
//     if (!drag.point) return;

//     let p = canvasToImagePoint(e);
//     p = clampToImage(p);

//     setLines((prev) =>
//       prev.map((ln, i) => {
//         if (i !== drag.lineIndex) return ln;
//         if (drag.point === "A") return { ...ln, A: p };
//         return { ...ln, B: p };
//       }),
//     );
//   }

//   function handleMouseUp() {
//     if (!drag.point) return;
//     setDrag({ lineIndex: null, point: null });
//   }

//   // -------- UI values for active line --------
//   const active = lines[activeIndex] || { A: null, B: null };

//   let px = null,
//     cm = null,
//     mm = null,
//     ang = null;

//   if (active.A && active.B) {
//     const dx = active.B.x - active.A.x;
//     const dy = active.B.y - active.A.y;
//     px = Math.sqrt(dx * dx + dy * dy);
//     ang = (Math.atan2(dy, dx) * 180) / Math.PI;

//     if (pxPerCm > 0) {
//       cm = px / pxPerCm;
//       mm = cm * 10;
//     }
//   }

//   return (
//     <main className={styles.main}>
//       <div className={styles.header}>
//         <div>
//           <h1 className={styles.title}>Medna Medical Tools</h1>
//           <p className={styles.subtitle}>
//             Fixed viewport | Premium measurement lines | Multi-line
//           </p>
//         </div>

//         <div className={styles.badge}>
//           Active: <b>Line {activeIndex + 1}</b>
//         </div>
//       </div>

//       <div className={styles.controls}>
//         <input
//           className={styles.upload}
//           type="file"
//           accept="image/*"
//           onChange={handleUpload}
//         />

//         <button
//           className={styles.btnPrimary}
//           onClick={addNewLine}
//           disabled={!imgObj}
//         >
//           + Add Line
//         </button>

//         <button
//           className={styles.btnGhost}
//           onClick={resetActiveLine}
//           disabled={!imgObj}
//         >
//           Reset Active
//         </button>

//         <button
//           className={styles.btnGhost}
//           onClick={resetAllLines}
//           disabled={!imgObj}
//         >
//           Reset All
//         </button>

//         <div className={styles.spacer} />

//         {/* <label className={styles.label}>
//           px / 1 cm
//           <input
//             className={styles.smallInput}
//             type="number"
//             min="1"
//             step="1"
//             value={pxPerCm}
//             onChange={(e) => setPxPerCm(Number(e.target.value))}
//             disabled={!imgObj}
//           />
//         </label> */}

//         <label className={styles.label}>
//           Line
//           <select
//             className={styles.smallInput}
//             value={activeIndex}
//             onChange={(e) => setActiveIndex(Number(e.target.value))}
//             disabled={!imgObj}
//           >
//             {lines.map((_, i) => (
//               <option key={i} value={i}>
//                 Line {i + 1}
//               </option>
//             ))}
//           </select>
//         </label>
//       </div>

//       <div className={styles.canvasShell}>
//         <canvas
//           ref={canvasRef}
//           className={styles.canvas}
//           onClick={handleCanvasClick}
//           onMouseDown={handleMouseDown}
//           onMouseMove={handleMouseMove}
//           onMouseUp={handleMouseUp}
//           onMouseLeave={handleMouseUp}
//         />
//         {!imgObj && (
//           <div className={styles.empty}>
//             Upload an image to start measuring.
//           </div>
//         )}
//       </div>

//       <div className={styles.panel}>
//         <div className={styles.panelRow}>
//           <span className={styles.k}>Point A</span>
//           <span className={styles.v}>
//             {active.A
//               ? `${active.A.x.toFixed(1)}, ${active.A.y.toFixed(1)}`
//               : "Not set"}
//           </span>
//         </div>
//         <div className={styles.panelRow}>
//           <span className={styles.k}>Point B</span>
//           <span className={styles.v}>
//             {active.B
//               ? `${active.B.x.toFixed(1)}, ${active.B.y.toFixed(1)}`
//               : "Not set"}
//           </span>
//         </div>

//         <div className={styles.divider} />

//         <div className={styles.panelGrid}>
//           <div className={styles.card}>
//             <div className={styles.cardLabel}>Distance</div>
//             <div className={styles.cardValue}>
//               {px ? `${px.toFixed(1)} px` : "—"}
//             </div>
//             <div className={styles.cardSub}>
//               {cm !== null
//                 ? `${cm.toFixed(2)} cm / ${mm.toFixed(1)} mm`
//                 : "Set px per cm"}
//             </div>
//           </div>

//           <div className={styles.card}>
//             <div className={styles.cardLabel}>Angle</div>
//             <div className={styles.cardValue}>
//               {ang !== null ? `${ang.toFixed(1)}°` : "—"}
//             </div>
//             <div className={styles.cardSub}>Auto-calculated</div>
//           </div>

//           <div className={styles.card}>
//             <div className={styles.cardLabel}>Editing</div>
//             <div className={styles.cardValue}>Drag handles</div>
//             <div className={styles.cardSub}>Grab endpoints to adjust</div>
//           </div>
//         </div>
//       </div>
//     </main>
//   );
// }
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

const TOOLS = {
  line: "LINE",
  angle: "ANGLE",
  rect: "RECT",
  circle: "CIRCLE",
  pen: "PEN",
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
  const toolButtonClass = (toolValue) =>
    `${styles.btnGhost} ${styles.toolBtn} ${tool === toolValue ? styles.toolBtnActive : ""}`;
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

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Medna Measurement Tool</h1>
          <p className={styles.subtitle}>
            Click tool → draw one → stops • Angle auto-calculates • Other tools
            use manual cm values
          </p>
        </div>

        <div className={styles.badge}>
          Tool: <b>{tool}</b> {armed ? "• Ready" : "• Edit"} • Active{" "}
          {activeTypeName || "None"}
        </div>
      </div>

      <div className={styles.measureBar}>
        <input
          className={styles.upload}
          type="file"
          accept="image/*"
          onChange={(e) => loadFile(e.target.files?.[0])}
        />

        <label className={styles.label}>
          Active {activeTypeName || "Tool"}
          {activeItem?.type === "angle" ? (
            <span className={styles.v}>
              {activeItem.A && activeItem.V && activeItem.B
                ? `${angleDeg(activeItem.A, activeItem.V, activeItem.B).toFixed(1)}°`
                : "—"}
            </span>
          ) : (
            <input
              className={styles.smallInput}
              type="number"
              step="0.1"
              value={activeItem ? activeMeasurementValue : ""}
              placeholder="Select shape"
              onChange={(e) => updateActiveMeasurement(e.target.value)}
              disabled={!imgObj || !activeItem}
            />
          )}
        </label>

        <label className={styles.label}>
          Line
          <input
            className={styles.smallInput}
            type="number"
            step="0.1"
            value={manualCmByTool.line}
            onChange={(e) =>
              setManualCmByTool((prev) => ({
                ...prev,
                line: e.target.value,
              }))
            }
          />
        </label>

        <label className={styles.label}>
          Rect
          <input
            className={styles.smallInput}
            type="number"
            step="0.1"
            value={manualCmByTool.rect}
            onChange={(e) =>
              setManualCmByTool((prev) => ({
                ...prev,
                rect: e.target.value,
              }))
            }
          />
        </label>

        <label className={styles.label}>
          Circle
          <input
            className={styles.smallInput}
            type="number"
            step="0.1"
            value={manualCmByTool.circle}
            onChange={(e) =>
              setManualCmByTool((prev) => ({
                ...prev,
                circle: e.target.value,
              }))
            }
          />
        </label>

        <label className={styles.label}>
          Pen
          <input
            className={styles.smallInput}
            type="number"
            step="0.1"
            value={manualCmByTool.pen}
            onChange={(e) =>
              setManualCmByTool((prev) => ({
                ...prev,
                pen: e.target.value,
              }))
            }
          />
        </label>

        <div className={styles.spacer} />

        <button className={styles.btnGhost} onClick={undo} disabled={!canUndo}>
          Undo
        </button>
        <button className={styles.btnGhost} onClick={redo} disabled={!canRedo}>
          Redo
        </button>

        <label className={styles.label}>
          Cursor
          <input
            className={styles.smallInput}
            type="number"
            min="1"
            max="8"
            step="1"
            value={cursorMarkerSize}
            onChange={(e) => setCursorMarkerSize(Number(e.target.value))}
          />
        </label>

        <button
          className={styles.btnPrimary}
          onClick={resetAll}
          disabled={!imgObj}
        >
          Reset
        </button>
      </div>

      <div
        className={styles.canvasShell}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          loadFile(e.dataTransfer.files?.[0]);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
        }}
        onMouseLeave={() => {
          if (!railPinned) setRailExpanded(false);
        }}
      >
        {!railHidden ? (
          <aside
            className={`${styles.toolRailOverlay} ${railExpanded ? styles.toolRailExpanded : styles.toolRailCollapsed} ${railPinned ? styles.toolRailPinned : ""}`}
          >
            <div className={styles.railHeader}>
              <span className={styles.railTitle}>Tools</span>
              <div className={styles.railActions}>
                <button
                  className={`${styles.railBtn} ${styles.railExpandBtn} ${railExpanded ? styles.railExpandOpen : ""}`}
                  onClick={() => setRailExpanded((v) => !v)}
                  title={railExpanded ? "Collapse" : "Expand"}
                >
                  ➤
                </button>
                <button
                  className={`${styles.railBtn} ${railPinned ? styles.railBtnActive : ""}`}
                  onClick={() => setRailPinned((v) => !v)}
                  title={railPinned ? "Unpin" : "Pin"}
                >
                  📌
                </button>
                <button
                  className={`${styles.railBtn} ${styles.railBtnDanger}`}
                  onClick={() => setRailHidden(true)}
                  title="Hide"
                >
                  ✕
                </button>
              </div>
            </div>

            <button
              className={toolButtonClass(TOOLS.line)}
              onClick={() => armTool(TOOLS.line)}
            >
              <span>📏</span>
              {railExpanded && <span>Line</span>}
            </button>
            <button
              className={toolButtonClass(TOOLS.angle)}
              onClick={() => armTool(TOOLS.angle)}
            >
              <span>📐</span>
              {railExpanded && <span>Angle</span>}
            </button>
            <button
              className={toolButtonClass(TOOLS.circle)}
              onClick={() => armTool(TOOLS.circle)}
            >
              <span>⭕</span>
              {railExpanded && <span>Circle</span>}
            </button>
            <button
              className={toolButtonClass(TOOLS.rect)}
              onClick={() => armTool(TOOLS.rect)}
            >
              <span>⬛</span>
              {railExpanded && <span>Rect</span>}
            </button>
            <button
              className={toolButtonClass(TOOLS.pen)}
              onClick={() => armTool(TOOLS.pen)}
            >
              <span>✏️</span>
              {railExpanded && <span>Draw</span>}
            </button>

            {railExpanded && (
              <>
                <label className={styles.label}>
                  Color
                  <input
                    className={styles.smallInput}
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    disabled={!imgObj}
                  />
                </label>

                {/* <label className={styles.label}>
                  Size
                  <input
                    className={styles.smallInput}
                    type="number"
                    min="1"
                    max="20"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    disabled={!imgObj}
                  />
                </label> */}
              </>
            )}
          </aside>
        ) : (
          <button
            className={styles.railShowBtn}
            onClick={() => setRailHidden(false)}
            title="Show tools"
          >
            Tools
          </button>
        )}

        <canvas
          ref={canvasRef}
          className={styles.canvas}
          style={{ cursor: canvasCursor }}
          onWheel={(e) => {
            if (!imgObj) return;
            e.preventDefault();
            const rect = canvasRef.current.getBoundingClientRect();
            const zoomFactor = Math.exp(-e.deltaY * 0.0018);
            zoomAtPoint(zoomRef.current * zoomFactor, {
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            });
          }}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={(e) => {
            setHoverHandle(null);
            handleMouseUp(e);
          }}
        />
        <div className={styles.zoomColumn}>
          <button
            className={styles.zoomBtn}
            onClick={() => zoomBy(1.1)}
            disabled={!imgObj}
          >
            +
          </button>
          <div className={styles.zoomValue}>{Math.round(zoom * 100)}%</div>
          <button
            className={styles.zoomBtn}
            onClick={() => zoomBy(0.9)}
            disabled={!imgObj}
          >
            -
          </button>
          <button
            className={styles.zoomResetBtn}
            onClick={resetView}
            disabled={!imgObj}
          >
            Reset
          </button>
        </div>
        <div
          ref={trashBinRef}
          className={`${styles.trashBin} ${isDraggingExistingShape ? styles.trashBinActive : ""} ${deleteHot ? styles.trashBinHot : ""}`}
        >
          <span className={styles.trashIcon}>🗑️</span>
          <span className={styles.trashText}>
            {isDraggingExistingShape ? "Drop to Delete" : "Delete"}
          </span>
        </div>

        {isDraggingFile && (
          <div className={styles.dropHint}>Drop image to load</div>
        )}
        {!imgObj && (
          <div className={styles.empty}>
            Upload or drag & drop an image to start.
          </div>
        )}
      </div>

      <div className={styles.panel}>
        <div className={styles.panelRow}>
          <span className={styles.k}>Selected measurement</span>
          <span className={styles.v}>{selectedSummary}</span>
        </div>
      </div>
    </main>
  );
}
