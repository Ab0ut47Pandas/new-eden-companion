import { ArrowLeft, PackageSearch } from "lucide-react";
import Link from "next/link";

import { FittingBuilderClient } from "./FittingBuilderClient";
import styles from "./fitting-builder.module.css";

export default function FittingBuilderPage() {
  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <Link className={styles.link} href="/"><ArrowLeft size={15} /> Back to companion</Link>
          <Link className={styles.link} href="/items"><PackageSearch size={15} /> Item explorer</Link>
        </div>
        <section className={styles.hero}>
          <div className={styles.pill}>FIT-03 interactive builder</div>
          <h1>Deterministic fitting sandbox</h1>
          <p>Build from NEC's validated resolved-Dogma catalog and watch fit legality and supported stats update immediately. The catalog is intentionally conservative: unsupported hulls, modules, effects, and charges stay unavailable or unknown rather than being guessed from item names.</p>
        </section>
        <div className={styles.notice}><strong>Current scope:</strong> the initial catalog exposes the current-SDE Rifter fitting fixtures validated by FIT-02. This proves the interactive workflow without pretending NEC can already materialize every arbitrary Dogma effect. Broader catalog materialization remains a prerequisite before this can replace Pyfa for general fitting.</div>
        <FittingBuilderClient />
      </div>
    </main>
  );
}
