import { PackageSearch } from "lucide-react";
import Link from "next/link";

import styles from "./item-explorer-shortcut.module.css";

export function ItemExplorerShortcut() {
  return (
    <Link className={styles.shortcut} href="/items" title="Search EVE items and explore acquisition dependencies">
      <PackageSearch size={16} /> Item Explorer
    </Link>
  );
}
