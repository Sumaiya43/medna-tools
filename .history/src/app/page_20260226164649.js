"use client";

import { useRef, useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const canvasRef = useRef(null);

  const [imgObj, setImgObj] = useState(null);
  const [lines, setLines] = useState([{ A: null, B: null }]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [drag, setDrag] = useState({ lineIndex: null, point: null });

  const [pxPerCm, setPxPerCm] = useState(100);

  const DOT = 10;
  const GRAB = 10;

  // ---------- helpers ----------
  function dist(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getPointFromMouse(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function drawDot(ctx, x, y, color) {
    ctx.beginPath();
    ctx.arc(x, y, DOT, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // redraw current image + provided lines
  function redraw(nextLines) {
    if (!imgObj) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    canvas.width = imgObj.width;
    canvas.height = imgObj.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgObj, 0, 0);

    nextLines.forEach((ln, i) => {
      // draw line
      if (ln.A && ln.B) {
        ctx.beginPath();
        ctx.moveTo(ln.A.x, ln.A.y);
        ctx.lineTo(ln.B.x, ln.B.y);
        ctx.lineWidth = 4;
        ctx.strokeStyle = i === activeIndex ? "#FFD166" : "#4D96FF";
        ctx.stroke();

        // draw handles
        drawDot(ctx, ln.A.x, ln.A.y, "#00b16a");
        drawDot(ctx, ln.B.x, ln.B.y, "#ff4d4d");
      }
    });

    // show A dot when only A is set for active line
    const active = nextLines[activeIndex];
    if (active?.A && !active?.B) {
      drawDot(ctx, active.A.x, active.A.y, "#00b16a");
    }
  }

  // small helper: update lines + redraw in one place
  function updateLines(makeNext) {
    setLines((prev) => {
      const next = makeNext(prev);
      redraw(next);
      return next;
    });
  }

  // ---------- upload ----------
  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      setImgObj(img);
      setActiveIndex(0);
      setDrag({ lineIndex: null, point: null });

      const initial = [{ A: null, B: null }];
      setLines(initial);

      // draw once (no need updateLines because imgObj state updates async)
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };

    img.src = url;
  }

  // ---------- buttons ----------
  function addLine() {
    if (!imgObj) return;

    updateLines((prev) => {
      const next = [...prev, { A: null, B: null }];
      setActiveIndex(next.length - 1);
      return next;
    });
  }

  function resetActive() {
    if (!imgObj) return;

    updateLines((prev) =>
      prev.map((ln, i) => (i === activeIndex ? { A: null, B: null } : ln)),
    );
  }

  function resetAll() {
    if (!imgObj) return;

    setActiveIndex(0);
    setDrag({ lineIndex: null, point: null });

    const fresh = [{ A: null, B: null }];
    setLines(fresh);

    // draw fresh
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    canvas.width = imgObj.width;
    canvas.height = imgObj.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgObj, 0, 0);
  }

  // ---------- click to set A then B ----------
  function handleCanvasClick(e) {
    if (!imgObj) return;
    if (drag.point) return;

    const p = getPointFromMouse(e);

    updateLines((prev) =>
      prev.map((ln, i) => {
        if (i !== activeIndex) return ln;
        if (!ln.A) return { ...ln, A: p };
        if (!ln.B) return { ...ln, B: p };
        return ln;
      }),
    );
  }

  // ---------- dragging ----------
  function handleMouseDown(e) {
    if (!imgObj) return;

    const p = getPointFromMouse(e);

    // check active line first, then others
    const order = [
      activeIndex,
      ...lines.map((_, i) => i).filter((i) => i !== activeIndex),
    ];

    for (const i of order) {
      const ln = lines[i];

      if (ln.A && dist(p, ln.A) <= DOT + GRAB) {
        setDrag({ lineIndex: i, point: "A" });
        setActiveIndex(i);
        return;
      }

      if (ln.B && dist(p, ln.B) <= DOT + GRAB) {
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

    updateLines((prev) =>
      prev.map((ln, i) => {
        if (i !== drag.lineIndex) return ln;
        return drag.point === "A" ? { ...ln, A: p } : { ...ln, B: p };
      }),
    );
  }

  function handleMouseUp() {
    if (!drag.point) return;
    setDrag({ lineIndex: null, point: null });
  }

  // ---------- results (info panel only, not on line) ----------
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
              Line stays clean (no text on canvas).
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
