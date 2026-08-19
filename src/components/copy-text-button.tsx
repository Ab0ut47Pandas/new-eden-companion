"use client";

import { Check, Clipboard } from "lucide-react";
import { useState } from "react";

export function CopyTextButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="nec-copy-button" type="button" onClick={() => void copy()} title={label}>
      {copied ? <Check size={14} /> : <Clipboard size={14} />}
      {copied ? "Copied" : label}
      <style jsx>{`
        .nec-copy-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 34px;
          padding: 0 11px;
          border: 1px solid rgba(98, 216, 184, .35);
          border-radius: 8px;
          background: rgba(98, 216, 184, .08);
          color: #bdf7e7;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }
        .nec-copy-button:hover {
          border-color: rgba(98, 216, 184, .6);
          background: rgba(98, 216, 184, .13);
        }
      `}</style>
    </button>
  );
}
