import styles from "./MeasurementControlsBar.module.css";

export default function MeasurementControlsBar({
  imgObj,
  activeTypeName,
  activeItem,
  activeMeasurementValue,
  angleValue,
  manualCmByTool,
  canUndo,
  canRedo,
  cursorMarkerSize,
  onFileSelect,
  onUpdateActiveMeasurement,
  onManualToolValueChange,
  onUndo,
  onRedo,
  onCursorSizeChange,
  onReset,
}) {
  return (
    <div className={styles.measureBar}>
      <input
        className={styles.upload}
        type="file"
        accept="image/*"
        onChange={(e) => onFileSelect(e.target.files?.[0])}
      />

      <label className={styles.label}>
        Active {activeTypeName || "Tool"}
        {activeItem?.type === "angle" ? (
          <span className={styles.value}>{angleValue}</span>
        ) : (
          <input
            className={styles.smallInput}
            type="number"
            step="0.1"
            value={activeItem ? activeMeasurementValue : ""}
            placeholder="Select shape"
            onChange={(e) => onUpdateActiveMeasurement(e.target.value)}
            disabled={!imgObj || !activeItem}
          />
        )}
      </label>

      <label className={styles.label}>
        Line
        <input
          className={styles.smallInput}
          type="number"
          step="0.1"
          value={manualCmByTool.line}
          onChange={(e) => onManualToolValueChange("line", e.target.value)}
        />
      </label>

      <label className={styles.label}>
        Rect
        <input
          className={styles.smallInput}
          type="number"
          step="0.1"
          value={manualCmByTool.rect}
          onChange={(e) => onManualToolValueChange("rect", e.target.value)}
        />
      </label>

      <label className={styles.label}>
        Circle
        <input
          className={styles.smallInput}
          type="number"
          step="0.1"
          value={manualCmByTool.circle}
          onChange={(e) => onManualToolValueChange("circle", e.target.value)}
        />
      </label>

      <label className={styles.label}>
        Pen
        <input
          className={styles.smallInput}
          type="number"
          step="0.1"
          value={manualCmByTool.pen}
          onChange={(e) => onManualToolValueChange("pen", e.target.value)}
        />
      </label>

      <button className={styles.btnGhost} onClick={onUndo} disabled={!canUndo}>
        Undo
      </button>
      <button className={styles.btnGhost} onClick={onRedo} disabled={!canRedo}>
        Redo
      </button>

      <label className={styles.label}>
        Cursor
        <input
          className={styles.smallInput}
          type="number"
          min="1"
          max="8"
          step="1"
          value={cursorMarkerSize}
          onChange={(e) => onCursorSizeChange(Number(e.target.value))}
        />
      </label>

      <button className={styles.btnPrimary} onClick={onReset} disabled={!imgObj}>
        Reset
      </button>
    </div>
  );
}
