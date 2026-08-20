"use client";

import { useMemo, useState } from "react";

import {
  compileBuilderState,
  createEmptyBuilderState,
  DEFAULT_FIT_BUILDER_CATALOG,
  exportBuilderState,
  importBuilderState,
  type FitBuilderState,
} from "@/lib/fitting/builder";

import styles from "./fitting-builder.module.css";

function fmt(value: number | null | undefined, suffix = "") {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}` : "Unknown";
}

export function FittingBuilderClient() {
  const [state, setState] = useState<FitBuilderState>(() => createEmptyBuilderState());
  const [serialized, setSerialized] = useState("");
  const [ioError, setIoError] = useState<string | null>(null);
  const compiled = useMemo(() => compileBuilderState(state), [state]);
  const result = compiled.result;

  function addModule(definitionId: string) {
    const definition = DEFAULT_FIT_BUILDER_CATALOG.modules.find((entry) => entry.id === definitionId);
    if (!definition) return;
    const chargeId = definition.supportedChargeIds?.[0] ?? null;
    setState((current) => ({
      ...current,
      modules: [...current.modules, { instanceId: `${definitionId}-${crypto.randomUUID()}`, definitionId, chargeId }],
    }));
  }

  function addDrone(definitionId: string) {
    const existing = state.drones.find((entry) => entry.definitionId === definitionId);
    if (existing) {
      setState((current) => ({ ...current, drones: current.drones.map((entry) => entry.definitionId === definitionId ? { ...entry, quantityInBay: entry.quantityInBay + 1 } : entry) }));
      return;
    }
    setState((current) => ({ ...current, drones: [...current.drones, { definitionId, quantityInBay: 1, quantityActive: 0 }] }));
  }

  function importFit() {
    try {
      const next = importBuilderState(serialized);
      const checked = compileBuilderState(next);
      if (checked.errors.length) throw new Error(checked.errors.join("; "));
      setState(next);
      setIoError(null);
    } catch (error) {
      setIoError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className={styles.grid}>
      <section className={styles.panel}>
        <h2>Fit editor</h2>
        <div className={styles.row}>
          <label>Fit name <input className={styles.input} value={state.name} onChange={(event) => setState({ ...state, name: event.target.value })} /></label>
        </div>
        <div className={styles.row}>
          <label>Hull <select className={styles.select} value={state.hullId} onChange={(event) => setState({ ...state, hullId: event.target.value, modules: [], drones: [] })}>
            {DEFAULT_FIT_BUILDER_CATALOG.hulls.map((hull) => <option key={hull.id} value={hull.id}>{hull.name}</option>)}
          </select></label>
          <span className={styles.small}>Catalog entries are restricted to currently validated resolved-Dogma fixtures. Unsupported hulls are not guessed.</span>
        </div>

        <div className={styles.section}>
          <h3>Modules and rigs</h3>
          <div className={styles.row}>
            {DEFAULT_FIT_BUILDER_CATALOG.modules.map((definition) => <button className={styles.button} key={definition.id} onClick={() => addModule(definition.id)}>+ {definition.name}</button>)}
          </div>
          <div className={styles.cards}>
            {state.modules.length === 0 && <div className={styles.muted}>No modules fitted.</div>}
            {state.modules.map((selection) => {
              const definition = DEFAULT_FIT_BUILDER_CATALOG.modules.find((entry) => entry.id === selection.definitionId);
              return <article className={styles.card} key={selection.instanceId}>
                <div className={styles.row}><strong>{definition?.name ?? selection.definitionId}</strong><span className={styles.pill}>{definition?.slot ?? "unknown"}</span>
                  <button className={`${styles.button} ${styles.danger}`} onClick={() => setState({ ...state, modules: state.modules.filter((entry) => entry.instanceId !== selection.instanceId) })}>Remove</button>
                </div>
                {definition?.supportedChargeIds?.length ? <label>Charge <select className={styles.select} value={selection.chargeId ?? ""} onChange={(event) => setState({ ...state, modules: state.modules.map((entry) => entry.instanceId === selection.instanceId ? { ...entry, chargeId: event.target.value || null } : entry) })}>
                  <option value="">None</option>
                  {definition.supportedChargeIds.map((chargeId) => {
                    const charge = DEFAULT_FIT_BUILDER_CATALOG.charges.find((entry) => entry.id === chargeId);
                    return <option key={chargeId} value={chargeId}>{charge?.name ?? chargeId}</option>;
                  })}
                </select></label> : null}
                {definition?.note ? <p className={styles.warn}>{definition.note}</p> : null}
              </article>;
            })}
          </div>
        </div>

        <div className={styles.section}>
          <h3>Drones</h3>
          <div className={styles.row}>{DEFAULT_FIT_BUILDER_CATALOG.drones.map((drone) => <button className={styles.button} key={drone.id} onClick={() => addDrone(drone.id)}>+ {drone.name}</button>)}</div>
          {state.drones.map((selection) => <article className={styles.card} key={selection.definitionId}>
            <strong>{DEFAULT_FIT_BUILDER_CATALOG.drones.find((entry) => entry.id === selection.definitionId)?.name ?? selection.definitionId}</strong>
            <div className={styles.row}>
              <label>In bay <input className={styles.input} type="number" min={0} value={selection.quantityInBay} onChange={(event) => setState({ ...state, drones: state.drones.map((entry) => entry.definitionId === selection.definitionId ? { ...entry, quantityInBay: Number(event.target.value) } : entry) })} /></label>
              <label>Active <input className={styles.input} type="number" min={0} value={selection.quantityActive} onChange={(event) => setState({ ...state, drones: state.drones.map((entry) => entry.definitionId === selection.definitionId ? { ...entry, quantityActive: Number(event.target.value) } : entry) })} /></label>
              <button className={`${styles.button} ${styles.danger}`} onClick={() => setState({ ...state, drones: state.drones.filter((entry) => entry.definitionId !== selection.definitionId) })}>Remove</button>
            </div>
          </article>)}
        </div>

        <div className={styles.section}>
          <h3>Import / export</h3>
          <p className={styles.small}>This is a versioned NEC fit payload, not EFT/Pyfa text. NEC rejects unknown catalog IDs instead of pretending it understands them.</p>
          <textarea className={styles.textarea} value={serialized} onChange={(event) => setSerialized(event.target.value)} placeholder="Paste an NEC fit payload here" />
          <div className={styles.row}>
            <button className={styles.button} onClick={() => { setSerialized(exportBuilderState(state)); setIoError(null); }}>Export current fit</button>
            <button className={styles.button} onClick={importFit}>Import payload</button>
          </div>
          {ioError ? <p className={styles.bad}>{ioError}</p> : null}
        </div>
      </section>

      <aside className={styles.panel}>
        <h2>Live deterministic result</h2>
        {compiled.errors.length ? <ul className={`${styles.warnings} ${styles.bad}`}>{compiled.errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}
        {compiled.warnings.length ? <ul className={`${styles.warnings} ${styles.warn}`}>{compiled.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
        <p className={result?.fitValid === true ? styles.ok : result?.fitValid === false ? styles.bad : styles.warn}><strong>Fit validity:</strong> {result?.fitValid === true ? "Valid for modeled checks" : result?.fitValid === false ? "Invalid" : "Unknown"}</p>
        <div className={styles.metricGrid}>
          <div className={styles.metric}><span>CPU</span><strong>{fmt(result?.resources.cpuUsed)} / {fmt(result?.resources.cpuCapacity)}</strong></div>
          <div className={styles.metric}><span>Powergrid</span><strong>{fmt(result?.resources.powergridUsed)} / {fmt(result?.resources.powergridCapacity)}</strong></div>
          <div className={styles.metric}><span>Paper weapon DPS</span><strong>{fmt(result?.metrics.weaponDps)}</strong></div>
          <div className={styles.metric}><span>Drone DPS</span><strong>{fmt(result?.metrics.droneDps)}</strong></div>
          <div className={styles.metric}><span>EHP</span><strong>{fmt(result?.metrics.ehp)}</strong></div>
          <div className={styles.metric}><span>Speed</span><strong>{fmt(result?.metrics.maxVelocity, " m/s")}</strong></div>
          <div className={styles.metric}><span>Optimal</span><strong>{fmt(result?.metrics.optimalRange, " m")}</strong></div>
          <div className={styles.metric}><span>Falloff</span><strong>{fmt(result?.metrics.falloffRange, " m")}</strong></div>
          <div className={styles.metric}><span>Missile range</span><strong>{fmt(result?.metrics.missileRange, " m")}</strong></div>
          <div className={styles.metric}><span>Cap stable</span><strong>{typeof result?.metrics.capacitorStable === "number" ? `${Math.round(result.metrics.capacitorStable * 100)}%` : "Unknown"}</strong></div>
        </div>
        {result?.legality.issues.length ? <div className={styles.section}><h3>Legality issues</h3><ul className={`${styles.warnings} ${styles.bad}`}>{result.legality.issues.map((issue) => <li key={`${issue.code}-${issue.sourceId ?? "fit"}`}>{issue.summary}</li>)}</ul></div> : null}
        {result && Object.keys(result.unknownMetrics).length ? <div className={styles.section}><h3>Unknown metrics</h3><ul className={styles.warnings}>{Object.entries(result.unknownMetrics).map(([metric, reason]) => <li key={metric}><strong>{metric}</strong>: {reason}</li>)}</ul></div> : null}
        <p className={styles.small}>Validity covers only the FIT-02 modeled checks. It does not claim arbitrary Dogma effects, heat, implants, boosters, fleet effects, target application, live client state, or unsupported module semantics.</p>
      </aside>
    </div>
  );
}
