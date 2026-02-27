import styles from "./ToolSidebar.module.css";

export default function ToolSidebar({
  imgObj,
  railHidden,
  railExpanded,
  railPinned,
  tool,
  toolLabels,
  onToggleExpanded,
  onTogglePinned,
  onHide,
  onShow,
  onToolSelect,
  strokeColor,
  lineWidth,
  onStrokeColorChange,
  onLineWidthChange,
}) {
  if (railHidden) {
    return (
      <button className={styles.railShowBtn} onClick={onShow} title="Show tools">
        Tools
      </button>
    );
  }

  return (
    <aside
      className={`${styles.toolRailOverlay} ${railExpanded ? styles.toolRailExpanded : styles.toolRailCollapsed} ${railPinned ? styles.toolRailPinned : ""}`}
    >
      <div className={styles.railHeader}>
        <span className={styles.railTitle}>Tools</span>
        <div className={styles.railActions}>
          <button
            className={`${styles.railBtn} ${styles.railExpandBtn} ${railExpanded ? styles.railExpandOpen : ""}`}
            onClick={onToggleExpanded}
            title={railExpanded ? "Collapse" : "Expand"}
          >
            ➤
          </button>
          <button
            className={`${styles.railBtn} ${railPinned ? styles.railBtnActive : ""}`}
            onClick={onTogglePinned}
            title={railPinned ? "Unpin" : "Pin"}
          >
            📌
          </button>
          <button
            className={`${styles.railBtn} ${styles.railBtnDanger}`}
            onClick={onHide}
            title="Hide"
          >
            ✕
          </button>
        </div>
      </div>

      {Object.entries(toolLabels).map(([key, data]) => (
        <button
          key={key}
          className={`${styles.toolBtn} ${tool === key ? styles.toolBtnActive : ""}`}
          onClick={() => onToolSelect(key)}
        >
          <span>{data.icon}</span>
          {railExpanded && <span>{data.label}</span>}
        </button>
      ))}

      {railExpanded && (
        <>
          <label className={styles.label}>
            Color
            <input
              className={styles.smallInput}
              type="color"
              value={strokeColor}
              onChange={(e) => onStrokeColorChange(e.target.value)}
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
              onChange={(e) => onLineWidthChange(Number(e.target.value))}
              disabled={!imgObj}
            />
          </label>
        </>
      )}
    </aside>
  );
}
