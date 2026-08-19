import { TrendingUp, Truck } from "lucide-react";
import Link from "next/link";

import styles from "./hauling-activity-shortcut.module.css";

export function HaulingActivityShortcut() {
  return (
    <div className={styles.group} aria-label="Hauling tools">
      <Link className={styles.shortcut} href="/activities/hauling" title="Plan an own-cargo or courier move with hauling readiness checks">
        <Truck size={16} /> Hauling
      </Link>
      <Link className={styles.shortcut} href="/activities/hauling/trade-run" title="Optimize a trade cargo basket and compare custom risk-aware routes">
        <TrendingUp size={16} /> Trade Run
      </Link>
    </div>
  );
}
