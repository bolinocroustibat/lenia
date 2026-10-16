/** Largest radius the fragment loop can sample. The R slider stops here. */
export const MAX_KERNEL_RADIUS = 16

/** Integer radius inside the shader's loop bound. */
export function clampKernelRadius(radius: number): number {
	return Math.min(MAX_KERNEL_RADIUS, Math.max(1, Math.round(radius)))
}

/**
 * Normalized ring on a (2R+1) square.
 * Weight is the Gaussian shell for r ≤ 1 and 0 outside, then divided by the sum.
 * Peaks come from the active creature's rule.
 * Texel (dx + R, dy + R) is the weight for offset (dx, dy).
 */
export function buildRingKernel(
	radius: number,
	kernelMu: number,
	kernelSigma: number,
): Float32Array {
	const kernelRadius = clampKernelRadius(radius)
	const size = kernelRadius * 2 + 1
	const weights = new Float32Array(size * size)
	let sum = 0

	for (let y = -kernelRadius; y <= kernelRadius; y++) {
		for (let x = -kernelRadius; x <= kernelRadius; x++) {
			const distance = Math.hypot(x, y) / kernelRadius
			const weight =
				distance <= 1 ? ringWeight(distance, kernelMu, kernelSigma) : 0
			weights[(y + kernelRadius) * size + (x + kernelRadius)] = weight
			sum += weight
		}
	}

	if (sum <= 0) throw new Error("Ring kernel has no weight")

	let normalized = 0
	for (let i = 0; i < weights.length; i++) {
		weights[i] /= sum
		normalized += weights[i]
	}
	if (Math.abs(normalized - 1) > 1e-4) {
		throw new Error("Ring kernel weights do not sum to 1")
	}
	return weights
}

function ringWeight(
	distance: number,
	kernelMu: number,
	kernelSigma: number,
): number {
	const x = (distance - kernelMu) / kernelSigma
	return Math.exp(-0.5 * x * x)
}
