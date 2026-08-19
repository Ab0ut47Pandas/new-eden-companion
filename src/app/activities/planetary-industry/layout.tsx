import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./planetary-industry.module.css";

export default function PlanetaryIndustryLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <nav className={styles.piNav} aria-label="Planetary Industry tools">
        <Link className={styles.action} href="/activities/planetary-industry">Colony dashboard</Link>
        <Link className={styles.action} href="/activities/planetary-industry/planner">Production planner</Link>
      </nav>
      {children}
    </>
  );
}
