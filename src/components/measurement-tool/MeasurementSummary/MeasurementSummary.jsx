import styles from "./MeasurementSummary.module.css";

export default function MeasurementSummary({ selectedSummary }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelRow}>
        <span className={styles.key}>Selected measurement</span>
        <span className={styles.value}>{selectedSummary}</span>
      </div>
    </div>
  );
}
