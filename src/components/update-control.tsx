"use client";

import { CheckCircle2, Download, ExternalLink, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  canAutoUpdate: boolean;
  releaseUrl: string;
  reason: string | null;
}

type Phase = "idle" | "checking" | "starting" | "restarting" | "error";

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function UpdateControl() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [message, setMessage] = useState("Checking for updates…");
  const [open, setOpen] = useState(false);

  async function checkForUpdates(manual = false) {
    setPhase("checking");
    if (manual) setOpen(true);
    setMessage("Checking GitHub Releases…");
    try {
      const response = await fetch("/api/update", { cache: "no-store" });
      const body = await response.json() as UpdateInfo & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The update check failed.");
      setInfo(body);
      setPhase("idle");
      setMessage(body.updateAvailable ? `Version ${body.latestVersion} is available.` : "You are up to date.");
      if (body.updateAvailable) setOpen(true);
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "The update check failed.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void checkForUpdates(false); }, 1_000);
    return () => window.clearTimeout(timer);
  }, []);

  async function waitForRestart(targetVersion: string) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      await delay(1_000);
      try {
        const response = await fetch(`/api/update?local=1&t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) continue;
        const body = await response.json() as { currentVersion?: string };
        if (body.currentVersion === targetVersion) {
          window.location.reload();
          return;
        }
      } catch {
        // The local server is expected to disappear while its package is swapped.
      }
    }
    setPhase("error");
    setMessage("The updater did not reconnect to the new version. Reopen New Eden Companion; the updater will roll back if the new server cannot start.");
  }

  async function installUpdate() {
    if (!info?.updateAvailable || !info.canAutoUpdate) return;
    setPhase("starting");
    setMessage(`Starting the ${info.latestVersion} update…`);
    try {
      const response = await fetch("/api/update", { method: "POST" });
      const body = await response.json() as { error?: string; targetVersion?: string };
      if (!response.ok) throw new Error(body.error ?? "The update could not be started.");
      const targetVersion = body.targetVersion ?? info.latestVersion;
      setPhase("restarting");
      setMessage(`Installing ${targetVersion}. New Eden Companion will restart automatically.`);
      void waitForRestart(targetVersion);
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "The update could not be started.");
    }
  }

  const busy = phase === "checking" || phase === "starting" || phase === "restarting";
  const chipLabel = info?.updateAvailable
    ? `Update ${info.latestVersion}`
    : info
      ? `v${info.currentVersion}`
      : "Updates";

  return (
    <aside className={`update-control ${open ? "open" : ""} ${info?.updateAvailable ? "available" : ""}`}>
      {!open ? (
        <button type="button" className="update-chip" onClick={() => setOpen(true)} title="Check New Eden Companion updates">
          {info?.updateAvailable ? <Download size={15} /> : busy ? <RefreshCw className="spin" size={15} /> : <CheckCircle2 size={15} />}
          <span>{chipLabel}</span>
        </button>
      ) : (
        <div className="update-card">
          <header>
            <div><small>New Eden Companion</small><strong>Software update</strong></div>
            <button type="button" className="update-close" onClick={() => setOpen(false)} disabled={phase === "restarting"} aria-label="Close update panel"><X size={15} /></button>
          </header>

          <div className="update-versions">
            <span><small>Installed</small><strong>{info ? `v${info.currentVersion}` : "—"}</strong></span>
            <span><small>Latest stable</small><strong>{info ? `v${info.latestVersion}` : "—"}</strong></span>
          </div>

          <p className={phase === "error" ? "error" : ""}>{message}</p>
          {info?.updateAvailable && info.reason && <p className="update-note">{info.reason}</p>}
          {phase === "restarting" && <div className="update-progress"><i /></div>}

          <div className="update-actions">
            {info?.updateAvailable && info.canAutoUpdate && phase !== "restarting" && (
              <button type="button" className="update-primary" onClick={() => void installUpdate()} disabled={busy}>
                {phase === "starting" ? <RefreshCw className="spin" size={14} /> : <Download size={14} />}
                {phase === "starting" ? "Starting…" : "Update now"}
              </button>
            )}
            {info?.updateAvailable && !info.canAutoUpdate && (
              <a className="update-primary" href={info.releaseUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open release</a>
            )}
            {phase !== "restarting" && (
              <button type="button" className="update-secondary" onClick={() => void checkForUpdates(true)} disabled={busy}>
                <RefreshCw className={phase === "checking" ? "spin" : ""} size={14} /> Check again
              </button>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .update-control {
          position: fixed;
          right: 22px;
          bottom: 20px;
          z-index: 45;
          font-family: inherit;
        }
        .update-chip,
        .update-card {
          border: 1px solid rgba(132, 181, 190, 0.28);
          background: rgba(10, 20, 23, 0.96);
          color: #ecfffb;
          box-shadow: 0 14px 38px rgba(0, 0, 0, 0.34);
          backdrop-filter: blur(12px);
        }
        .update-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 38px;
          padding: 0 13px;
          border-radius: 10px;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .update-control.available .update-chip {
          border-color: rgba(127, 255, 212, 0.58);
          color: #baffea;
        }
        .update-card {
          width: min(360px, calc(100vw - 32px));
          padding: 15px;
          border-radius: 13px;
        }
        .update-control.available .update-card { border-color: rgba(127, 255, 212, 0.42); }
        .update-card header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .update-card header div { display: grid; gap: 2px; }
        .update-card header small { color: #7e9ca2; font-size: 10px; text-transform: uppercase; letter-spacing: .09em; }
        .update-card header strong { font-size: 15px; }
        .update-close {
          display: grid; place-items: center; width: 30px; height: 30px; padding: 0;
          border: 1px solid rgba(255,255,255,.08); border-radius: 8px; background: transparent; color: #9bb0b5; cursor: pointer;
        }
        .update-close:disabled { opacity: .4; cursor: not-allowed; }
        .update-versions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 14px 0 10px; }
        .update-versions span { display: grid; gap: 2px; padding: 9px 10px; border-radius: 9px; background: rgba(255,255,255,.035); }
        .update-versions small { color: #718c91; font-size: 10px; text-transform: uppercase; letter-spacing: .07em; }
        .update-versions strong { font-size: 13px; }
        .update-card p { margin: 8px 0; color: #b9cbce; font-size: 12px; line-height: 1.45; }
        .update-card p.error { color: #ffaaaa; }
        .update-card p.update-note { color: #8fa6aa; font-size: 11px; }
        .update-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 13px; }
        .update-primary,
        .update-secondary {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 34px; padding: 0 11px;
          border-radius: 8px; font: inherit; font-size: 11px; font-weight: 800; text-decoration: none; cursor: pointer;
        }
        .update-primary { border: 1px solid rgba(127,255,212,.48); background: rgba(74, 191, 157, .14); color: #c8ffed; }
        .update-secondary { border: 1px solid rgba(255,255,255,.1); background: transparent; color: #a9bdc1; }
        .update-primary:disabled,
        .update-secondary:disabled { opacity: .5; cursor: wait; }
        .update-progress { height: 3px; margin-top: 12px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.06); }
        .update-progress i { display: block; width: 42%; height: 100%; border-radius: inherit; background: currentColor; animation: update-slide 1.1s ease-in-out infinite alternate; }
        .spin { animation: update-spin .8s linear infinite; }
        @keyframes update-spin { to { transform: rotate(360deg); } }
        @keyframes update-slide { from { transform: translateX(-25%); } to { transform: translateX(165%); } }
        @media (max-width: 760px) {
          .update-control { right: 16px; bottom: 16px; }
        }
      `}</style>
    </aside>
  );
}
