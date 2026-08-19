export type ExplorationSiteKind = "anomaly" | "data" | "relic" | "gas" | "combat" | "wormhole" | "special";

export interface ExplorationSource {
  title: string;
  url: string;
  verifiedOn: string;
  supports: string[];
}

export interface ExplorationSiteGuide {
  kind: ExplorationSiteKind;
  label: string;
  scanRequirement: string;
  interaction: string;
  beginnerNote: string;
}

export interface ExplorationRiskBand {
  id: "highsec" | "lowsec" | "nullsec" | "wormhole";
  label: string;
  guidance: string;
}

export const EXPLORATION_SOURCES: ExplorationSource[] = [
  {
    title: "EVE Online Help Center - Scanning",
    url: "https://support.eveonline.com/hc/en-us/articles/203209902-Scanning",
    verifiedOn: "2026-08-20",
    supports: [
      "cosmic anomalies are warpable without probes",
      "cosmic signatures require Core Scanner Probes before they can be warped to",
      "probe supply and recovery limitations",
    ],
  },
  {
    title: "EVE Academy - Explorer",
    url: "https://www.eveonline.com/eve-academy/careers/explorer",
    verifiedOn: "2026-08-20",
    supports: [
      "Core Probe Launcher and eight Core Scanner Probes as the basic scanning setup",
      "Data and Relic Analyzers for their matching hacking sites",
      "basic hacking minigame objective",
    ],
  },
  {
    title: "EVE Online Help Center - Datacores",
    url: "https://support.eveonline.com/hc/en-us/articles/203210652-Datacores",
    verifiedOn: "2026-08-20",
    supports: [
      "datacores can appear in Data Site hacking containers",
      "some subsystem-engineering datacores come from wormhole Data and Relic sites",
    ],
  },
  {
    title: "EVE Academy - Ghost Sites",
    url: "https://www.eveonline.com/eve-academy/careers/explorer/ghost-sites",
    verifiedOn: "2026-08-20",
    supports: [
      "some exploration signatures have special timers, hostile NPCs, or explosive failure states",
    ],
  },
];

export const EXPLORATION_SITE_GUIDES: ExplorationSiteGuide[] = [
  {
    kind: "anomaly",
    label: "Cosmic anomaly",
    scanRequirement: "No probes required once it appears in the Probe Scanner.",
    interaction: "Warp directly after checking what kind of anomaly it is.",
    beginnerNote: "Anomaly does not mean safe or non-combat. Read the site type before warping.",
  },
  {
    kind: "data",
    label: "Data site",
    scanRequirement: "Resolve the cosmic signature with Core Scanner Probes.",
    interaction: "Use a Data Analyzer on compatible containers.",
    beginnerNote: "Standard hacking sites can contain industry-related loot such as datacores, but special/event sites may add combat or other mechanics.",
  },
  {
    kind: "relic",
    label: "Relic site",
    scanRequirement: "Resolve the cosmic signature with Core Scanner Probes.",
    interaction: "Use a Relic Analyzer on compatible containers.",
    beginnerNote: "Treat unfamiliar relic-site loot as Review until NEC can establish source, rarity, use, and replaceability.",
  },
  {
    kind: "gas",
    label: "Gas site",
    scanRequirement: "Resolve the cosmic signature with probes before warping.",
    interaction: "Gas harvesting is a separate activity and may require different equipment and risk preparation.",
    beginnerNote: "This beginner slice identifies the site but does not claim you are ready to harvest it.",
  },
  {
    kind: "combat",
    label: "Combat signature",
    scanRequirement: "Resolve the signature before warping when it appears as a cosmic signature.",
    interaction: "Combat readiness is separate from scanning readiness.",
    beginnerNote: "Do not treat an exploration frigate as combat-ready merely because it can scan the site down.",
  },
  {
    kind: "wormhole",
    label: "Wormhole signature",
    scanRequirement: "Resolve the signature with probes before warping.",
    interaction: "A wormhole is a connection, not a loot container.",
    beginnerNote: "Keep enough probes to scan your way out. NEC does not know the live wormhole chain or guarantee an exit route.",
  },
  {
    kind: "special",
    label: "Special / unfamiliar signature",
    scanRequirement: "Scan it first, then identify the site before committing the ship.",
    interaction: "Mechanics vary by site and event.",
    beginnerNote: "Some sites have timers, hostile NPCs, suspect effects, mines, explosions, or other special rules. Unknown means stop and check, not guess.",
  },
];

