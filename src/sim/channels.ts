import type { LeniaParams } from "../params"
import { clampKernelRadius, MAX_SENSORS } from "./kernel"

/** One sensor: it reads one channel and adds growth into one channel. */
export interface Sensor {
	source: number
	dest: number
	mu: number
	sigma: number
	/** Raw strength. The live rule divides by the sum of strengths into `dest`. */
	strength: number
	/** Fraction of the genotype's base radius. */
	radiusFraction: number
	peaks: readonly number[]
}

/** Sensor after the radius is rounded and the strength is divided by its destination sum. */
export interface PreparedSensor {
	source: number
	dest: number
	mu: number
	sigma: number
	weight: number
	radius: number
	peaks: readonly number[]
}

/** Live multi-channel update. The step ignores the one-channel sliders while this is set. */
export interface ChannelRule {
	dt: number
	sensors: readonly PreparedSensor[]
}

/** Three row-major grids, values in 0..1, same width and height. */
export interface ChannelPattern {
	width: number
	height: number
	channels: readonly [Float32Array, Float32Array, Float32Array]
}

/** A three-channel pattern plus the sensors it was found under. */
export interface ChannelCreature {
	name: string
	dt: number
	radius: number
	sensors: readonly Sensor[]
	pattern: ChannelPattern
}

/** Copy a genotype onto the live rule. One-channel sliders stay as they are. */
export function applyChannelRule(
	params: LeniaParams,
	creature: ChannelCreature,
): void {
	params.channels = prepareChannelRule(creature)
}

/**
 * Absolute radii, and weights that sum to 1 on each destination channel.
 * Chan's update adds `dt · (strength / H_dest) · G`.
 */
export function prepareChannelRule(creature: ChannelCreature): ChannelRule {
	if (creature.sensors.length > MAX_SENSORS) {
		throw new Error(
			`${creature.name} has ${creature.sensors.length} sensors, limit is ${MAX_SENSORS}`,
		)
	}
	const totals = [0, 0, 0]
	for (const sensor of creature.sensors) {
		const total = totals[sensor.dest]
		if (total === undefined) {
			throw new Error(`Sensor destination ${sensor.dest} is outside 0..2`)
		}
		totals[sensor.dest] = total + sensor.strength
	}
	return {
		dt: creature.dt,
		sensors: creature.sensors.map((sensor) => {
			const total = totals[sensor.dest] ?? 0
			return {
				source: sensor.source,
				dest: sensor.dest,
				mu: sensor.mu,
				sigma: sensor.sigma,
				weight: total > 0 ? sensor.strength / total : 0,
				radius: clampKernelRadius(
					Math.round(sensor.radiusFraction * creature.radius),
				),
				peaks: sensor.peaks,
			}
		}),
	}
}
