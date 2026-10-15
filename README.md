# Lenia

Standalone TypeScript / WebGL2 project for a future Lenia simulation. It is not wired into the cellular automata app next to it.

`biome.json` sets `"root": false` so the formatter can live inside that app. Delete the field if you move this folder into its own repository.

## Run

```bash
bun install
bun run dev
```

## What is ready

The page creates a canvas, opens a WebGL2 context, and resizes the drawing buffer with the window. The simulation grid follows that window: one cell covers `resolution` CSS pixels (4 by default) and the field is stretched to fill the canvas. State stays in 32-bit float textures.

Shaders are compiled with `compileShader` and linked into programs. Each step reads one float texture and writes the other, then swaps them. That ping-pong is the same pattern used for Life on the GPU.

Tweakpane exposes μ, σ, dt, the kernel radius R, resolution, simulation speed, pause/play, and a reseed.

## What is left

The ring kernel is in place and the field starts as one Orbium creature. It keeps its published size, and Randomize moves that copy.

Kernels larger than the fragment-loop cap of 16 are later work. The review is in [PLAN.md](PLAN.md).
