// "use client";

// import { useEffect, useRef, useState } from "react";
// import styles from "./page.module.css";

// export default function Home() {
//   const canvasRef = useRef(null);

//   const [imgObj, setImgObj] = useState(null);

//   // Multi-line tool
//   const [lines, setLines] = useState([{ A: null, B: null }]);
//   const [activeIndex, setActiveIndex] = useState(0);

//   // Drag: which line + which point
//   const [drag, setDrag] = useState({ lineIndex: null, point: null });

//   // Calibration (px per 1 cm)
//   const [pxPerCm, setPxPerCm] = useState(100);

//   // View transform for "fit image into fixed canvas"
//   // scale + offsets tell us how image is drawn inside the canvas
//   const viewRef = useRef({ scale: 1, offX: 0, offY: 0, drawW: 0, drawH: 0 });

//   const dotSize = 9; // handles
//   const grabPadding = 10; // easy to grab

//   // -------- Helpers --------
//   function dist(p1, p2) {
//     const dx = p1.x - p2.x;
//     const dy = p1.y - p2.y;
//     return Math.sqrt(dx * dx + dy * dy);
//   }

//   function hitTest(point, dotCenter) {
//     if (!dotCenter) return false;
//     return dist(point, dotCenter) <= dotSize + grabPadding;
//   }

//   function lineColor(i) {
//     const colors = ["#3AA0FF", "#22C55E", "#F97316", "#A855F7", "#EF4444"];
//     return colors[i % colors.length];
//   }

//   // Convert mouse position (canvas space) -> image space
//   function canvasToImagePoint(e) {
//     const canvas = canvasRef.current;
//     const rect = canvas.getBoundingClientRect();

//     // mouse in CSS pixels
//     const cx = e.clientX - rect.left;
//     const cy = e.clientY - rect.top;

//     const { scale, offX, offY } = viewRef.current;

//     // image coords = (canvas coords - offset) / scale
//     const x = (cx - offX) / scale;
//     const y = (cy - offY) / scale;

//     return { x, y };
//   }

//   // Clamp point to image bounds (so user can’t drag outside)
//   function clampToImage(p) {
//     if (!imgObj) return p;
//     return {
//       x: Math.max(0, Math.min(imgObj.width, p.x)),
//       y: Math.max(0, Math.min(imgObj.height, p.y)),
//     };
//   }

//   // -------- Drawing --------
//   function drawAll() {
//     const canvas = canvasRef.current;
//     if (!canvas || !imgObj) return;

//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     // Fixed viewport size based on CSS box
//     const rect = canvas.getBoundingClientRect();
//     const dpr = window.devicePixelRatio || 1;

//     // Make drawing crisp on retina screens
//     canvas.width = Math.round(rect.width * dpr);
//     canvas.height = Math.round(rect.height * dpr);
//     ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw using CSS pixel units

//     // Background (premium)
//     ctx.clearRect(0, 0, rect.width, rect.height);
//     ctx.fillStyle = "#0b1220";
//     ctx.fillRect(0, 0, rect.width, rect.height);

//     // Fit image into canvas (contain)
//     const scale = Math.min(
//       rect.width / imgObj.width,
//       rect.height / imgObj.height,
//     );
//     const drawW = imgObj.width * scale;
//     const drawH = imgObj.height * scale;
//     const offX = (rect.width - drawW) / 2;
//     const offY = (rect.height - drawH) / 2;

//     // Save transform for click mapping
//     viewRef.current = { scale, offX, offY, drawW, drawH };

//     // Draw image (slightly softened)
//     ctx.save();
//     ctx.globalAlpha = 0.98;
//     ctx.drawImage(imgObj, offX, offY, drawW, drawH);
//     ctx.restore();

//     // Subtle vignette overlay (premium look)
//     ctx.save();
//     const g = ctx.createRadialGradient(
//       rect.width / 2,
//       rect.height / 2,
//       Math.min(rect.width, rect.height) * 0.2,
//       rect.width / 2,
//       rect.height / 2,
//       Math.min(rect.width, rect.height) * 0.75,
//     );
//     g.addColorStop(0, "rgba(0,0,0,0)");
//     g.addColorStop(1, "rgba(0,0,0,0.35)");
//     ctx.fillStyle = g;
//     ctx.fillRect(0, 0, rect.width, rect.height);
//     ctx.restore();

//     // Draw all lines (premium)
//     lines.forEach((ln, i) => {
//       const { A, B } = ln;
//       if (!A || !B) return;

//       // Convert image coords -> canvas coords for drawing
//       const Ax = offX + A.x * scale;
//       const Ay = offY + A.y * scale;
//       const Bx = offX + B.x * scale;
//       const By = offY + B.y * scale;

//       const base = lineColor(i);

