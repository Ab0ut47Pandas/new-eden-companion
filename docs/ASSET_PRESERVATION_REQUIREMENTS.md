# New Eden Companion — Asset Preservation Requirements

Asset cleanup must be evidence-first and conservative. The absence of an active goal is never positive evidence that an item is disposable.

## Intrinsic preservation

Before NEC may recommend selling an owned item, it must consider supported preservation evidence independent of active goals, including:

- ESI-visible blueprint state, research, and remaining runs;
- fitted, staged, allocated, or otherwise committed inventory state;
- evidence-backed reacquisition difficulty or limited/uncommon source boundaries;
- reliable market liquidity and practical replaceability when those data are actually available;
- user-protected items and other supported preservation signals.

Researched BPOs, useful BPCs, supported limited-source items, fitted/allocated inventory, and other evidence-backed hard-to-reacquire assets default to Keep or Review even when no active goal references them.

## Sell threshold

A Sell recommendation requires positive evidence that the item is reasonably disposable and replaceable, after goal use, stockpile use, allocation, intrinsic preservation, and uncertainty are cleared. A market price by itself is not enough.

Unknown rarity, source, blueprint state, liquidity, or replaceability must remain Review/Unknown. NEC must never silently convert missing evidence into permission to sell.

Player-facing reasons should stay compact where possible, for example:

- `Keep — researched blueprint`
- `Keep — hard to reacquire`
- `Stockpile — known use`
- `Review — rarity uncertain`
- `Review — replaceability uncertain`

## UI behavior

The cleanup view may group assets as Goal-critical, Keep, Use soon, Haul, Sell, or Review/Unknown, but every row must expose the evidence-backed reason. Haul requires a supported movement decision; it must not imply that a route or move is safe.
