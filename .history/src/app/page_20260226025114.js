"use client";

import { useRef, useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const canvasRef = useRef(null);
  const [imgObj, setImgObj] = useState(null);

  function drawImageOnCanvas(image) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Make canvas same size as image
    canvas.width = image.width;
    canvas.height = image.height;

    // Clear old drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(image, 0, 0);
  }

  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    const image = new Image();
    image.onload = () => {
      setImgObj(image);
      drawImageOnCanvas(image);
    };
    image.src = url;
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Medna Line Tool</h1>

      <input
        className={styles.upload}
        type="file"
        accept="image/*"
        onChange={handleUpload}
      />

      <div className={styles.canvasBox}>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>

      {!imgObj && (
        <p className={styles.note}>Upload an image to see it on canvas.</p>
      )}
    </main>
  );
}