//       // Glow under-line
//       ctx.save();
//       ctx.beginPath();
//       ctx.moveTo(Ax, Ay);
//       ctx.lineTo(Bx, By);
//       ctx.lineWidth = 8;
//       ctx.lineCap = "round";
//       ctx.strokeStyle = base;
//       ctx.globalAlpha = 0.18;
//       ctx.shadowBlur = 18;
//       ctx.shadowColor = base;
//       ctx.stroke();
//       ctx.restore();

//       // Main line with gradient
//       ctx.save();
//       const grad = ctx.createLinearGradient(Ax, Ay, Bx, By);
//       grad.addColorStop(0, "rgba(255,255,255,0.9)");
//       grad.addColorStop(0.25, base);
//       grad.addColorStop(1, "rgba(255,255,255,0.65)");

//       ctx.beginPath();
//       ctx.moveTo(Ax, Ay);
//       ctx.lineTo(Bx, By);
//       ctx.lineWidth = 4;
//       ctx.lineCap = "round";
//       ctx.strokeStyle = grad;
//       ctx.shadowBlur = 6;
//       ctx.shadowColor = "rgba(0,0,0,0.35)";
//       ctx.stroke();
//       ctx.restore();

//       // Handles (premium ring)
//       drawHandle(ctx, Ax, Ay, i === activeIndex);
//       drawHandle(ctx, Bx, By, i === activeIndex);

//       // Measurement label bubble (premium)
//       const midX = (Ax + Bx) / 2;
//       const midY = (Ay + By) / 2;

//       const dx = B.x - A.x;
//       const dy = B.y - A.y;
//       const distancePx = Math.sqrt(dx * dx + dy * dy);
//       const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

//       const cm = pxPerCm > 0 ? distancePx / pxPerCm : null;
//     });

//     // If active line has only A (first click), draw a small crosshair at A
//     const active = lines[activeIndex];
//     if (active?.A && !active?.B) {
//       const Ax = offX + active.A.x * scale;
//       const Ay = offY + active.A.y * scale;
//       drawCrosshair(ctx, Ax, Ay);
//     }
//   }

//   function drawHandle(ctx, x, y, isActive) {
//     ctx.save();

//     // Outer ring
//     ctx.beginPath();
//     ctx.arc(x, y, isActive ? 10 : 9, 0, Math.PI * 2);
//     ctx.fillStyle = "rgba(255,255,255,0.10)";
//     ctx.fill();

//     ctx.lineWidth = 2;
//     ctx.strokeStyle = isActive
//       ? "rgba(255,255,255,0.85)"
//       : "rgba(255,255,255,0.55)";
//     ctx.stroke();

//     // Inner dot
//     ctx.beginPath();
//     ctx.arc(x, y, isActive ? 4.5 : 4, 0, Math.PI * 2);
//     ctx.fillStyle = "rgba(255,255,255,0.9)";
//     ctx.fill();

//     ctx.restore();
//   }

//   function drawLabel(ctx, x, y, text, accent) {
//     ctx.save();
//     ctx.font = "12px Inter, Arial";
//     ctx.textBaseline = "middle";

//     const padX = 10;
//     const padY = 8;
//     const textW = ctx.measureText(text).width;
//     const boxW = textW + padX * 2;
//     const boxH = 28;

//     const bx = x - boxW / 2;
//     const by = y - 34; // above the line

//     // Background bubble
//     ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
//     ctx.strokeStyle = "rgba(255,255,255,0.18)";
//     ctx.lineWidth = 1;

//     roundRect(ctx, bx, by, boxW, boxH, 10);
//     ctx.fill();
//     ctx.stroke();

//     // Accent bar
//     ctx.fillStyle = accent;
//     roundRect(ctx, bx + 6, by + 6, 4, boxH - 12, 4);
//     ctx.fill();

//     // Text
//     ctx.fillStyle = "rgba(255,255,255,0.92)";
//     ctx.fillText(text, bx + padX + 6, by + boxH / 2);

//     ctx.restore();
//   }

//   function drawCrosshair(ctx, x, y) {
//     ctx.save();
//     ctx.strokeStyle = "rgba(255,255,255,0.6)";
//     ctx.lineWidth = 1;
//     ctx.beginPath();
//     ctx.moveTo(x - 12, y);
//     ctx.lineTo(x + 12, y);
//     ctx.moveTo(x, y - 12);
//     ctx.lineTo(x, y + 12);
//     ctx.stroke();
//     ctx.restore();
//   }

//   function roundRect(ctx, x, y, w, h, r) {
//     const rr = Math.min(r, w / 2, h / 2);
//     ctx.beginPath();
//     ctx.moveTo(x + rr, y);
//     ctx.arcTo(x + w, y, x + w, y + h, rr);
//     ctx.arcTo(x + w, y + h, x, y + h, rr);
//     ctx.arcTo(x, y + h, x, y, rr);
//     ctx.arcTo(x, y, x + w, y, rr);
//     ctx.closePath();
//   }

//   // Redraw whenever lines / activeIndex / image / pxPerCm changes
//   useEffect(() => {
//     drawAll();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [imgObj, lines, activeIndex, pxPerCm]);

