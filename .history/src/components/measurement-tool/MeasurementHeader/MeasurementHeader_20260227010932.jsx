import styles from "./MeasurementHeader.module.css";

export default function MeasurementHeader({ tool, armed, activeTypeName }) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Medna Measurement Tool</h1>
        <p className={styles.subtitle}>
          Tools for
        </p>
      </div>

      <div className={styles.badge}>
        Tool: <b>{tool}</b> {armed ? "• Ready" : "• Edit"} • Active{" "}
        {activeTypeName || "None"}
      </div>
    </div>
  );
}
