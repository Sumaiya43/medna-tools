"use client";

import { useRef, useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const canvasRef = useRef(null);

  const [imgObj, setImgObj] = useState(null);

  // many lines, each line has A and B
  const [lines, setLines] = useState([{ A: null, B: null }]);
  const [activeIndex, setActiveIndex] = useState(0);

  // dragging info
  const [drag, setDrag] = useState({ lineIndex: null, point: null });

  // simple calibration: pixels per 1 cm (used only in results)
  const [pxPerCm, setPxPerCm] = useState(100);

  const DOT = 10; // dot radius (bigger)
  const GRAB = 10; // extra area to grab

  // --------- Small helper: distance between two points ----------
  function distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // --------- Get click position inside the canvas (fixed mismatch) ----------
  function getPointFromMouse(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // canvas may be scaled by CSS, so we scale the mouse position too
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
  }

  // --------- Draw everything: image + all lines ----------
  function drawAll(image, linesToDraw) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // make canvas same size as image (easy + beginner friendly)
    canvas.width = image.width;
    canvas.height = image.height;

    // draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    // draw each line
    linesToDraw.forEach((ln, i) => {
      if (!ln.A || !ln.B) return;

      // line (simple, clean)
      ctx.beginPath();
      ctx.moveTo(ln.A.x, ln.A.y);
      ctx.lineTo(ln.B.x, ln.B.y);
      ctx.lineWidth = 4;
      ctx.strokeStyle = i === activeIndex ? "#FFD166" : "#4D96FF"; // active line different
      ctx.stroke();

      // dots (handles)
      drawDot(ctx, ln.A.x, ln.A.y, "#00b16a");
      drawDot(ctx, ln.B.x, ln.B.y, "#ff4d4d");
    });

    // if active line has A but no B yet, show A dot so user knows it was set
    const active = linesToDraw[activeIndex];
    if (active?.A && !active?.B) {
      drawDot(ctx, active.A.x, active.A.y, "#00b16a");
    }
  }

  function drawDot(ctx, x, y, color) {
    ctx.beginPath();
    ctx.arc(x, y, DOT, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // --------- Upload image ----------
  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      setImgObj(img);
      const initial = [{ A: null, B: null }];
      setLines(initial);
      setActiveIndex(0);
      setDrag({ lineIndex: null, point: null });
      drawAll(img, initial);
    };

    img.src = url;
  }

  // --------- Add second line (and more) ----------
  function addLine() {
    if (!imgObj) return;

    setLines((prev) => {
      const next = [...prev, { A: null, B: null }];
      setActiveIndex(next.length - 1); // new line becomes active
      drawAll(imgObj, next);
      return next;
    });
  }

  // --------- Reset buttons ----------
  function resetActive() {
    if (!imgObj) return;

    setLines((prev) => {
      const next = prev.map((ln, i) =>
        i === activeIndex ? { A: null, B: null } : ln,
      );
      drawAll(imgObj, next);
      return next;
    });
  }

  function resetAll() {
    if (!imgObj) return;

    const fresh = [{ A: null, B: null }];
    setLines(fresh);
    setActiveIndex(0);
    setDrag({ lineIndex: null, point: null });
    drawAll(imgObj, fresh);
  }

  // --------- Click behavior: set A then B for active line ----------
  function handleCanvasClick(e) {
    if (!imgObj) return;
    if (drag.point) return; // if dragging, ignore click

    const p = getPointFromMouse(e);

    setLines((prev) => {
      const next = prev.map((ln, i) => {
        if (i !== activeIndex) return ln;

        if (!ln.A) return { ...ln, A: p };
        if (!ln.B) return { ...ln, B: p };

        // if A and B already exist, do nothing (use drag to change)
        return ln;
      });

      drawAll(imgObj, next);
      return next;
    });
  }

  // --------- Dragging (hold and move A or B) ----------
  function handleMouseDown(e) {
    if (!imgObj) return;

    const p = getPointFromMouse(e);

    // Check active line first, then other lines
    const order = [
      activeIndex,
      ...lines.map((_, i) => i).filter((i) => i !== activeIndex),
    ];

    for (const i of order) {
      const ln = lines[i];

      if (ln.A && distance(p, ln.A) <= DOT + GRAB) {
        setDrag({ lineIndex: i, point: "A" });
        setActiveIndex(i);
        return;
      }

      if (ln.B && distance(p, ln.B) <= DOT + GRAB) {
        setDrag({ lineIndex: i, point: "B" });
        setActiveIndex(i);
        return;
      }
    }
  }

  function handleMouseMove(e) {
    if (!imgObj) return;
    if (!drag.point) return;

    const p = getPointFromMouse(e);

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

  // --------- Results for active line (shown below, not on canvas) ----------
  const active = lines[activeIndex] || { A: null, B: null };

  let px = null;
  let cm = null;
  let mm = null;
  let ang = null;

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
      <h1 className={styles.title}>Medna Line Tool</h1>

      <div className={styles.controls}>
        <input
          className={styles.upload}
          type="file"
          accept="image/*"
          onChange={handleUpload}
        />

        <button className={styles.btn} onClick={addLine} disabled={!imgObj}>
          + Add Line
        </button>

        <button className={styles.btn} onClick={resetActive} disabled={!imgObj}>
          Reset Active
        </button>

        <button className={styles.btn} onClick={resetAll} disabled={!imgObj}>
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
          Upload an image, then click two points to draw a line.
        </p>
      )}

      <div className={styles.infoBox}>
        <div>
          <b>Active:</b> Line {activeIndex + 1}
        </div>
        <div>
          <b>Point A:</b>{" "}
          {active.A
            ? `${active.A.x.toFixed(1)}, ${active.A.y.toFixed(1)}`
            : "Not set"}
        </div>
        <div>
          <b>Point B:</b>{" "}
          {active.B
            ? `${active.B.x.toFixed(1)}, ${active.B.y.toFixed(1)}`
            : "Not set"}
        </div>

        {active.A && active.B ? (
          <>
            <div>
              <b>Distance:</b> {px.toFixed(2)} px
            </div>
            <div>
              <b>Distance:</b>{" "}
              {cm !== null ? `${cm.toFixed(2)} cm` : "Set px per cm"}
            </div>
            <div>
              <b>Distance:</b>{" "}
              {mm !== null ? `${mm.toFixed(1)} mm` : "Set px per cm"}
            </div>
            <div>
              <b>Angle:</b> {ang.toFixed(2)}°
            </div>
            <div className={styles.tip}>
              No text is drawn on the line (clean view).
            </div>
          </>
        ) : (
          <div className={styles.tip}>
            Click two points for the active line.
          </div>
        )}
      </div>
    </main>
  );
}
