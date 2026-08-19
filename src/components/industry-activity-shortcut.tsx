import { Atom, BookCopy, Factory, Orbit } from "lucide-react";
import Link from "next/link";

import styles from "./industry-activity-shortcut.module.css";

export function IndustryActivityShortcut() {
  return (
    <div className={styles.group} aria-label="Industry tools">
      <Link className={styles.shortcut} href="/activities/industry/manufacturing" title="Plan a manufacturing job against your blueprints, skills, materials and input location">
        <Factory size={16} /> Manufacturing
      </Link>
      <Link className={styles.shortcut} href="/activities/industry/blueprints" title="Inspect BPO/BPC ownership, research, copying, activity requirements and source boundaries">
        <BookCopy size={16} /> Blueprint Lab
      </Link>
      <Link className={styles.shortcut} href="/activities/industry/advanced" title="Trace invention and reaction dependencies, source items, materials, skills and chance/facility boundaries">
        <Atom size={16} /> Invention &amp; Reactions
      </Link>
      <Link className={styles.shortcut} href="/activities/planetary-industry" title="Inspect ESI-visible PI colonies, extractor timing, routes and attention">
        <Orbit size={16} /> Planetary Industry
      </Link>
    </div>
  );
}
