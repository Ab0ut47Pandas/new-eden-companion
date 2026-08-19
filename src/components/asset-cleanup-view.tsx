import { ArrowLeft, Boxes, CircleHelp, PackageCheck, Route, ShieldCheck, ShoppingCart, Target } from "lucide-react";
import Link from "next/link";

import type { DashboardData } from "@/lib/dashboard/model";
import { buildAssetCleanupView, type AssetCleanupDecision, type AssetCleanupInput } from "@/lib/economy/asset-cleanup";

import styles from "./asset-cleanup-view.module.css";

const GROUPS: ReadonlyArray<{ id: AssetCleanupDecision["disposition"]; label: string; icon: typeof Boxes }> = [
  { id: "goal-critical", label: "Goal-critical", icon: Target },
  { id: "keep", label: "Keep", icon: ShieldCheck },
  { id: "use-soon", label: "Use soon", icon: PackageCheck },
  { id: "haul", label: "Haul", icon: Route },
  { id: "sell", label: "Sell", icon: ShoppingCart },
  { id: "unknown", label: "Review", icon: CircleHelp },
];

const FITTED_FLAG = /^(HiSlot|MedSlot|LoSlot|RigSlot|SubSystemSlot|ServiceSlot)/i;

function fallbackCleanup(data: DashboardData): AssetCleanupDecision[] {
  const shipItems = new Map(data.character.shipContents.map((item) => [item.itemId, item]));
  const inputs: AssetCleanupInput[] = data.assets.topItems.map((item) => {
    const shipItem = shipItems.get(item.itemId);
    if (shipItem && FITTED_FLAG.test(shipItem.locationFlag)) {
      return {
        itemId: item.itemId,
        typeId: item.typeId,
        name: item.name,
        quantity: item.quantity,
        location: item.location,
        estimatedValueIsk: item.estimatedValue,
        intrinsicPreservation: [{ kind: "fitted", reason: `ESI places this item in ${shipItem.locationFlag} on the active ship.` }],
      };
    }
    if (shipItem) {
      return {
        itemId: item.itemId,
        typeId: item.typeId,
        name: item.name,
        quantity: item.quantity,
        location: item.location,
        estimatedValueIsk: item.estimatedValue,
        intrinsicPreservation: [{ kind: "allocated", reason: `ESI places this item inside the active ship (${shipItem.locationFlag}); NEC will not treat staged ship inventory as disposable.` }],
      };
    }
    return {
      itemId: item.itemId,
      typeId: item.typeId,
      name: item.name,
      quantity: item.quantity,
      location: item.location,
      estimatedValueIsk: item.estimatedValue,
      intrinsicPreservation: [{ kind: "replaceability-uncertain", reason: "No supported goal, blueprint-state, source-rarity, allocation, or liquid replacement evidence is attached to this asset yet." }],
    };
  });
  return buildAssetCleanupView(inputs);
}

function isk(value: number | null): string {
  if (value === null) return "Unknown value";
  return `${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value)} ISK`;
}

export function AssetCleanupView({ data }: { data: DashboardData }) {
  const decisions = data.assets.cleanup?.length ? data.assets.cleanup : fallbackCleanup(data);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}><ArrowLeft size={16} /> Dashboard</Link>
        <div>
          <span>Evidence-first inventory triage</span>
          <h1>Asset cleanup</h1>
          <p>NEC groups assets by supported action. It will not turn “unused right now” into “safe to sell.” Unknown rarity, source, blueprint state, or replaceability stays in Review.</p>
        </div>
      </header>

      <section className={styles.notice}>
        <ShieldCheck size={18} />
        <div><strong>Sell is intentionally hard to earn.</strong><span>A sell row requires positive replaceability and liquid-market evidence after goal use, stockpile use, allocation, blueprint preservation, rarity/source evidence, and uncertainty have been cleared.</span></div>
      </section>

      <nav className={styles.summary} aria-label="Cleanup groups">
        {GROUPS.map((group) => {
          const count = decisions.filter((item) => item.disposition === group.id).length;
          const Icon = group.icon;
          return <a key={group.id} href={`#cleanup-${group.id}`}><Icon size={16} /><span>{group.label}</span><strong>{count}</strong></a>;
        })}
      </nav>

      <div className={styles.groups}>
        {GROUPS.map((group) => {
          const rows = decisions.filter((item) => item.disposition === group.id);
          const Icon = group.icon;
          return (
            <section className={styles.group} id={`cleanup-${group.id}`} key={group.id}>
              <header><div><Icon size={18} /><h2>{group.label}</h2></div><span>{rows.length} item{rows.length === 1 ? "" : "s"}</span></header>
              {rows.length ? <div className={styles.rows}>{rows.map((item) => (
                <article key={item.itemId} className={styles.row}>
                  <div className={styles.identity}><strong>{item.name}</strong><span>{item.quantity.toLocaleString()} · {item.location}</span></div>
                  <div className={styles.reason}><strong>{item.headline}</strong><span>{item.reason}</span></div>
                  <div className={styles.value}>{isk(item.estimatedValueIsk)}</div>
                </article>
              ))}</div> : <div className={styles.empty}>No assets currently have enough evidence for this group.</div>}
            </section>
          );
        })}
      </div>

      <footer className={styles.footer}>
        <CircleHelp size={17} /><span>Only the dashboard's top asset records are shown here today. Missing source/rarity/blueprint/market evidence stays conservative by design rather than being guessed.</span>
      </footer>
    </main>
  );
}
