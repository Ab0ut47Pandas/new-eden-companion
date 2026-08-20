import { Wrench } from "lucide-react";
import Link from "next/link";

import styles from "./fitting-builder-shortcut.module.css";

export function FittingBuilderShortcut() {
  return <Link className={styles.shortcut} href="/fitting" title="Open deterministic fitting builder"><Wrench size={16} /> Fit Builder</Link>;
}
