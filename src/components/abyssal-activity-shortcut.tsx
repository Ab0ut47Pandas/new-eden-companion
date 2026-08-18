import { Orbit } from "lucide-react";
import Link from "next/link";

import styles from "./abyssal-activity-shortcut.module.css";

export function AbyssalActivityShortcut() {
  return (
    <Link className={styles.shortcut} href="/activities/abyssal" title="Open the Abyssal first-run briefing and vetted fit guide">
      <Orbit size={16} /> Abyssal Guide
    </Link>
  );
}
