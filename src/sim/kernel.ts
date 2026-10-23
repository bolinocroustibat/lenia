/** Largest radius the fragment loop can sample. The R slider stops here. */
export const MAX_KERNEL_RADIUS = 20

/** Sensors the multi-channel shader can apply in one step. */
export const MAX_SENSORS = 15

/** How G maps the neighborhood sum into a change. */
export type GrowthKind = "gaussian" | "polynomial"

/** One Gaussian ring, or several polynomial rings with the given heights. */
export type KernelSpec =
	| { kind: "gaussian"; mu: number; sigma: number }
	| { kind: "polynomialRings"; peaks: readonly number[] }

/** Integer radius inside the shader's loop bound. */
export function clampKernelRadius(radius: number): number {
	return Math.min(MAX_KERNEL_RADIUS, Math.max(1, Math.round(radius)))
}

/** Stable identity for the uploaded kernel texture. */
export function kernelCacheKey(radius: number, kernel: KernelSpec): string {
	if (kernel.kind === "gaussian") {
		return `gaussian:${radius}:${kernel.mu}:${kernel.sigma}`
	}
	return `polynomial:${radius}:${kernel.peaks.join(",")}`
}

/** Weights for the active rule, normalized so they sum to 1. */
export function kernelWeights(
	radius: number,
	kernel: KernelSpec,
): Float32Array {
	if (kernel.kind === "gaussian") {
		return buildRingKernel(radius, kernel.mu, kernel.sigma)
	}
	return buildRingShell(radius, kernel.peaks)
}

/**
 * Normalized ring on a (2R+1) square.
 * Weight is the Gaussian shell for r ≤ 1 and 0 outside, then divided by the sum.
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

	return normalizeKernel(weights, sum)
}

/**
 * Concentric polynomial rings on a (2R+1) square.
 * Ring i covers r in [i/B, (i+1)/B) at height peaks[i], with core (4f(1-f))^4.
 * Weight is 0 for r ≥ 1, then the disk is divided so the weights sum to 1.
 */
export function buildRingShell(
	radius: number,
	peaks: readonly number[],
): Float32Array {
	if (peaks.length === 0) throw new Error("Ring shell has no peaks")
	const kernelRadius = clampKernelRadius(radius)
	const size = kernelRadius * 2 + 1
	const weights = new Float32Array(size * size)
	let sum = 0

	for (let y = -kernelRadius; y <= kernelRadius; y++) {
		for (let x = -kernelRadius; x <= kernelRadius; x++) {
			const distance = Math.hypot(x, y) / kernelRadius
			const weight = distance < 1 ? shellWeight(distance, peaks) : 0
			weights[(y + kernelRadius) * size + (x + kernelRadius)] = weight
			sum += weight
		}
	}

	return normalizeKernel(weights, sum)
}

function ringWeight(
	distance: number,
	kernelMu: number,
	kernelSigma: number,
): number {
	const x = (distance - kernelMu) / kernelSigma
	return Math.exp(-0.5 * x * x)
}

/** Polynomial core copied into each ring, scaled by that ring's height. */
function shellWeight(distance: number, peaks: readonly number[]): number {
	const scaled = peaks.length * distance
	const index = Math.min(Math.floor(scaled), peaks.length - 1)
	const fraction = Math.min(scaled % 1, 1)
	const core = 4 * fraction * (1 - fraction)
	return (peaks[index] ?? 0) * core ** 4
}

/**
 * One normalized ring per sensor, centered in a shared square.
 * Texel (dx + atlasRadius, dy + atlasRadius) on layer k is the weight for offset (dx, dy).
 */
export function packSensorKernels(
	sensors: readonly { radius: number; peaks: readonly number[] }[],
): { atlasRadius: number; weights: Float32Array } {
	if (sensors.length === 0) throw new Error("Sensor list is empty")
	if (sensors.length > MAX_SENSORS) {
		throw new Error(
			`Sensor list has ${sensors.length}, limit is ${MAX_SENSORS}`,
		)
	}
	const atlasRadius = sensors.reduce(
		(max, sensor) => Math.max(max, clampKernelRadius(sensor.radius)),
		1,
	)
	const size = atlasRadius * 2 + 1
	const weights = new Float32Array(size * size * sensors.length)

	sensors.forEach((sensor, layer) => {
		const kernelRadius = clampKernelRadius(sensor.radius)
		const kernel = buildRingShell(kernelRadius, sensor.peaks)
		const kernelSize = kernelRadius * 2 + 1
		const offset = atlasRadius - kernelRadius
		const base = layer * size * size
		for (let y = 0; y < kernelSize; y++) {
			for (let x = 0; x < kernelSize; x++) {
				const atlasX = x + offset
				const atlasY = y + offset
				weights[base + atlasY * size + atlasX] = kernel[y * kernelSize + x] ?? 0
			}
		}
	})

	return { atlasRadius, weights }
}

function normalizeKernel(weights: Float32Array, sum: number): Float32Array {
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
