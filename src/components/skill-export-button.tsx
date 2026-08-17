"use client";

import { CheckCircle2, Copy } from "lucide-react";
import { useState } from "react";

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

export function SkillExportButton({ characterName, skills, connected }: SkillExportButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const canCopy = connected && skills.trained.length > 0;

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

  return (
    <>
      <button
        type="button"
        className={`skill-export-float ${status}`}
        onClick={copySkills}
        disabled={!canCopy}
        title={connected ? "Copy every trained EVE skill and level to the clipboard" : "Connect an EVE character first"}
      >
        {status === "copied" ? <CheckCircle2 size={16} /> : <Copy size={16} />}
        <span>{label}</span>
      </button>
      <style jsx global>{`
        .skill-export-float {
          display: none;
          position: fixed;
          top: 88px;
          right: 28px;
          z-index: 40;
          align-items: center;
          gap: 8px;
          min-height: 38px;
          padding: 0 14px;
          border: 1px solid rgba(127, 255, 212, 0.34);
          border-radius: 9px;
          background: rgba(11, 22, 25, 0.96);
          color: #e8fff8;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
          cursor: pointer;
          backdrop-filter: blur(10px);
        }

        body:has(.training-library) .skill-export-float {
          display: inline-flex;
        }

        .skill-export-float:hover:not(:disabled) {
          border-color: rgba(127, 255, 212, 0.7);
          transform: translateY(-1px);
        }

        .skill-export-float.copied {
          border-color: rgba(127, 255, 212, 0.75);
        }

        .skill-export-float.error {
          border-color: rgba(255, 168, 168, 0.65);
        }

        .skill-export-float:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        @media (max-width: 760px) {
          .skill-export-float {
            top: auto;
            right: 16px;
            bottom: 18px;
            max-width: calc(100vw - 32px);
          }
        }
      `}</style>
    </>
  );
}
