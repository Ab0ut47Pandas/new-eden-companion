import { Truck } from "lucide-react";
import Link from "next/link";

import styles from "./hauling-activity-shortcut.module.css";

export function HaulingActivityShortcut() {
  return (
    <Link className={styles.shortcut} href="/activities/hauling" title="Plan an own-cargo or courier move with hauling readiness checks">
      <Truck size={16} /> Hauling
    </Link>
  );
}
