"use client";

import { useRef, useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const canvasRef = useRef(null);

  const [imgObj, setImgObj] = useState(null);
  const [A, setA] = useState(null);
  const [B, setB] = useState(null);

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

    const dotSize = 12; // ✅ Bigger dots

    // Draw A dot (green)
    if (a) {
      ctx.beginPath();
      ctx.arc(a.x, a.y, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = "#00b16a";
      ctx.fill();
    }

    // Draw B dot (red)
    if (b) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = "#ff4d4d";
      ctx.fill();
    }

    // Draw line A->B (gold)
    if (a && b) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#FFD166";
      ctx.stroke();
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
      draw(image, null, null);
    };
    image.src = url;
  }

  // ✅ No reset on 3rd click:
  // - click 1 sets A
  // - click 2 sets B
  // - after that, each click moves B (adjust end point)
  function handleCanvasClick(e) {
    if (!imgObj) return;

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

    // move B (do NOT reset)
    setB(p);
    draw(imgObj, A, p);
  }

  function clearAll() {
    if (!imgObj) return;
    setA(null);
    setB(null);
    draw(imgObj, null, null);
  }

  // calculations
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
      <h1 className={styles.title}>Medna Line Tool (Prototype)</h1>

      <div className={styles.controls}>
        <input
          className={styles.upload}
          type="file"
          accept="image/*"
          onChange={handleUpload}
        />

        <button className={styles.btn} onClick={clearAll} disabled={!imgObj}>
          Clear
        </button>
      </div>

      <div className={styles.canvasBox}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onClick={handleCanvasClick}
        />
      </div>

      {!imgObj && (
        <p className={styles.note}>
          Upload an image, click once for A (green), click again for B (red).
          Then keep clicking to move B.
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
