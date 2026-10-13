/** Orbium starting point from Bert Chan's Lenia: μ, σ, dt = 1/T, R. */
export interface LeniaParams {
	mu: number
	sigma: number
	dt: number
	radius: number
	/** CSS pixels covered by one cell. The field is stretched to fill the canvas. */
	resolution: number
	speed: number
	paused: boolean
}

export function createLeniaParams(): LeniaParams {
	return {
		mu: 0.15,
		sigma: 0.015,
		dt: 0.1,
		radius: 13,
		resolution: 4,
		speed: 1,
		paused: false,
	}
}
