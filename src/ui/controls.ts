import { Pane } from "tweakpane"
import type { LeniaParams } from "../params"
import {
	applyCreatureRule,
	CIRCIUM,
	type Creature,
	DECAPTERYX,
	HEPTAPTERYX,
	HEXAPTERYX,
	HYDROGEMINIUM,
	NONAPTERYX,
	OCTAPTERYX,
	ORBIUM,
	TETRACOSAPTERYX,
} from "../sim/creature"
import { type KernelSpec, MAX_KERNEL_RADIUS } from "../sim/kernel"

export interface LeniaControls {
	dispose: () => void
}

export function mountControls(
	params: LeniaParams,
	onClear: () => void,
	onRandomize: () => void,
	onAddCreature: (creature: Creature) => void,
): LeniaControls {
	const pane = new Pane({ title: "Lenia", expanded: true })

	const rules = pane.addFolder({
		title: "Advanced",
		expanded: false,
	})
	rules.addBinding(params, "mu", {
		label: "How full neighbors should be (μ)",
		min: 0,
		max: 1,
		step: 0.001,
	})
	rules.addBinding(params, "sigma", {
		label: "How wide that target is (σ)",
		min: 0.001,
		max: 0.5,
		step: 0.001,
	})
	rules.addBinding(params, "dt", {
		label: "How much each step changes (dt)",
		min: 0,
		max: 1,
		step: 0.01,
	})
	rules.addBinding(params, "radius", {
		label: "How far cells look (R)",
		min: 1,
		max: MAX_KERNEL_RADIUS,
		step: 1,
	})
	pane.addBinding(params, "resolution", {
		label: "Resolution",
		min: 1,
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

	pane.addButton({ title: "Reset to empty" }).on("click", onClear)

	pane.addButton({ title: "Reset to random cells" }).on("click", onRandomize)

	const place = (creature: Creature) => {
		applyCreatureRule(params, creature)
		pane.refresh()
		onAddCreature(creature)
	}

	const orbiumRule = pane.addFolder({
		title: `Rule μ ${ORBIUM.rule.mu}, σ ${ORBIUM.rule.sigma}`,
		expanded: true,
	})
	orbiumRule.addButton({ title: "Add Orbium" }).on("click", () => place(ORBIUM))

	const sharedRule = pane.addFolder({
		title: `Rule μ ${CIRCIUM.rule.mu}, σ ${CIRCIUM.rule.sigma}`,
		expanded: true,
	})
	for (const creature of [
		CIRCIUM,
		HEXAPTERYX,
		HEPTAPTERYX,
		OCTAPTERYX,
		NONAPTERYX,
		DECAPTERYX,
		TETRACOSAPTERYX,
	]) {
		sharedRule.addButton({ title: `Add ${creature.name}` }).on("click", () => {
			place(creature)
		})
	}

	const hydroRule = pane.addFolder({
		title: `Rule μ ${HYDROGEMINIUM.rule.mu}, σ ${HYDROGEMINIUM.rule.sigma}, heights ${ringHeights(HYDROGEMINIUM.rule.kernel)}`,
		expanded: true,
	})
	hydroRule
		.addButton({ title: "Add Hydrogeminium natans" })
		.on("click", () => place(HYDROGEMINIUM))

	return {
		dispose: () => {
			pane.dispose()
		},
	}
}

/** Heights of a polynomial ring kernel, as short fractions. */
function ringHeights(kernel: KernelSpec): string {
	if (kernel.kind !== "polynomialRings") return ""
	return kernel.peaks.map(formatHeight).join(", ")
}

function formatHeight(peak: number): string {
	if (Math.abs(peak - 1) < 1e-6) return "1"
	for (let denominator = 2; denominator <= 12; denominator++) {
		const numerator = Math.round(peak * denominator)
		if (Math.abs(numerator / denominator - peak) < 1e-6) {
			return `${numerator}/${denominator}`
		}
	}
	return String(peak)
}
