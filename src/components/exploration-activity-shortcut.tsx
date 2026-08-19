import { ScanSearch } from "lucide-react";
import Link from "next/link";

import styles from "./exploration-activity-shortcut.module.css";

export function ExplorationActivityShortcut() {
  return (
    <Link className={styles.shortcut} href="/activities/exploration" title="Open the beginner exploration scanning and hacking guide">
      <ScanSearch size={16} /> Exploration Guide
    </Link>
  );
}
