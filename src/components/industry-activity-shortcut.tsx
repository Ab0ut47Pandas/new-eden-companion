import { Factory } from "lucide-react";
import Link from "next/link";

import styles from "./industry-activity-shortcut.module.css";

export function IndustryActivityShortcut() {
  return (
    <Link className={styles.shortcut} href="/activities/industry/manufacturing" title="Plan a manufacturing job against your blueprints, skills, materials and input location">
      <Factory size={16} /> Manufacturing
    </Link>
  );
}