//   // -------- Upload --------
//   function handleUpload(e) {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     const url = URL.createObjectURL(file);
//     const image = new Image();

//     image.onload = () => {
//       setImgObj(image);
//       setLines([{ A: null, B: null }]);
//       setActiveIndex(0);
//       setDrag({ lineIndex: null, point: null });
//     };

//     image.src = url;
//   }

//   // -------- Line actions --------
//   function addNewLine() {
//     setLines((prev) => [...prev, { A: null, B: null }]);
//     setActiveIndex(lines.length);
//   }

//   function resetActiveLine() {
//     setLines((prev) =>
//       prev.map((ln, i) => (i === activeIndex ? { A: null, B: null } : ln)),
//     );
//     setDrag({ lineIndex: null, point: null });
//   }

//   function resetAllLines() {
//     setLines([{ A: null, B: null }]);
//     setActiveIndex(0);
//     setDrag({ lineIndex: null, point: null });
//   }

//   // -------- Click to set points (active line) --------
//   function handleCanvasClick(e) {
//     if (!imgObj) return;
//     if (drag.point) return;

//     let p = canvasToImagePoint(e);
//     p = clampToImage(p);

//     setLines((prev) =>
//       prev.map((ln, i) => {
//         if (i !== activeIndex) return ln;
//         if (!ln.A) return { ...ln, A: p };
//         if (!ln.B) return { ...ln, B: p };
//         return ln; // after A and B exist, do nothing on click (drag to adjust)
//       }),
//     );
//   }

//   // -------- Drag handles (any line) --------
//   function handleMouseDown(e) {
//     if (!imgObj) return;

//     let p = canvasToImagePoint(e);
//     p = clampToImage(p);

//     // prioritize active line first
//     const order = [
//       activeIndex,
//       ...lines.map((_, i) => i).filter((i) => i !== activeIndex),
//     ];

//     for (const i of order) {
//       const ln = lines[i];
//       if (hitTest(p, ln.A)) {
//         setDrag({ lineIndex: i, point: "A" });
//         setActiveIndex(i);
//         return;
//       }
//       if (hitTest(p, ln.B)) {
//         setDrag({ lineIndex: i, point: "B" });
//         setActiveIndex(i);
//         return;
//       }
//     }
//   }

//   function handleMouseMove(e) {
//     if (!imgObj) return;
//     if (!drag.point) return;

//     let p = canvasToImagePoint(e);
//     p = clampToImage(p);

//     setLines((prev) =>
//       prev.map((ln, i) => {
//         if (i !== drag.lineIndex) return ln;
//         if (drag.point === "A") return { ...ln, A: p };
//         return { ...ln, B: p };
//       }),
//     );
//   }

//   function handleMouseUp() {
//     if (!drag.point) return;
//     setDrag({ lineIndex: null, point: null });
//   }

//   // -------- UI values for active line --------
//   const active = lines[activeIndex] || { A: null, B: null };

//   let px = null,
//     cm = null,
//     mm = null,
//     ang = null;

//   if (active.A && active.B) {
//     const dx = active.B.x - active.A.x;
//     const dy = active.B.y - active.A.y;
//     px = Math.sqrt(dx * dx + dy * dy);
//     ang = (Math.atan2(dy, dx) * 180) / Math.PI;

//     if (pxPerCm > 0) {
//       cm = px / pxPerCm;
//       mm = cm * 10;
//     }
//   }

//   return (
//     <main className={styles.main}>
//       <div className={styles.header}>
//         <div>
//           <h1 className={styles.title}>Medna Medical Tools</h1>
//           <p className={styles.subtitle}>
//             Fixed viewport | Premium measurement lines | Multi-line
//           </p>
//         </div>

//         <div className={styles.badge}>
//           Active: <b>Line {activeIndex + 1}</b>
//         </div>
//       </div>

//       <div className={styles.controls}>
//         <input
//           className={styles.upload}
//           type="file"
//           accept="image/*"
//           onChange={handleUpload}
//         />

//         <button
//           className={styles.btnPrimary}
//           onClick={addNewLine}
//           disabled={!imgObj}
//         >
//           + Add Line
//         </button>

//         <button
//           className={styles.btnGhost}
//           onClick={resetActiveLine}
//           disabled={!imgObj}
//         >
//           Reset Active
//         </button>

//         <button
//           className={styles.btnGhost}
//           onClick={resetAllLines}
//           disabled={!imgObj}
//         >
//           Reset All
//         </button>

//         <div className={styles.spacer} />

//         {/* <label className={styles.label}>
//           px / 1 cm
//           <input
//             className={styles.smallInput}
//             type="number"
//             min="1"
//             step="1"
//             value={pxPerCm}
//             onChange={(e) => setPxPerCm(Number(e.target.value))}
//             disabled={!imgObj}
//           />
//         </label> */}

