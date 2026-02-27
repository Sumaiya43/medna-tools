"use client";

import { useRef, useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const canvasRef = useRef(null);

  const [imgObj, setImgObj] = useState(null);
  const [A, setA] = useState(null); // first click point
  const [B, setB] = useState(null); // second click point

  // Draw image + (optional) line
  function draw(image, a, b) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas same size as image
    canvas.width = image.width;
    canvas.height = image.height;

    // Draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    // Draw ONLY the line (no circles)
    if (a && b) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#FFD166"; // yellow/gold
      ctx.stroke();
    }
  }

  // Upload image
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

  // Click on canvas: 1st click = A, 2nd click = B, 3rd click starts again
  function handleCanvasClick(e) {
    if (!imgObj) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const p = { x, y };

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

    // start new measurement
    setA(p);
    setB(null);
    draw(imgObj, p, null);
  }

  // Calculations (only when A and B exist)
  let distancePx = null;
  let angleDeg = null;

  if (A && B) {
    const dx = B.x - A.x;
    const dy = B.y - A.y;

    distancePx = Math.sqrt(dx * dx + dy * dy);

    // angle in degrees
    angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  function clearPoints() {
    if (!imgObj) return;
    setA(null);
    setB(null);
    draw(imgObj, null, null);
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

        <button className={styles.btn} onClick={clearPoints} disabled={!imgObj}>
          Clear line
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
          Upload an image, then click 2 points to draw a line.
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
              Tip: click again to start a new line.
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
