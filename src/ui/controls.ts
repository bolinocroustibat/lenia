import { Pane } from "tweakpane"
import type { LeniaParams } from "../params"
import { MAX_KERNEL_RADIUS } from "../sim/kernel"

export interface LeniaControls {
	dispose: () => void
}

export function mountControls(
	params: LeniaParams,
	onClear: () => void,
	onReseed: () => void,
	onAddOrbium: () => void,
): LeniaControls {
	const pane = new Pane({ title: "Lenia", expanded: true })

	pane.addBinding(params, "mu", {
		label: "How full neighbors should be (μ)",
		min: 0,
		max: 1,
		step: 0.001,
	})
	pane.addBinding(params, "sigma", {
		label: "How wide that target is (σ)",
		min: 0.001,
		max: 0.5,
		step: 0.001,
	})
	pane.addBinding(params, "dt", {
		label: "How much each step changes (dt)",
		min: 0,
		max: 1,
		step: 0.01,
	})
	pane.addBinding(params, "radius", {
		label: "How far cells look (R)",
		min: 1,
		max: MAX_KERNEL_RADIUS,
		step: 1,
	})
	pane.addBinding(params, "resolution", {
		label: "Resolution",
		min: 2,
		max: 16,
		step: 1,
	})
	pane.addBinding(params, "speed", {
		label: "Steps / frame",
		min: 1,
		max: 20,
		step: 1,
	})

	const pauseButton = pane.addButton({
		title: params.paused ? "Play" : "Pause",
	})
	pauseButton.on("click", () => {
		params.paused = !params.paused
		pauseButton.title = params.paused ? "Play" : "Pause"
	})

	pane.addButton({ title: "Reset" }).on("click", onClear)

	pane.addButton({ title: "Randomize" }).on("click", onReseed)

	pane.addButton({ title: "Add Orbium" }).on("click", onAddOrbium)

	return {
		dispose: () => {
			pane.dispose()
		},
	}
}