//         <label className={styles.label}>
//           Line
//           <select
//             className={styles.smallInput}
//             value={activeIndex}
//             onChange={(e) => setActiveIndex(Number(e.target.value))}
//             disabled={!imgObj}
//           >
//             {lines.map((_, i) => (
//               <option key={i} value={i}>
//                 Line {i + 1}
//               </option>
//             ))}
//           </select>
//         </label>
//       </div>

//       <div className={styles.canvasShell}>
//         <canvas
//           ref={canvasRef}
//           className={styles.canvas}
//           onClick={handleCanvasClick}
//           onMouseDown={handleMouseDown}
//           onMouseMove={handleMouseMove}
//           onMouseUp={handleMouseUp}
//           onMouseLeave={handleMouseUp}
//         />
//         {!imgObj && (
//           <div className={styles.empty}>
//             Upload an image to start measuring.
//           </div>
//         )}
//       </div>

//       <div className={styles.panel}>
//         <div className={styles.panelRow}>
//           <span className={styles.k}>Point A</span>
//           <span className={styles.v}>
//             {active.A
//               ? `${active.A.x.toFixed(1)}, ${active.A.y.toFixed(1)}`
//               : "Not set"}
//           </span>
//         </div>
//         <div className={styles.panelRow}>
//           <span className={styles.k}>Point B</span>
//           <span className={styles.v}>
//             {active.B
//               ? `${active.B.x.toFixed(1)}, ${active.B.y.toFixed(1)}`
//               : "Not set"}
//           </span>
//         </div>

//         <div className={styles.divider} />

//         <div className={styles.panelGrid}>
//           <div className={styles.card}>
//             <div className={styles.cardLabel}>Distance</div>
//             <div className={styles.cardValue}>
//               {px ? `${px.toFixed(1)} px` : "—"}
//             </div>
//             <div className={styles.cardSub}>
//               {cm !== null
//                 ? `${cm.toFixed(2)} cm / ${mm.toFixed(1)} mm`
//                 : "Set px per cm"}
//             </div>
//           </div>

//           <div className={styles.card}>
//             <div className={styles.cardLabel}>Angle</div>
//             <div className={styles.cardValue}>
//               {ang !== null ? `${ang.toFixed(1)}°` : "—"}
//             </div>
//             <div className={styles.cardSub}>Auto-calculated</div>
//           </div>

//           <div className={styles.card}>
//             <div className={styles.cardLabel}>Editing</div>
//             <div className={styles.cardValue}>Drag handles</div>
//             <div className={styles.cardSub}>Grab endpoints to adjust</div>
//           </div>
//         </div>
//       </div>
//     </main>
//   );
// }
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

const TOOLS = {
  line: "LINE",
  angle: "ANGLE",
  rect: "RECT",
  circle: "CIRCLE",
  pen: "PEN",
};

