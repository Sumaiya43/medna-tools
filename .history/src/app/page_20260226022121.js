import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  const [immageUrl, setImageUrl] = useState(null);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImageUrl(url);
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Customize Tools</h1>

        <input type="file" accept="image/*" onChange={handleUpload} />
      </main>
    </div>
  );
}
