import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

import styles from "@/app/items/item-explorer.module.css";

export function LiveDataUnavailable({
  title,
  detail,
  backHref = "/",
  backLabel = "Back to companion",
}: {
  title: string;
  detail: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <Link className={styles.backLink} href={backHref}><ArrowLeft size={15} /> {backLabel}</Link>
        <section className={styles.hero}>
          <div className={styles.eyebrow}>Live information unavailable</div>
          <h1>{title}</h1>
          <p>{detail}</p>
        </section>
        <div className={styles.notice}>
          <AlertTriangle size={17} /> NEC is not substituting demo character data for your unavailable live data. Refresh after ESI/session access is restored, or return to the companion and use explicitly labeled demo mode.
        </div>
      </div>
    </main>
  );
}
