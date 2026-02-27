"use client";
import style from "/page.module.css";

import { useRef, useState } from "react";

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
    <main className={style.main} style={{ padding: 24, fontFamily: "Arial" }}>
      <h1>Medna Line Tool</h1>

      <input type="file" accept="image/*" onChange={handleUpload} />

      <div
        style={{
          marginTop: 12,
          border: "1px solid #ccc",
          borderRadius: 12,
          overflow: "auto",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: "block", maxWidth: "100%" }}
        />
      </div>

      {!imgObj && (
        <p style={{ marginTop: 12 }}>Upload an image to see it on canvas.</p>
      )}
    </main>
  );
}
