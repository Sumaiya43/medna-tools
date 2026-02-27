"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const canvasRef = useRef(null);

  const [imgObj, setImgObj] = useState(null);

  // Multi-line tool
  const [lines, setLines] = useState([{ A: null, B: null }]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Drag: which line + which point
  const [drag, setDrag] = useState({ lineIndex: null, point: null });

  // Calibration (px per 1 cm)
  const [pxPerCm, setPxPerCm] = useState(100);

  // View transform for "fit image into fixed canvas"
  // scale + offsets tell us how image is drawn inside the canvas
  const viewRef = useRef({ scale: 1, offX: 0, offY: 0, drawW: 0, drawH: 0 });

  const dotSize = 9; // handles (premium)
  const grabPadding = 10; // easy to grab

  // -------- Helpers --------
  function dist(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function hitTest(point, dotCenter) {
    if (!dotCenter) return false;
    return dist(point, dotCenter) <= dotSize + grabPadding;
  }

  function lineColor(i) {
    const colors = ["#3AA0FF", "#22C55E", "#F97316", "#A855F7", "#EF4444"];
    return colors[i % colors.length];
  }

  // Convert mouse position (canvas space) -> image space
  function canvasToImagePoint(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // mouse in CSS pixels
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const { scale, offX, offY } = viewRef.current;

    // image coords = (canvas coords - offset) / scale
    const x = (cx - offX) / scale;
    const y = (cy - offY) / scale;

    return { x, y };
  }

  // Clamp point to image bounds (so user can’t drag outside)
  function clampToImage(p) {
    if (!imgObj) return p;
    return {
      x: Math.max(0, Math.min(imgObj.width, p.x)),
      y: Math.max(0, Math.min(imgObj.height, p.y)),
    };
  }

  // -------- Drawing --------
  function drawAll() {
    const canvas = canvasRef.current;
    if (!canvas || !imgObj) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fixed viewport size based on CSS box
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Make drawing crisp on retina screens
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw using CSS pixel units

    // Background (premium)
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Fit image into canvas (contain)
    const scale = Math.min(
      rect.width / imgObj.width,
      rect.height / imgObj.height,
    );
    const drawW = imgObj.width * scale;
    const drawH = imgObj.height * scale;
    const offX = (rect.width - drawW) / 2;
    const offY = (rect.height - drawH) / 2;

    // Save transform for click mapping
    viewRef.current = { scale, offX, offY, drawW, drawH };

    // Draw image (slightly softened)
    ctx.save();
    ctx.globalAlpha = 0.98;
    ctx.drawImage(imgObj, offX, offY, drawW, drawH);
    ctx.restore();

    // Subtle vignette overlay (premium look)
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

    // Draw all lines (premium)
    lines.forEach((ln, i) => {
      const { A, B } = ln;
      if (!A || !B) return;

      // Convert image coords -> canvas coords for drawing
      const Ax = offX + A.x * scale;
      const Ay = offY + A.y * scale;
      const Bx = offX + B.x * scale;
      const By = offY + B.y * scale;

      const base = lineColor(i);

      // Glow under-line
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(Ax, Ay);
      ctx.lineTo(Bx, By);
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.strokeStyle = base;
      ctx.globalAlpha = 0.18;
      ctx.shadowBlur = 18;
      ctx.shadowColor = base;
      ctx.stroke();
      ctx.restore();

      // Main line with gradient
      ctx.save();
      const grad = ctx.createLinearGradient(Ax, Ay, Bx, By);
      grad.addColorStop(0, "rgba(255,255,255,0.9)");
      grad.addColorStop(0.25, base);
      grad.addColorStop(1, "rgba(255,255,255,0.65)");

      ctx.beginPath();
      ctx.moveTo(Ax, Ay);
      ctx.lineTo(Bx, By);
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.strokeStyle = grad;
      ctx.shadowBlur = 6;
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.stroke();
      ctx.restore();

      // Handles (premium ring)
      drawHandle(ctx, Ax, Ay, i === activeIndex);
      drawHandle(ctx, Bx, By, i === activeIndex);

      // Measurement label bubble (premium)
      const midX = (Ax + Bx) / 2;
      const midY = (Ay + By) / 2;

      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const distancePx = Math.sqrt(dx * dx + dy * dy);
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

      const cm = pxPerCm > 0 ? distancePx / pxPerCm : null;

      const label =
        cm !== null
          ? `L${i + 1} • ${cm.toFixed(2)} cm • ${angleDeg.toFixed(1)}°`
          : `L${i + 1} • ${distancePx.toFixed(0)} px • ${angleDeg.toFixed(1)}°`;

      drawLabel(ctx, midX, midY, label, base);
    });

    // If active line has only A (first click), draw a small crosshair at A
    const active = lines[activeIndex];
    if (active?.A && !active?.B) {
      const Ax = offX + active.A.x * scale;
      const Ay = offY + active.A.y * scale;
      drawCrosshair(ctx, Ax, Ay);
    }
  }

  function drawHandle(ctx, x, y, isActive) {
    ctx.save();

    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, isActive ? 10 : 9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = isActive
      ? "rgba(255,255,255,0.85)"
      : "rgba(255,255,255,0.55)";
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(x, y, isActive ? 4.5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();

    ctx.restore();
  }

  function drawLabel(ctx, x, y, text, accent) {
    ctx.save();
    ctx.font = "12px Inter, Arial";
    ctx.textBaseline = "middle";

    const padX = 10;
    const padY = 8;
    const textW = ctx.measureText(text).width;
    const boxW = textW + padX * 2;
    const boxH = 28;

    const bx = x - boxW / 2;
    const by = y - 34; // above the line

    // Background bubble
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;

    roundRect(ctx, bx, by, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    // Accent bar
    ctx.fillStyle = accent;
    roundRect(ctx, bx + 6, by + 6, 4, boxH - 12, 4);
    ctx.fill();

    // Text
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(text, bx + padX + 6, by + boxH / 2);

    ctx.restore();
  }

  function drawCrosshair(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 12, y);
    ctx.lineTo(x + 12, y);
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x, y + 12);
    ctx.stroke();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  // Redraw whenever lines / activeIndex / image / pxPerCm changes
  useEffect(() => {
    drawAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgObj, lines, activeIndex, pxPerCm]);

  // -------- Upload --------
  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      setImgObj(image);
      setLines([{ A: null, B: null }]);
      setActiveIndex(0);
      setDrag({ lineIndex: null, point: null });
    };

    image.src = url;
  }

  // -------- Line actions --------
  function addNewLine() {
    setLines((prev) => [...prev, { A: null, B: null }]);
    setActiveIndex(lines.length);
  }

  function resetActiveLine() {
    setLines((prev) =>
      prev.map((ln, i) => (i === activeIndex ? { A: null, B: null } : ln)),
    );
    setDrag({ lineIndex: null, point: null });
  }

  function resetAllLines() {
    setLines([{ A: null, B: null }]);
    setActiveIndex(0);
    setDrag({ lineIndex: null, point: null });
  }

  // -------- Click to set points (active line) --------
  function handleCanvasClick(e) {
    if (!imgObj) return;
    if (drag.point) return;

    let p = canvasToImagePoint(e);
    p = clampToImage(p);

    setLines((prev) =>
      prev.map((ln, i) => {
        if (i !== activeIndex) return ln;
        if (!ln.A) return { ...ln, A: p };
        if (!ln.B) return { ...ln, B: p };
        return ln; // after A and B exist, do nothing on click (drag to adjust)
      }),
    );
  }

  // -------- Drag handles (any line) --------
  function handleMouseDown(e) {
    if (!imgObj) return;

    let p = canvasToImagePoint(e);
    p = clampToImage(p);

    // prioritize active line first
    const order = [
      activeIndex,
      ...lines.map((_, i) => i).filter((i) => i !== activeIndex),
    ];

    for (const i of order) {
      const ln = lines[i];
      if (hitTest(p, ln.A)) {
        setDrag({ lineIndex: i, point: "A" });
        setActiveIndex(i);
        return;
      }
      if (hitTest(p, ln.B)) {
        setDrag({ lineIndex: i, point: "B" });
        setActiveIndex(i);
        return;
      }
    }
  }

  function handleMouseMove(e) {
    if (!imgObj) return;
    if (!drag.point) return;

    let p = canvasToImagePoint(e);
    p = clampToImage(p);

    setLines((prev) =>
      prev.map((ln, i) => {
        if (i !== drag.lineIndex) return ln;
        if (drag.point === "A") return { ...ln, A: p };
        return { ...ln, B: p };
      }),
    );
  }

  function handleMouseUp() {
    if (!drag.point) return;
    setDrag({ lineIndex: null, point: null });
  }

  // -------- UI values for active line --------
  const active = lines[activeIndex] || { A: null, B: null };

  let px = null,
    cm = null,
    mm = null,
    ang = null;

  if (active.A && active.B) {
    const dx = active.B.x - active.A.x;
    const dy = active.B.y - active.A.y;
    px = Math.sqrt(dx * dx + dy * dy);
    ang = (Math.atan2(dy, dx) * 180) / Math.PI;

    if (pxPerCm > 0) {
      cm = px / pxPerCm;
      mm = cm * 10;
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Medna Measurement Tool</h1>
          <p className={styles.subtitle}>
            Fixed viewport • Premium measurement lines • Multi-line
          </p>
        </div>

        <div className={styles.badge}>
          Active: <b>Line {activeIndex + 1}</b>
        </div>
      </div>

      <div className={styles.controls}>
        <input
          className={styles.upload}
          type="file"
          accept="image/*"
          onChange={handleUpload}
        />

        <button
          className={styles.btnPrimary}
          onClick={addNewLine}
          disabled={!imgObj}
        >
          + Add Line
        </button>

        <button
          className={styles.btnGhost}
          onClick={resetActiveLine}
          disabled={!imgObj}
        >
          Reset Active
        </button>

        <button
          className={styles.btnGhost}
          onClick={resetAllLines}
          disabled={!imgObj}
        >
          Reset All
        </button>

        <div className={styles.spacer} />

        {/* <label className={styles.label}>
          px / 1 cm
          <input
            className={styles.smallInput}
            type="number"
            min="1"
            step="1"
            value={pxPerCm}
            onChange={(e) => setPxPerCm(Number(e.target.value))}
            disabled={!imgObj}
          />
        </label> */}

        <label className={styles.label}>
          Line
          <select
            className={styles.smallInput}
            value={activeIndex}
            onChange={(e) => setActiveIndex(Number(e.target.value))}
            disabled={!imgObj}
          >
            {lines.map((_, i) => (
              <option key={i} value={i}>
                Line {i + 1}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.canvasShell}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {!imgObj && (
          <div className={styles.empty}>
            Upload an image to start measuring.
          </div>
        )}
      </div>

      <div className={styles.panel}>
        <div className={styles.panelRow}>
          <span className={styles.k}>Point A</span>
          <span className={styles.v}>
            {active.A
              ? `${active.A.x.toFixed(1)}, ${active.A.y.toFixed(1)}`
              : "Not set"}
          </span>
        </div>
        <div className={styles.panelRow}>
          <span className={styles.k}>Point B</span>
          <span className={styles.v}>
            {active.B
              ? `${active.B.x.toFixed(1)}, ${active.B.y.toFixed(1)}`
              : "Not set"}
          </span>
        </div>

        <div className={styles.divider} />

        <div className={styles.panelGrid}>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Distance</div>
            <div className={styles.cardValue}>
              {px ? `${px.toFixed(1)} px` : "—"}
            </div>
            <div className={styles.cardSub}>
              {cm !== null
                ? `${cm.toFixed(2)} cm / ${mm.toFixed(1)} mm`
                : "Set px per cm"}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardLabel}>Angle</div>
            <div className={styles.cardValue}>
              {ang !== null ? `${ang.toFixed(1)}°` : "—"}
            </div>
            <div className={styles.cardSub}>Auto-calculated</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardLabel}>Editing</div>
            <div className={styles.cardValue}>Drag handles</div>
            <div className={styles.cardSub}>Grab endpoints to adjust</div>
          </div>
        </div>
      </div>
    </main>
  );
}
