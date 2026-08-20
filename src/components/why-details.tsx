import { CircleHelp } from "lucide-react";

import styles from "./why-details.module.css";

export interface WhyDetailsProps {
  label?: string;
  rule?: string;
  reasons?: readonly string[];
  evidence?: readonly string[];
  provenance?: readonly string[];
  unknowns?: readonly string[];
  emptyMessage?: string;
  className?: string;
}

function unique(values: readonly string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function EvidenceList({ values }: { values: readonly string[] }) {
  return values.length === 1 ? <p>{values[0]}</p> : <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul>;
}

export function WhyDetails({
  label = "Why?",
  rule,
  reasons,
  evidence,
  provenance,
  unknowns,
  emptyMessage = "No additional supported explanation is available.",
  className,
}: WhyDetailsProps) {
  const normalizedReasons = unique(reasons);
  const normalizedEvidence = unique(evidence);
  const normalizedProvenance = unique(provenance);
  const normalizedUnknowns = unique(unknowns);
  const hasContent = Boolean(rule?.trim()) || normalizedReasons.length > 0 || normalizedEvidence.length > 0 || normalizedProvenance.length > 0 || normalizedUnknowns.length > 0;

  return (
    <details className={[styles.why, className].filter(Boolean).join(" ")}>
      <summary><CircleHelp size={15} aria-hidden="true" /> {label}</summary>
      <div className={styles.content}>
        {!hasContent ? <p className={styles.muted}>{emptyMessage}</p> : null}
        {rule?.trim() ? <div className={styles.section}><strong>Rule</strong><p>{rule.trim()}</p></div> : null}
        {normalizedReasons.length ? <div className={styles.section}><strong>Reasoning</strong><EvidenceList values={normalizedReasons} /></div> : null}
        {normalizedEvidence.length ? <div className={styles.section}><strong>Evidence</strong><EvidenceList values={normalizedEvidence} /></div> : null}
        {normalizedProvenance.length ? <div className={styles.section}><strong>Source / provenance</strong><EvidenceList values={normalizedProvenance} /></div> : null}
        {normalizedUnknowns.length ? <div className={styles.section}><strong>Not established</strong><EvidenceList values={normalizedUnknowns} /></div> : null}
      </div>
    </details>
  );
}
