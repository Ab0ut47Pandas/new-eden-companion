import type { DatabaseSync } from "node:sqlite";

import {
  resolveAcquisitionSources,
  type AcquisitionSourceResolution,
  type CuratedAcquisitionSource,
} from "../acquisition/source-boundaries";
import type { AbyssalTier } from "./abyssal-knowledge";

const CCP_ABYSSAL_HELP_URL = "https://support.eveonline.com/hc/en-us/articles/360000852629-Abyssal-Deadspace";
const CCP_DEPTHS_PATCH_URL = "https://www.eveonline.com/news/view/patch-notes-for-version-18-09";

function curatedSource(
  typeId: number,
  sourceKind: CuratedAcquisitionSource["sourceKind"],
  label: string,
  title: string,
  url: string,
  note: string,
): CuratedAcquisitionSource {
  return {
    typeId,
    sourceKind,
    label,
    evidence: {
      kind: "curated",
      authority: "CCP Games",
      title,
      url,
      note,
    },
  };
}

export function buildAbyssalFilamentCuratedSources(typeId: number, tier: AbyssalTier): CuratedAcquisitionSource[] {
  if (!Number.isInteger(typeId) || typeId <= 0) throw new TypeError("Abyssal filament typeId must be a positive integer.");

  const sources: CuratedAcquisitionSource[] = [
    curatedSource(
      typeId,
      "market",
      "Player market",
      "Abyssal Deadspace — EVE Online Help Center",
      CCP_ABYSSAL_HELP_URL,
      "CCP states that all Abyssal filaments can be traded on the market and obtained from other capsuleers.",
    ),
  ];

  if (tier === 0) {
    sources.push(
      curatedSource(
        typeId,
        "exploration",
        "Exploration sites",
        "Patch Notes for Version 18.09 — EVE Online",
        CCP_DEPTHS_PATCH_URL,
        "CCP documents Tranquil filaments as obtainable through exploration sites.",
      ),
      curatedSource(
        typeId,
        "loot-drop",
        "Tier 0 and Tier 1 Abyssal Deadspace",
        "Patch Notes for Version 18.09 — EVE Online",
        CCP_DEPTHS_PATCH_URL,
        "CCP documents Tranquil filaments as obtainable in Tier 0 and Tier 1 Abyssal Deadspace.",
      ),
    );
  } else if (tier === 1) {
    sources.push(
      curatedSource(
        typeId,
        "exploration",
        "Data Sites across New Eden",
        "Abyssal Deadspace — EVE Online Help Center",
        CCP_ABYSSAL_HELP_URL,
        "CCP states that Calm filaments can be found mainly in Data Sites across New Eden.",
      ),
      curatedSource(
        typeId,
        "loot-drop",
        "Abyssal Deadspace",
        "Abyssal Deadspace — EVE Online Help Center",
        CCP_ABYSSAL_HELP_URL,
        "CCP states that Calm filaments can also be found within the Abyss.",
      ),
    );
  } else if (tier === 6) {
    sources.push(
      curatedSource(
        typeId,
        "loot-drop",
        "Tier 5 Abyssal Deadspace",
        "Patch Notes for Version 18.09 — EVE Online",
        CCP_DEPTHS_PATCH_URL,
        "CCP documents Cataclysmic filaments as obtainable from Tier 5 Abyssal Deadspace.",
      ),
    );
  } else {
    sources.push(
      curatedSource(
        typeId,
        "loot-drop",
        "Abyssal Deadspace",
        "Abyssal Deadspace — EVE Online Help Center",
        CCP_ABYSSAL_HELP_URL,
        "CCP states that higher-difficulty filaments are found within Abyssal Deadspace.",
      ),
    );
  }

  return sources;
}

export function resolveAbyssalFilamentSources(
  db: DatabaseSync,
  input: { typeId: number; tier: AbyssalTier },
): AcquisitionSourceResolution {
  return resolveAcquisitionSources(db, input.typeId, buildAbyssalFilamentCuratedSources(input.typeId, input.tier));
}

export function resolveAbyssalConsumableSources(
  db: DatabaseSync,
  typeId: number,
  curatedSources: readonly CuratedAcquisitionSource[] = [],
): AcquisitionSourceResolution {
  return resolveAcquisitionSources(db, typeId, curatedSources);
}
