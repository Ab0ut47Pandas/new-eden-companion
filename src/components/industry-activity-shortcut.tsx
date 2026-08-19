import { BookCopy, Factory } from "lucide-react";
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
    </div>
  );
}
