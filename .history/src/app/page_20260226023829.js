"use client";

import { useRef, useState } from "react";

export default function Home() {
  const canvasRef = useRef(null);
  const [imgObj, setImgObj] = useState(null);

  function drawImageOnCanvas(image) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.width;
    canvas.height = image.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    <main className="page">
      <h1 className="title">Medna Line Tool</h1>

      <input
        className="upload"
        type="file"
        accept="image/*"
        onChange={handleUpload}
      />

      <div className="canvasBox">
        <canvas ref={canvasRef} className="canvas" />
      </div>

      {!imgObj && <p className="note">Upload an image to see it on canvas.</p>}
    </main>
  );
}
