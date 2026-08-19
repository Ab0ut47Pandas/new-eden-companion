import { Boxes } from "lucide-react";
import Link from "next/link";

import styles from "./asset-cleanup-shortcut.module.css";

export function AssetCleanupShortcut() {
  return (
    <Link className={styles.shortcut} href="/assets/cleanup" title="Review assets by evidence-backed keep, use, haul, sell, and review groups">
      <Boxes size={16} /> Asset Cleanup
    </Link>
  );
}