export default function Home() {
  const canvasRef = useRef(null);

  // how image is drawn in the canvas (scale + offsets)
  const viewRef = useRef({ scale: 1, offX: 0, offY: 0, drawW: 0, drawH: 0 });

  const [imgObj, setImgObj] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // tool + style
  const [tool, setTool] = useState(TOOLS.line);
  const [strokeColor, setStrokeColor] = useState("#2BFF5A");
  const [lineWidth, setLineWidth] = useState(4);

  // label (measurement digit)
  const [showLabel, setShowLabel] = useState(true);
  const [labelPos, setLabelPos] = useState("above"); // above | middle | end

  // saved drawings
  const [items, setItems] = useState([]);

  // in-progress drawing
  const [draft, setDraft] = useState(null);

  // drag state (for editing and drawing)
  // type:
  //  "NONE"
  //  "HANDLE"  -> dragging a point like A/B/V
  //  "MOVE"    -> moving whole shape
  //  "DRAW"    -> drawing rect/circle/pen
  const [drag, setDrag] = useState({ type: "NONE" });

  // optional: panel summary
  const [pxPerCm] = useState(100);

  // ---------------- BASIC MATH ----------------
  function dist(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function clampToImage(p) {
    if (!imgObj) return p;
    return {
      x: Math.max(0, Math.min(imgObj.width, p.x)),
      y: Math.max(0, Math.min(imgObj.height, p.y)),
    };
  }

  // distance from point P to line segment AB (for selecting line body)
  function pointToSegmentDistance(P, A, B) {
    const ABx = B.x - A.x;
    const ABy = B.y - A.y;
    const APx = P.x - A.x;
    const APy = P.y - A.y;

    const ab2 = ABx * ABx + ABy * ABy;
    if (ab2 === 0) return dist(P, A);

    // t = projection factor along AB
    let t = (APx * ABx + APy * ABy) / ab2;
    t = Math.max(0, Math.min(1, t));

    const closest = { x: A.x + ABx * t, y: A.y + ABy * t };
    return dist(P, closest);
  }

  function angleDeg(A, V, B) {
    const v1 = { x: A.x - V.x, y: A.y - V.y };
    const v2 = { x: B.x - V.x, y: B.y - V.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const m1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const m2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (m1 === 0 || m2 === 0) return 0;

    const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
    return (Math.acos(cos) * 180) / Math.PI;
  }

  // ---------------- COORDS (mouse <-> image) ----------------
  function canvasToImagePoint(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const { scale, offX, offY } = viewRef.current;
    return { x: (cx - offX) / scale, y: (cy - offY) / scale };
  }

  function imageToCanvasPoint(p) {
    const { scale, offX, offY } = viewRef.current;
    return { x: offX + p.x * scale, y: offY + p.y * scale };
  }

  // ---------------- DRAW ----------------
  function drawAll() {
    const canvas = canvasRef.current;
    if (!canvas || !imgObj) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // background
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // contain image in fixed viewport
    const scale = Math.min(
      rect.width / imgObj.width,
      rect.height / imgObj.height,
    );
    const drawW = imgObj.width * scale;
    const drawH = imgObj.height * scale;
    const offX = (rect.width - drawW) / 2;
    const offY = (rect.height - drawH) / 2;
    viewRef.current = { scale, offX, offY, drawW, drawH };

    // image
    ctx.save();
    ctx.globalAlpha = 0.98;
    ctx.drawImage(imgObj, offX, offY, drawW, drawH);
    ctx.restore();

    // vignette
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

    // draw finished
    items.forEach((it) => drawItem(ctx, it, false));

    // draw draft on top
    if (draft) drawItem(ctx, draft, true);
  }

  function drawItem(ctx, it, isDraft) {
    const color = it.color || strokeColor;
    const width = it.width || lineWidth;

    function glow(pathFn) {
      ctx.save();
      pathFn();
      ctx.lineWidth = width + 6;
      ctx.lineCap = "round";
      ctx.strokeStyle = color;
      ctx.globalAlpha = isDraft ? 0.12 : 0.18;
      ctx.shadowBlur = 16;
      ctx.shadowColor = color;
      ctx.stroke();
      ctx.restore();
    }

    function main(pathFn) {
      ctx.save();
      pathFn();
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.strokeStyle = color;
      ctx.globalAlpha = isDraft ? 0.85 : 1;
      ctx.shadowBlur = 6;
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.stroke();
      ctx.restore();
    }

    // small handle circle for editing
    function handleDot(pImg) {
      const p = imageToCanvasPoint(pImg);
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fill();
      ctx.restore();
    }

    // label bubble (optional)
    function drawMeasurementLabel(text, A, B) {
      if (!showLabel || !text) return;

      let p;
      if (labelPos === "middle") {
        p = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
      } else if (labelPos === "end") {
        p = { x: B.x, y: B.y };
      } else {
        const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        p = { x: mid.x + nx * 18, y: mid.y + ny * 18 };
      }

      const cp = imageToCanvasPoint(p);

      ctx.save();
      ctx.font = "12px Inter, Arial";
      ctx.textBaseline = "middle";

      const padX = 10;
      const boxH = 26;
      const textW = ctx.measureText(text).width;
      const boxW = textW + padX * 2;

      const bx = cp.x - boxW / 2;
      const by = cp.y - boxH / 2;

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;

      roundRect(ctx, bx, by, boxW, boxH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      roundRect(ctx, bx + 6, by + 6, 4, boxH - 12, 4);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillText(text, bx + padX + 6, by + boxH / 2);

      ctx.restore();
    }

    // ---- LINE ----
    if (it.type === "line" && it.A && it.B) {
      const A = imageToCanvasPoint(it.A);
      const B = imageToCanvasPoint(it.B);

      glow(() => {
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
      });
      main(() => {
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
      });

      // handles for editing
      handleDot(it.A);
      handleDot(it.B);

      // label optional
      const px = dist(it.A, it.B);
      drawMeasurementLabel(`${px.toFixed(0)} px`, it.A, it.B);
    }

    // ---- ANGLE ---- (A - V - B)
    if (it.type === "angle" && it.A && it.V && it.B) {
      const A = imageToCanvasPoint(it.A);
      const V = imageToCanvasPoint(it.V);
      const B = imageToCanvasPoint(it.B);

      glow(() => {
        ctx.beginPath();
        ctx.moveTo(V.x, V.y);
        ctx.lineTo(A.x, A.y);
        ctx.moveTo(V.x, V.y);
        ctx.lineTo(B.x, B.y);
      });
      main(() => {
        ctx.beginPath();
        ctx.moveTo(V.x, V.y);
        ctx.lineTo(A.x, A.y);
        ctx.moveTo(V.x, V.y);
        ctx.lineTo(B.x, B.y);
      });

      // handles for editing
      handleDot(it.A);
      handleDot(it.V);
      handleDot(it.B);

      // show label near V (optional)
      if (showLabel) {
        const deg = angleDeg(it.A, it.V, it.B);
        const cp = imageToCanvasPoint(it.V);
        drawSmallLabel(ctx, cp.x + 18, cp.y - 18, `${deg.toFixed(1)}°`, color);
      }
    }

    // ---- RECT ---- (A,B as opposite corners)
    if (it.type === "rect" && it.A && it.B) {
      const A = imageToCanvasPoint(it.A);
      const B = imageToCanvasPoint(it.B);

      const x = Math.min(A.x, B.x);
      const y = Math.min(A.y, B.y);
      const w = Math.abs(B.x - A.x);
      const h = Math.abs(B.y - A.y);

      glow(() => {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
      });
      main(() => {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
      });

      // handles
      handleDot(it.A);
      handleDot(it.B);
    }

    // ---- CIRCLE ---- (A = center, B = radius point)
    if (it.type === "circle" && it.A && it.B) {
      const A = imageToCanvasPoint(it.A);
      const B = imageToCanvasPoint(it.B);
      const r = Math.sqrt((B.x - A.x) ** 2 + (B.y - A.y) ** 2);

      glow(() => {
        ctx.beginPath();
        ctx.arc(A.x, A.y, r, 0, Math.PI * 2);
      });
      main(() => {
        ctx.beginPath();
        ctx.arc(A.x, A.y, r, 0, Math.PI * 2);
      });

      // handles
      handleDot(it.A);
      handleDot(it.B);
    }

    // ---- PEN ----
    if (it.type === "pen" && it.points && it.points.length > 1) {
      const pts = it.points.map(imageToCanvasPoint);

      glow(() => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      });

      main(() => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      });

      // handle on first/last only (simple)
      handleDot(it.points[0]);
      handleDot(it.points[it.points.length - 1]);
    }
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

  function drawSmallLabel(ctx, x, y, text, accent) {
    ctx.save();
    ctx.font = "12px Inter, Arial";
    ctx.textBaseline = "middle";
    const padX = 10;
    const boxH = 26;
    const textW = ctx.measureText(text).width;
    const boxW = textW + padX * 2;

    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;

    roundRect(ctx, x, y, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    roundRect(ctx, x + 6, y + 6, 4, boxH - 12, 4);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(text, x + padX + 6, y + boxH / 2);
    ctx.restore();
  }

  // ---------------- IMAGE LOADING ----------------
  function loadFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImgObj(image);
      setItems([]);
      setDraft(null);
      setDrag({ type: "NONE" });
    };
    image.src = url;
  }

  function handleUpload(e) {
    loadFile(e.target.files?.[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDraggingFile(false);
    loadFile(e.dataTransfer.files?.[0]);
  }
  function handleDragOver(e) {
    e.preventDefault();
  }
  function handleDragEnter(e) {
    e.preventDefault();
    setIsDraggingFile(true);
  }
  function handleDragLeave(e) {
    e.preventDefault();
    setIsDraggingFile(false);
  }

  // ---------------- EDIT HIT TEST (THIS MAKES MOVING WORK) ----------------
  const HANDLE_RADIUS = 12; // in image pixels (simple)

  function hitHandle(p, h) {
    if (!h) return false;
    return dist(p, h) <= HANDLE_RADIUS;
  }

  function hitItem(p, it) {
    // returns info about what we clicked:
    // { kind:"HANDLE", key:"A"|"B"|"V", index }
    // { kind:"MOVE", index }
    if (!it) return null;

    // ---- LINE ----
    if (it.type === "line" && it.A && it.B) {
      if (hitHandle(p, it.A)) return { kind: "HANDLE", key: "A" };
      if (hitHandle(p, it.B)) return { kind: "HANDLE", key: "B" };

      // click near the line body = move whole line
      const d = pointToSegmentDistance(p, it.A, it.B);
      if (d <= 10) return { kind: "MOVE" };
    }

    // ---- ANGLE ----
    if (it.type === "angle" && it.A && it.V && it.B) {
      if (hitHandle(p, it.A)) return { kind: "HANDLE", key: "A" };
      if (hitHandle(p, it.V)) return { kind: "HANDLE", key: "V" };
      if (hitHandle(p, it.B)) return { kind: "HANDLE", key: "B" };

      // click near either leg = move whole angle
      const d1 = pointToSegmentDistance(p, it.V, it.A);
      const d2 = pointToSegmentDistance(p, it.V, it.B);
      if (Math.min(d1, d2) <= 10) return { kind: "MOVE" };
    }

    // ---- RECT ----
    if (it.type === "rect" && it.A && it.B) {
      if (hitHandle(p, it.A)) return { kind: "HANDLE", key: "A" };
      if (hitHandle(p, it.B)) return { kind: "HANDLE", key: "B" };

      // inside rectangle -> move
      const minX = Math.min(it.A.x, it.B.x);
      const maxX = Math.max(it.A.x, it.B.x);
      const minY = Math.min(it.A.y, it.B.y);
      const maxY = Math.max(it.A.y, it.B.y);
      if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
        return { kind: "MOVE" };
      }
    }

    // ---- CIRCLE ----
    if (it.type === "circle" && it.A && it.B) {
      if (hitHandle(p, it.A)) return { kind: "HANDLE", key: "A" }; // center
      if (hitHandle(p, it.B)) return { kind: "HANDLE", key: "B" }; // radius point

      // near circle edge -> move whole circle
      const r = dist(it.A, it.B);
      const d = Math.abs(dist(p, it.A) - r);
      if (d <= 10) return { kind: "MOVE" };
    }

    // ---- PEN ----
    if (it.type === "pen" && it.points && it.points.length > 1) {
      // if near any point -> move whole path (simple)
      for (let i = 0; i < it.points.length; i += 6) {
        if (hitHandle(p, it.points[i])) return { kind: "MOVE" };
      }
    }

    return null;
  }

  // ---------------- EVENTS ----------------

  // Click tools (line/angle) still use clicks to create points,
  // BUT editing uses mouse down first (so you can drag handles).
  function handleCanvasClick(e) {
    if (!imgObj) return;

    // if currently dragging/editing, ignore click
    if (drag.type !== "NONE") return;

    let p = clampToImage(canvasToImagePoint(e));

    // LINE: 2 clicks
    if (tool === TOOLS.line) {
      if (!draft) {
        setDraft({
          type: "line",
          A: p,
          B: null,
          color: strokeColor,
          width: lineWidth,
        });
      } else if (draft.type === "line" && !draft.B) {
        const done = { ...draft, B: p };
        setItems((prev) => [...prev, done]);
        setDraft(null);
      }
    }

    // ANGLE: 3 clicks
    if (tool === TOOLS.angle) {
      if (!draft) {
        setDraft({
          type: "angle",
          A: p,
          V: null,
          B: null,
          color: strokeColor,
          width: lineWidth,
        });
      } else if (draft.type === "angle" && !draft.V) {
        setDraft({ ...draft, V: p });
      } else if (draft.type === "angle" && !draft.B) {
        const done = { ...draft, B: p };
        setItems((prev) => [...prev, done]);
        setDraft(null);
      }
    }
  }

  function handleMouseDown(e) {
    if (!imgObj) return;

    let p = clampToImage(canvasToImagePoint(e));

    // 1) FIRST: try to EDIT existing item (top-most first)
    for (let index = items.length - 1; index >= 0; index--) {
      const it = items[index];
      const hit = hitItem(p, it);
      if (!hit) continue;

      // HANDLE drag
      if (hit.kind === "HANDLE") {
        setDrag({
          type: "HANDLE",
          index,
          key: hit.key, // A/B/V
        });
        return;
      }

      // MOVE drag (whole shape)
      if (hit.kind === "MOVE") {
        setDrag({
          type: "MOVE",
          index,
          start: p,
          // store original so moving is smooth
          original: JSON.parse(JSON.stringify(it)),
        });
        return;
      }
    }

    // 2) If not editing, start DRAW drag-tools
    // (rect/circle/pen are drag tools)
    if (tool === TOOLS.rect) {
      setDrag({ type: "DRAW" });
      setDraft({
        type: "rect",
        A: p,
        B: p,
        color: strokeColor,
        width: lineWidth,
      });
      return;
    }

    if (tool === TOOLS.circle) {
      setDrag({ type: "DRAW" });
      setDraft({
        type: "circle",
        A: p,
        B: p,
        color: strokeColor,
        width: lineWidth,
      });
      return;
    }

    if (tool === TOOLS.pen) {
      setDrag({ type: "DRAW" });
      setDraft({
        type: "pen",
        points: [p],
        color: strokeColor,
        width: lineWidth,
      });
      return;
    }
  }

  function handleMouseMove(e) {
    if (!imgObj) return;
    if (drag.type === "NONE") return;

    let p = clampToImage(canvasToImagePoint(e));

    // Dragging a HANDLE (A/B/V)
    if (drag.type === "HANDLE") {
      setItems((prev) =>
        prev.map((it, i) => {
          if (i !== drag.index) return it;
          return { ...it, [drag.key]: p };
        }),
      );
      return;
    }

    // Moving whole shape
    if (drag.type === "MOVE") {
      const { start, original } = drag;
      const dx = p.x - start.x;
      const dy = p.y - start.y;

      setItems((prev) =>
        prev.map((it, i) => {
          if (i !== drag.index) return it;

          const o = original;

          if (o.type === "line") {
            return {
              ...it,
              A: { x: o.A.x + dx, y: o.A.y + dy },
              B: { x: o.B.x + dx, y: o.B.y + dy },
            };
          }

          if (o.type === "angle") {
            return {
              ...it,
              A: { x: o.A.x + dx, y: o.A.y + dy },
              V: { x: o.V.x + dx, y: o.V.y + dy },
              B: { x: o.B.x + dx, y: o.B.y + dy },
            };
          }

          if (o.type === "rect" || o.type === "circle") {
            return {
              ...it,
              A: { x: o.A.x + dx, y: o.A.y + dy },
              B: { x: o.B.x + dx, y: o.B.y + dy },
            };
          }

          if (o.type === "pen") {
            return {
              ...it,
              points: o.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })),
            };
          }

          return it;
        }),
      );
      return;
    }

    // Drawing (rect/circle/pen)
    if (drag.type === "DRAW" && draft) {
      if (draft.type === "rect" || draft.type === "circle") {
        setDraft({ ...draft, B: p });
      } else if (draft.type === "pen") {
        setDraft({ ...draft, points: [...draft.points, p] });
      }
    }
  }

  function handleMouseUp() {
    if (drag.type === "NONE") return;

    // finish draw tools -> save draft
    if (drag.type === "DRAW" && draft) {
      if (
        draft.type === "rect" ||
        draft.type === "circle" ||
        draft.type === "pen"
      ) {
        setItems((prev) => [...prev, draft]);
        setDraft(null);
      }
    }

    setDrag({ type: "NONE" });
  }

  function resetAll() {
    setItems([]);
    setDraft(null);
    setDrag({ type: "NONE" });
  }

  // redraw
  useEffect(() => {
    drawAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgObj, items, draft, strokeColor, lineWidth, showLabel, labelPos]);

  // panel summary (last item)
  const last = items[items.length - 1];
  let summary = "—";
  if (last?.type === "line" && last.A && last.B) {
    const px = dist(last.A, last.B);
    const cm = pxPerCm > 0 ? px / pxPerCm : null;
    summary = cm
      ? `${px.toFixed(0)} px (${cm.toFixed(2)} cm)`
      : `${px.toFixed(0)} px`;
  }
  if (last?.type === "angle" && last.A && last.V && last.B) {
    summary = `${angleDeg(last.A, last.V, last.B).toFixed(1)}°`;
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Medna Measurement Tool</h1>
          <p className={styles.subtitle}>
            Draw tools + Edit tools • Drag endpoints to adjust • Drag shape body
            to move
          </p>
        </div>
        <div className={styles.badge}>
          Tool: <b>{tool}</b>
        </div>
      </div>

      <div className={styles.controls}>
        <input
          className={styles.upload}
          type="file"
          accept="image/*"
          onChange={(e) => loadFile(e.target.files?.[0])}
        />

        <button
          className={styles.btnGhost}
          onClick={() => {
            setTool(TOOLS.line);
            setDraft(null);
          }}
        >
          📏 Line
        </button>
        <button
          className={styles.btnGhost}
          onClick={() => {
            setTool(TOOLS.angle);
            setDraft(null);
          }}
        >
          📐 Angle
        </button>
        <button
          className={styles.btnGhost}
          onClick={() => {
            setTool(TOOLS.circle);
            setDraft(null);
          }}
        >
          ⭕ Circle
        </button>
        <button
          className={styles.btnGhost}
          onClick={() => {
            setTool(TOOLS.rect);
            setDraft(null);
          }}
        >
          ⬛ Rect
        </button>
        <button
          className={styles.btnGhost}
          onClick={() => {
            setTool(TOOLS.pen);
            setDraft(null);
          }}
        >
          ✏️ Draw
        </button>

        <div className={styles.spacer} />

        <label className={styles.label}>
          Color
          <input
            className={styles.smallInput}
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            disabled={!imgObj}
          />
        </label>

        <label className={styles.label}>
          Size
          <input
            className={styles.smallInput}
            type="number"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            disabled={!imgObj}
          />
        </label>

        <label className={styles.label}>
          Digit
          <select
            className={styles.smallInput}
            value={labelPos}
            onChange={(e) => setLabelPos(e.target.value)}
            disabled={!imgObj}
          >
            <option value="above">Above</option>
            <option value="middle">Middle</option>
            <option value="end">Near end</option>
          </select>
        </label>

        <label className={styles.label}>
          Show
          <input
            type="checkbox"
            checked={showLabel}
            onChange={(e) => setShowLabel(e.target.checked)}
            disabled={!imgObj}
          />
        </label>

        <button
          className={styles.btnPrimary}
          onClick={resetAll}
          disabled={!imgObj}
        >
          Reset
        </button>
      </div>

      <div
        className={styles.canvasShell}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          loadFile(e.dataTransfer.files?.[0]);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
        }}
      >
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {isDraggingFile && (
          <div className={styles.dropHint}>Drop image to load</div>
        )}
        {!imgObj && (
          <div className={styles.empty}>
            Upload or drag & drop an image to start.
          </div>
        )}
      </div>

      <div className={styles.panel}>
        <div className={styles.panelRow}>
          <span className={styles.k}>Last measurement</span>
          <span className={styles.v}>{summary}</span>
        </div>
        <div className={styles.panelRow}>
          <span className={styles.k}>Edit</span>
          <span className={styles.v}>
            Drag endpoints (A/B/V) to adjust • Drag the line/shape body to move
          </span>
        </div>
      </div>
    </main>
  );
}
