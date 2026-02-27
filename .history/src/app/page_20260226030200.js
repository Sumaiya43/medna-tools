"use client";

import { useRef, useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const canvasRef = useRef(null);

  const [imgObj, setImgObj] = useState(null);
  const [A, setA] = useState(null);
  const [B, setB] = useState(null);

  const [dragTarget, setDragTarget] = useState(null); // "A" | "B" | null

  const dotSize = 12; // bigger dot (easy to grab)
  const grabPadding = 6; // extra grab area

  // ✅ Fix click mismatch when canvas is scaled by CSS
  function getCanvasPoint(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
  }

  // distance between two points
  function dist(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // check if user clicked close to a dot
  function hitTest(point, dotCenter) {
    if (!dotCenter) return false;
    return dist(point, dotCenter) <= dotSize + grabPadding;
  }

  // ✅ Draw image + dots + line
  function draw(image, a, b) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.width;
    canvas.height = image.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    // Draw line first (optional)
    if (a && b) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#FFD166";
      ctx.stroke();
    }

    // Draw A dot
    if (a) {
      ctx.beginPath();
      ctx.arc(a.x, a.y, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = "#00b16a";
      ctx.fill();
    }

    // Draw B dot
    if (b) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = "#ff4d4d";
      ctx.fill();
    }
  }

  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    const image = new Image();
    image.onload = () => {
      setImgObj(image);
      setA(null);
      setB(null);
      setDragTarget(null);
      draw(image, null, null);
    };
    image.src = url;
  }

  // ✅ Reset button: clear line + points (keep image)
  function resetLine() {
    if (!imgObj) return;
    setA(null);
    setB(null);
    setDragTarget(null);
    draw(imgObj, null, null);
  }

  // ✅ Click sets points if not set yet
  function handleCanvasClick(e) {
    if (!imgObj) return;

    // If user is dragging, ignore click event
    if (dragTarget) return;

    const p = getCanvasPoint(e);

    if (!A) {
      setA(p);
      draw(imgObj, p, null);
      return;
    }

    if (!B) {
      setB(p);
      draw(imgObj, A, p);
      return;
    }

    // If both already exist, do nothing on normal click
    // (because now we want "hold & move" instead)
  }

  // ✅ Start drag when mouse down near A or B
  function handleMouseDown(e) {
    if (!imgObj) return;
    if (!A && !B) return;

    const p = getCanvasPoint(e);

    if (hitTest(p, A)) {
      setDragTarget("A");
      return;
    }
    if (hitTest(p, B)) {
      setDragTarget("B");
      return;
    }
  }

  // ✅ While dragging, update the selected point
  function handleMouseMove(e) {
    if (!imgObj) return;
    if (!dragTarget) return;

    const p = getCanvasPoint(e);

    if (dragTarget === "A") {
      setA(p);
      draw(imgObj, p, B);
    }

    if (dragTarget === "B") {
      setB(p);
      draw(imgObj, A, p);
    }
  }

  // ✅ Stop drag
  function handleMouseUp() {
    if (!dragTarget) return;
    setDragTarget(null);
  }

  // Calculations
  let distancePx = null;
  let angleDeg = null;

  if (A && B) {
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    distancePx = Math.sqrt(dx * dx + dy * dy);
    angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Medna Line Tool (Drag to Move)</h1>

      <div className={styles.controls}>
        <input
          className={styles.upload}
          type="file"
          accept="image/*"
          onChange={handleUpload}
        />

        <button className={styles.btn} onClick={resetLine} disabled={!imgObj}>
          Reset
        </button>
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
          Upload an image. Click 2 points to create a line. Then hold and drag
          the dots to move.
        </p>
      )}

      <div className={styles.infoBox}>
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
              <b>Angle:</b> {angleDeg.toFixed(2)}°
            </div>
            <div className={styles.tip}>
              Tip: hold the green/red dot and drag to adjust.
            </div>
          </>
        ) : (
          <div className={styles.tip}>
            Click two points to see distance and angle.
          </div>
        )}
      </div>
    </main>
  );
}
