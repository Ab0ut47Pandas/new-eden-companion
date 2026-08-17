"use client";

import { CheckCircle2, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { DashboardData } from "@/lib/dashboard/model";

interface SkillExportButtonProps {
  characterName: string;
  skills: DashboardData["skills"];
  connected: boolean;
}

function skillExportText(characterName: string, skills: DashboardData["skills"]): string {
  const lines = skills.trained.map((skill) => {
    if (skill.activeLevel === skill.trainedLevel) return `${skill.name} ${skill.trainedLevel}`;
    return `${skill.name} ${skill.trainedLevel} (active ${skill.activeLevel})`;
  });

  return [
    "# New Eden Companion skill export",
    `# Character: ${characterName}`,
    `# Total SP: ${skills.totalSp}`,
    `# Trained skills: ${skills.trainedSkills}`,
    "# Levels are trained levels; an active level is shown only when it differs.",
    "",
    ...lines,
  ].join("\n");
}

function findSkillsHeader(): HTMLElement | null {
  const library = document.querySelector<HTMLElement>(".training-library");
  const header = library?.querySelector<HTMLElement>(":scope > header");
  return header ?? null;
}

export function SkillExportButton({ characterName, skills, connected }: SkillExportButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const canCopy = connected && skills.trained.length > 0;

  useEffect(() => {
    const syncTarget = () => setPortalTarget(findSkillsHeader());
    syncTarget();

    const observer = new MutationObserver(syncTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  async function copySkills() {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(skillExportText(characterName, skills));
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1_800);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2_500);
    }
  }

  const label = !connected
    ? "Connect EVE to export"
    : status === "copied"
      ? "Copied all trained skills"
      : status === "error"
        ? "Copy failed"
        : "Copy all trained skills";

  if (!portalTarget) return null;

  return createPortal(
    <>
      <button
        type="button"
        className={`skill-export-inline ${status}`}
        onClick={copySkills}
        disabled={!canCopy}
        title={connected ? "Copy every trained EVE skill and level to the clipboard" : "Connect an EVE character first"}
      >
        {status === "copied" ? <CheckCircle2 size={16} /> : <Copy size={16} />}
        <span>{label}</span>
      </button>
      <style jsx global>{`
        .skill-export-inline {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 38px;
          margin-left: auto;
          padding: 0 14px;
          border: 1px solid rgba(127, 255, 212, 0.34);
          border-radius: 9px;
          background: rgba(11, 22, 25, 0.74);
          color: #e8fff8;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;
        }

        .skill-export-inline:hover:not(:disabled) {
          border-color: rgba(127, 255, 212, 0.7);
          background: rgba(17, 35, 38, 0.9);
          transform: translateY(-1px);
        }

        .skill-export-inline.copied {
          border-color: rgba(127, 255, 212, 0.75);
        }

        .skill-export-inline.error {
          border-color: rgba(255, 168, 168, 0.65);
        }

        .skill-export-inline:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        @media (max-width: 760px) {
          .skill-export-inline {
            width: 100%;
            margin-left: 0;
          }
        }
      `}</style>
    </>,
    portalTarget,
  );
}