export const EXPLORATION_RISK_BANDS: ExplorationRiskBand[] = [
  {
    id: "highsec",
    label: "High security",
    guidance: "Good for learning the scanning and hacking loop, but player interference and dangerous special sites are still possible. Highsec is not a safety guarantee.",
  },
  {
    id: "lowsec",
    label: "Low security",
    guidance: "Expect materially greater player threat. Watch local, directional scan, overview, and your escape options manually; NEC cannot see live threats for you.",
  },
  {
    id: "nullsec",
    label: "Null security",
    guidance: "Assume hostile player interaction is possible and plan exits before committing to a hack. NEC does not produce a gank probability or safe-route claim.",
  },
  {
    id: "wormhole",
    label: "Wormhole space",
    guidance: "No normal local-chat awareness model should be assumed. Maintain probe capability and an exit plan; NEC cannot observe the live chain, polarization, occupants, or hidden ships.",
  },
];

export const EXPLORATION_PREP = [
  "Fit a Core Probe Launcher.",
  "Carry at least eight Core Scanner Probes; carrying spares is prudent because probe loss or isolation can leave you unable to scan an exit.",
  "Fit a Data Analyzer if you plan to run Data sites.",
  "Fit a Relic Analyzer if you plan to run Relic sites.",
  "Bring both analyzers if you want one trip to handle either standard hacking-site type.",
  "Before leaving a system, confirm your probes are recovered or otherwise available for the next scan.",
] as const;

export const EXPLORATION_FIRST_RUN = [
  "Open the Probe Scanner and look at anomalies and cosmic signatures in the current system.",
  "If you choose a cosmic signature, launch Core Scanner Probes and move/shrink the formation until the signature resolves to 100%.",
  "Identify the resolved site type before warping. If it is not a standard Data or Relic site, stop and check its mechanics instead of assuming the exploration frigate is appropriate.",
  "Warp to a standard Data or Relic site only after choosing the matching analyzer and checking your escape plan.",
  "Approach a compatible container, activate the correct analyzer, and complete the hacking minigame by reaching and defeating the System Core.",
  "Loot the successful container, then reassess local conditions manually before committing to the next container.",
  "When finished, recover probes, leave deliberately, and review unfamiliar loot before selling it.",
] as const;

export const EXPLORATION_LOOT_GUIDANCE = [
  {
    label: "Datacores",
    disposition: "Review / possible industry use",
    reason: "CCP documents datacores as invention inputs and confirms they can appear in Data Site hacking containers. Do not auto-sell them just because they have a market price.",
  },
  {
    label: "Blueprints, decryptors, components, salvage, or unfamiliar items",
    disposition: "Review",
    reason: "Use NEC item identity, acquisition, and reverse-use tools before deciding. Unknown rarity, source, use, or replaceability is not evidence to sell.",
  },
  {
    label: "Known liquid loot with no preservation evidence",
    disposition: "Sell only with positive evidence",
    reason: "A sell recommendation still requires the normal NEC asset-preservation and market-liquidity checks.",
  },
] as const;

export function validateExplorationGuide(): void {
  const kinds = new Set(EXPLORATION_SITE_GUIDES.map((site) => site.kind));
  for (const required of ["anomaly", "data", "relic", "gas", "combat", "wormhole", "special"] satisfies ExplorationSiteKind[]) {
    if (!kinds.has(required)) throw new Error(`Missing exploration site guide: ${required}`);
  }
  if (EXPLORATION_PREP.length < 4) throw new Error("Exploration preparation is incomplete");
  if (EXPLORATION_FIRST_RUN.length < 5) throw new Error("Exploration first-run flow is incomplete");
  if (EXPLORATION_LOOT_GUIDANCE.length < 2) throw new Error("Exploration loot guidance is incomplete");
  for (const source of EXPLORATION_SOURCES) {
    if (!source.url.startsWith("https://")) throw new Error(`Invalid exploration source URL: ${source.title}`);
    if (source.supports.length === 0) throw new Error(`Exploration source has no supported claims: ${source.title}`);
  }
}
