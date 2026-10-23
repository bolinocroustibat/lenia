# AGENTS.md

Notes for working in this repo. Keep them accurate; delete anything that stops being true.

## What this is

A standalone TypeScript / WebGL2 Lenia simulation. The field lives in RGBA32F
textures and advances with a ping-pong step (read one texture, write the other,
swap). The red channel can run a one-channel creature, or all three channels can
run a multi-channel rule.

## Tooling

This folder uses **Bun** and **Biome**, not the generic Python workflow.
- `bun install`
- `bun run dev` (Vite dev server)
- `bun run build` (Vite production build; this is the source-of-truth gate)
- `bun run check` (Biome format + lint, writes fixes)

Do not use `uv` or `python` here.

## Known noise

`tsc --noEmit` reports errors like `addFolder` / `addBinding` / `addButton` /
`refresh` "does not exist on type 'Pane'". This is a `typescript@7.0.2`
(native-port preview) type-resolution issue with tweakpane, not a real bug.
Trust `bun run build`, which passes.

## The simulation rule

One-channel step (`SIM_FRAG` in [src/sim/glsl.ts](src/sim/glsl.ts)):

`A <- clip(A + dt * G(K * A), 0, 1)`

Multi-channel step (`CHANNEL_FRAG`), used when `params.channels` is set:

`A_dest <- clip(A_dest + dt * sum_sensors (h / H_dest) * G(K * A_source), 0, 1)`
- `prepareChannelRule` in [src/sim/channels.ts](src/sim/channels.ts) sets each
  sensor's `weight = strength / H_dest`, where `H_dest` is the sum of strengths
  writing into that destination channel.
- Polynomial growth: `2 * max(0, 1 - x^2 / 9)^4 - 1`, with `x = (potential - mu) / sigma`.
- Polynomial ring kernel core: `(4 f (1 - f))^4` per ring (`buildRingShell`).
- Each sensor kernel is normalized to sum 1 on its own, then weighted by `h / H_dest`.

The channel convolution loops over each sensor's own `radius` (not a fixed cap),
so cost scales with the actual kernels, not `MAX_KERNEL_RADIUS`.

## Limits

In [src/sim/kernel.ts](src/sim/kernel.ts):
- `MAX_SENSORS = 15` (uniform array size and shader loop bound).
- `MAX_KERNEL_RADIUS = 20` (R slider cap and kernel-loop bound for `SIM_FRAG`).

## Rule switching

- `applyCreatureRule` ([src/sim/creature.ts](src/sim/creature.ts)) sets the
  one-channel params and clears `params.channels` (back to the color ramp).
- `applyChannelRule` ([src/sim/channels.ts](src/sim/channels.ts)) sets
  `params.channels` (the rule). Display uses raw RGB when `params.channels` is set.

## Creature data

- Three-channel Aquarium presets: [src/sim/aquarium.ts](src/sim/aquarium.ts).
- Two-channel solitons: [src/sim/solitons.ts](src/sim/solitons.ts). This file is
  **generated** by [scripts/decode-222.ts](scripts/decode-222.ts) from Bert Chan's
  `222.json`; do not hand-edit it. Only the genotypes that survive Play get a
  button in [src/ui/controls.ts](src/ui/controls.ts).
