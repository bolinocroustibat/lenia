import type { LeniaParams } from "../params"

/** The numbers that make a pattern live. One field can run only one of these at a time. */
export interface RuleContext {
	mu: number
	sigma: number
	dt: number
	radius: number
	/** Ring peak, in units of the kernel radius. */
	kernelMu: number
	/** Ring width, in units of the kernel radius. */
	kernelSigma: number
}

/** A pattern plus the rule it was found under. Cells are 1/255 levels. */
export interface Creature {
	name: string
	cells: readonly (readonly number[])[]
	rule: RuleContext
}

/**
 * Orbium unicaudatus from Bert Chan's Lenia.
 * The patch stays at its native size for R = 13.
 */
export const ORBIUM: Creature = {
	name: "Orbium",
	rule: {
		mu: 0.15,
		sigma: 0.015,
		dt: 0.1,
		radius: 13,
		kernelMu: 0.5,
		kernelSigma: 0.15,
	},
	cells: [
		[0, 0, 0, 0, 0, 0, 0, 13, 4, 0, 0, 0, 0, 0, 0, 60, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 35, 53, 54, 21, 18, 25, 26, 18, 1, 65, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 22, 68, 91, 98, 87, 48, 47, 44, 47, 45, 27, 89, 0, 0, 0],
		[0, 0, 0, 0, 3, 17, 89, 116, 119, 97, 33, 20, 14, 16, 31, 55, 180, 0, 0, 0],
		[0, 0, 0, 9, 33, 47, 87, 103, 98, 72, 34, 0, 0, 0, 0, 12, 102, 84, 0, 0],
		[1, 0, 4, 35, 43, 34, 28, 63, 69, 67, 53, 0, 0, 0, 0, 0, 5, 220, 0, 0],
		[60, 0, 26, 44, 20, 0, 0, 51, 79, 94, 95, 61, 0, 0, 0, 0, 0, 116, 40, 0],
		[0, 31, 47, 28, 0, 0, 0, 69, 109, 129, 137, 130, 0, 0, 0, 0, 0, 132, 0],
		[
			0, 150, 55, 8, 0, 0, 0, 48, 135, 162, 174, 174, 107, 0, 0, 0, 0, 0, 109,
			0,
		],
		[
			0, 141, 60, 0, 0, 0, 0, 7, 158, 193, 214, 218, 206, 27, 0, 0, 0, 0, 72,
			25,
		],
		[
			0, 0, 152, 0, 0, 0, 0, 0, 170, 223, 245, 253, 248, 143, 0, 0, 0, 0, 57,
			36,
		],
		[
			0, 0, 214, 0, 0, 0, 0, 0, 129, 247, 255, 255, 255, 233, 71, 0, 0, 6, 56,
			34,
		],
		[
			0, 0, 141, 19, 0, 0, 0, 0, 85, 255, 255, 250, 255, 248, 142, 40, 13, 30,
			62, 22,
		],
		[
			0, 0, 8, 114, 0, 0, 0, 0, 45, 217, 255, 228, 220, 221, 166, 85, 50, 55,
			59, 10,
		],
		[
			0, 0, 0, 108, 29, 0, 0, 0, 29, 158, 224, 210, 199, 189, 156, 104, 75, 68,
			42, 0,
		],
		[
			0, 0, 0, 20, 85, 19, 0, 0, 30, 108, 172, 184, 173, 160, 134, 103, 79, 57,
			16, 0,
		],
		[
			0, 0, 0, 0, 42, 66, 38, 30, 44, 86, 127, 142, 139, 127, 109, 86, 62, 30,
			0, 0,
		],
		[0, 0, 0, 0, 0, 37, 59, 60, 66, 81, 99, 108, 105, 92, 78, 58, 32, 5, 0, 0],
		[0, 0, 0, 0, 0, 0, 18, 43, 58, 64, 70, 71, 66, 59, 42, 24, 5, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 15, 26, 33, 34, 30, 20, 11, 0, 0, 0, 0, 0],
	],
}

/**
 * Circium ventilans from Bert Chan's Lenia.
 * Several named animals share this rule. The patch stays at its native size for R = 13.
 */
export const CIRCIUM: Creature = {
	name: "Circium ventilans",
	rule: {
		mu: 0.38,
		sigma: 0.07,
		dt: 0.1,
		radius: 13,
		kernelMu: 0.5,
		kernelSigma: 0.15,
	},
	cells: [
		[0, 0, 0, 0, 0, 0, 0, 12, 17, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 33, 124, 247, 249, 249, 249, 155, 66, 0, 0, 0, 0],
		[0, 0, 0, 94, 249, 255, 255, 255, 255, 255, 255, 252, 137, 0, 0, 0],
		[0, 0, 94, 252, 255, 255, 255, 255, 255, 255, 255, 255, 255, 150, 0, 0],
		[0, 33, 249, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 252, 94, 0],
		[
			0, 124, 255, 255, 255, 255, 255, 186, 173, 224, 255, 255, 255, 255, 247,
			0,
		],
		[0, 247, 255, 255, 255, 255, 124, 61, 53, 96, 206, 255, 255, 255, 252, 45],
		[12, 249, 255, 255, 255, 186, 61, 12, 5, 40, 137, 255, 255, 255, 255, 76],
		[17, 249, 255, 255, 255, 173, 53, 5, 0, 33, 130, 255, 255, 255, 255, 79],
		[0, 249, 255, 255, 255, 224, 96, 40, 33, 73, 183, 255, 255, 255, 252, 53],
		[
			0, 155, 255, 255, 255, 255, 206, 137, 130, 183, 255, 255, 255, 255, 247,
			7,
		],
		[0, 66, 252, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 119, 0],
		[0, 0, 137, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 244, 12, 0],
		[0, 0, 0, 150, 252, 255, 255, 255, 255, 255, 255, 255, 244, 38, 0, 0],
		[0, 0, 0, 0, 94, 247, 252, 255, 255, 252, 247, 119, 12, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 45, 76, 79, 53, 7, 0, 0, 0, 0, 0],
	],
}

/** Copy a creature's rule onto the live simulation. Sliders for resolution and speed stay. */
export function applyCreatureRule(
	params: LeniaParams,
	creature: Creature,
): void {
	params.mu = creature.rule.mu
	params.sigma = creature.rule.sigma
	params.dt = creature.rule.dt
	params.radius = creature.rule.radius
	params.kernelMu = creature.rule.kernelMu
	params.kernelSigma = creature.rule.kernelSigma
}
