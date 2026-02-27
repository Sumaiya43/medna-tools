import ToolSidebar from "../ToolSidebar/ToolSidebar";
import styles from "./CanvasWorkspace.module.css";

export default function CanvasWorkspace({
  imgObj,
  railPinned,
  setRailExpanded,
  isDraggingFile,
  onDropFile,
  onDragOverFile,
  onDragEnterFile,
  onDragLeaveFile,
  toolSidebarProps,
  canvasRef,
  canvasCursor,
  onCanvasWheel,
  onCanvasClick,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onCanvasMouseLeave,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  trashBinRef,
  isDraggingExistingShape,
  deleteHot,
}) {
  return (
    <div
      className={styles.canvasShell}
      onDrop={onDropFile}
      onDragOver={onDragOverFile}
      onDragEnter={onDragEnterFile}
      onDragLeave={onDragLeaveFile}
      onMouseLeave={() => {
        if (!railPinned) setRailExpanded(false);
      }}
    >
      <ToolSidebar {...toolSidebarProps} imgObj={imgObj} />

      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ cursor: canvasCursor }}
        onWheel={onCanvasWheel}
        onClick={onCanvasClick}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseLeave}
      />

      <div className={styles.zoomColumn}>
        <button className={styles.zoomBtn} onClick={onZoomIn} disabled={!imgObj}>
          +
        </button>
        <div className={styles.zoomValue}>{Math.round(zoom * 100)}%</div>
        <button className={styles.zoomBtn} onClick={onZoomOut} disabled={!imgObj}>
          -
        </button>
        <button
          className={styles.zoomResetBtn}
          onClick={onZoomReset}
          disabled={!imgObj}
        >
          Reset
        </button>
      </div>

      <div
        ref={trashBinRef}
        className={`${styles.trashBin} ${isDraggingExistingShape ? styles.trashBinActive : ""} ${deleteHot ? styles.trashBinHot : ""}`}
      >
        <span className={styles.trashIcon}>🗑️</span>
        <span className={styles.trashText}>
          {isDraggingExistingShape ? "Drop to Delete" : "Delete"}
        </span>
      </div>

      {isDraggingFile && <div className={styles.dropHint}>Drop image to load</div>}
      {!imgObj && (
        <div className={styles.empty}>Upload or drag & drop an image to start.</div>
      )}
    </div>
  );
}
