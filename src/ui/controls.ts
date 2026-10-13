import { Pane } from "tweakpane"
import { createLeniaParams, type LeniaParams } from "../params"
import { MAX_KERNEL_RADIUS } from "../sim/kernel"

export interface LeniaControls {
	dispose: () => void
}

export function mountControls(
	params: LeniaParams,
	onReseed: () => void,
): LeniaControls {
	const pane = new Pane({ title: "Lenia", expanded: true })

	pane.addBinding(params, "mu", {
		label: "μ",
		min: 0,
		max: 1,
		step: 0.001,
	})
	pane.addBinding(params, "sigma", {
		label: "σ",
		min: 0.001,
		max: 0.5,
		step: 0.001,
	})
	pane.addBinding(params, "dt", {
		label: "dt",
		min: 0,
		max: 1,
		step: 0.01,
	})
	pane.addBinding(params, "radius", {
		label: "R",
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

	pane.addButton({ title: "Reset" }).on("click", () => {
		Object.assign(params, createLeniaParams())
		pauseButton.title = params.paused ? "Play" : "Pause"
		pane.refresh()
		onReseed()
	})

	pane.addButton({ title: "Randomize" }).on("click", onReseed)

	return {
		dispose: () => {
			pane.dispose()
		},
	}
}
