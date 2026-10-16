import { ORBIUM } from "./sim/creature"

/** Live rule. A creature's context fills the growth and kernel numbers. */
export interface LeniaParams {
	mu: number
	sigma: number
	dt: number
	radius: number
	/** Ring peak, in units of the kernel radius. */
	kernelMu: number
	/** Ring width, in units of the kernel radius. */
	kernelSigma: number
	/** CSS pixels covered by one cell. The field is stretched to fill the canvas. */
	resolution: number
	speed: number
	paused: boolean
}

/** Start from Orbium's rule. Resolution, speed, and pause are display choices. */
export function createLeniaParams(): LeniaParams {
	return {
		mu: ORBIUM.rule.mu,
		sigma: ORBIUM.rule.sigma,
		dt: ORBIUM.rule.dt,
		radius: ORBIUM.rule.radius,
		kernelMu: ORBIUM.rule.kernelMu,
		kernelSigma: ORBIUM.rule.kernelSigma,
		resolution: 4,
		speed: 1,
		paused: true,
	}
}
