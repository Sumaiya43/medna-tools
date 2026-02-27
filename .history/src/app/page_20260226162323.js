"use client";

import { useRef, useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const canvasRef = useRef(null);

  const [imgObj, setImgObj] = useState(null);

  // Multiple lines: each line = { A: {x,y} | null, B: {x,y} | null }
  const [lines, setLines] = useState([{ A: null, B: null }]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Drag info: which line + which point ("A" or "B")
  const [drag, setDrag] = useState({ lineIndex: null, point: null });

  // Size of dots + easier grabbing
  const dotSize = 12;
  const grabPadding = 6;

  // ✅ Calibration for cm/mm (simple input)
  // Example: if 100 pixels = 1 cm, set pxPerCm = 100
  const [pxPerCm, setPxPerCm] = useState(100);

  // --- Helpers ---
  function getCanvasPoint(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Fix mismatch when canvas is scaled by CSS
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
  }

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
    // simple repeating colors
    const colors = ["#FFD166", "#4D96FF", "#FF6B6B", "#6BCB77", "#9B5DE5"];
    return colors[i % colors.length];
  }

  // Draw everything: image + all lines
  function drawAll(image, linesToDraw) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.width;
    canvas.height = image.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    linesToDraw.forEach((ln, i) => {
      const { A, B } = ln;

      // line
      if (A && B) {
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.lineWidth = 4;
        ctx.strokeStyle = lineColor(i);
        ctx.stroke();
      }

      // dots
      if (A) {
        ctx.beginPath();
        ctx.arc(A.x, A.y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = "#00b16a"; // green
        ctx.fill();
      }
      if (B) {
        ctx.beginPath();
        ctx.arc(B.x, B.y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = "#ff4d4d"; // red
        ctx.fill();
      }

      // active line label
      if (A) {
        ctx.font = "16px Arial";
        ctx.fillStyle = i === activeIndex ? "#111" : "#555";
        ctx.fillText(`L${i + 1}`, A.x + 14, A.y - 14);
      }
    });
  }

  // --- Upload ---
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
      drawAll(image, [{ A: null, B: null }]);
    };

    image.src = url;
  }

  // --- Line actions ---
  function addNewLine() {
    setLines((prev) => {
      const next = [...prev, { A: null, B: null }];
      return next;
    });
    setActiveIndex(lines.length); // new line becomes active
    if (imgObj) drawAll(imgObj, [...lines, { A: null, B: null }]);
  }

  function resetActiveLine() {
    if (!imgObj) return;

    setLines((prev) => {
      const next = prev.map((ln, i) =>
        i === activeIndex ? { A: null, B: null } : ln,
      );
      drawAll(imgObj, next);
      return next;
    });

    setDrag({ lineIndex: null, point: null });
  }

  function resetAllLines() {
    if (!imgObj) return;

    const fresh = [{ A: null, B: null }];
    setLines(fresh);
    setActiveIndex(0);
    setDrag({ lineIndex: null, point: null });
    drawAll(imgObj, fresh);
  }

  // --- Clicking to set points on active line ---
  function handleCanvasClick(e) {
    if (!imgObj) return;
    if (drag.point) return; // ignore click if dragging

    const p = getCanvasPoint(e);

    setLines((prev) => {
      const next = prev.map((ln, i) => {
        if (i !== activeIndex) return ln;

        // First click sets A, second click sets B
        if (!ln.A) return { ...ln, A: p };
        if (!ln.B) return { ...ln, B: p };

        // If both set, do nothing on click (you will drag to adjust)
        return ln;
      });

      drawAll(imgObj, next);
      return next;
    });
  }

  // --- Dragging: detect which dot was grabbed (any line) ---
  function handleMouseDown(e) {
    if (!imgObj) return;

    const p = getCanvasPoint(e);

    // Check active line first (feels nicer), then others
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

    const p = getCanvasPoint(e);

    setLines((prev) => {
      const next = prev.map((ln, i) => {
        if (i !== drag.lineIndex) return ln;
        if (drag.point === "A") return { ...ln, A: p };
        return { ...ln, B: p };
      });

      drawAll(imgObj, next);
      return next;
    });
  }

  function handleMouseUp() {
    if (!drag.point) return;
    setDrag({ lineIndex: null, point: null });
  }

  // --- Measurements for active line ---
  const activeLine = lines[activeIndex] || { A: null, B: null };
  const A = activeLine.A;
  const B = activeLine.B;

  let distancePx = null;
  let distanceCm = null;
  let distanceMm = null;
  let angleDeg = null;

  if (A && B) {
    const dx = B.x - A.x;
    const dy = B.y - A.y;

    distancePx = Math.sqrt(dx * dx + dy * dy);
    angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Convert px -> cm -> mm
    // cm = pixels / pxPerCm
    // mm = cm * 10
    if (pxPerCm > 0) {
      distanceCm = distancePx / pxPerCm;
      distanceMm = distanceCm * 10;
    }
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Medna Line Tools (Multi-Line)</h1>

      <div className={styles.controls}>
        <input
          className={styles.upload}
          type="file"
          accept="image/*"
          onChange={handleUpload}
        />

        <button className={styles.btn} onClick={addNewLine} disabled={!imgObj}>
          + Add Line
        </button>

        <button
          className={styles.btn}
          onClick={resetActiveLine}
          disabled={!imgObj}
        >
          Reset Active
        </button>

        <button
          className={styles.btn}
          onClick={resetAllLines}
          disabled={!imgObj}
        >
          Reset All
        </button>

        <label className={styles.label}>
          px per 1 cm
          <input
            className={styles.smallInput}
            type="number"
            min="1"
            step="1"
            value={pxPerCm}
            onChange={(e) => setPxPerCm(Number(e.target.value))}
            disabled={!imgObj}
          />
        </label>

        <label className={styles.label}>
          Active line
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

      <div className={styles.canvasBox}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {!imgObj && (
        <p className={styles.note}>
          Upload an image → Click 2 points for the active line → Add Line for a
          second line → Drag dots to adjust.
        </p>
      )}

      <div className={styles.infoBox}>
        <div>
          <b>Active:</b> Line {activeIndex + 1} (color changes per line)
        </div>
        <div>
          <b>Point A:</b>{" "}
          {A ? `${A.x.toFixed(1)}, ${A.y.toFixed(1)}` : "Not set"}
        </div>
        <div>
          <b>Point B:</b>{" "}
          {B ? `${B.x.toFixed(1)}, ${B.y.toFixed(1)}` : "Not set"}
        </div>

        {A && B ? (
          <>
            <div>
              <b>Distance:</b> {distancePx.toFixed(2)} px
            </div>
            <div>
              <b>Distance:</b>{" "}
              {distanceCm !== null
                ? `${distanceCm.toFixed(2)} cm`
                : "Set px per cm"}
            </div>
            <div>
              <b>Distance:</b>{" "}
              {distanceMm !== null
                ? `${distanceMm.toFixed(1)} mm`
                : "Set px per cm"}
            </div>
            <div>
              <b>Angle:</b> {angleDeg.toFixed(2)}°
            </div>
            <div className={styles.tip}>
              Tip: You can drag green/red dots on ANY line to move it.
            </div>
          </>
        ) : (
          <div className={styles.tip}>
            Click two points to see distance, cm/mm, and angle.
          </div>
        )}
      </div>
    </main>
  );
}
