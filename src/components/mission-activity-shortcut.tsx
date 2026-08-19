import { Swords } from "lucide-react";
import Link from "next/link";

import styles from "./mission-activity-shortcut.module.css";

export function MissionActivityShortcut() {
  return (
    <Link className={styles.shortcut} href="/activities/missions" title="Open Security mission progression guidance">
      <Swords size={16} /> Mission Guide
    </Link>
  );
}
