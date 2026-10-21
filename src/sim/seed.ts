import { FIELD_CHANNELS, fieldLength } from "../gl/pingPong"
import type { ChannelPattern } from "./channels"
import type { Creature } from "./creature"

/** Stamp one creature onto the red channel. Position and facing are random. */
export function stampCreature(
	field: Float32Array,
	width: number,
	height: number,
	creature: Creature,
): void {
	const patternHeight = creature.cells.length
	const patternWidth = creature.cells[0]?.length ?? 0
	const originX = Math.floor(Math.random() * width)
	const originY = Math.floor(Math.random() * height)
	const rotation = Math.floor(Math.random() * 4)
	const flip = Math.random() < 0.5

	for (let y = 0; y < patternHeight; y++) {
		const row = creature.cells[y]
		for (let x = 0; x < row.length; x++) {
			const level = row[x]
			if (level === 0) continue
			const [offsetX, offsetY] = orient(
				x,
				y,
				patternWidth,
				patternHeight,
				rotation,
				flip,
			)
			const fieldX = (originX + offsetX) % width
			const fieldY = (originY + offsetY) % height
			field[(fieldY * width + fieldX) * FIELD_CHANNELS] = level / 255
		}
	}
}

/** Stamp a three-channel pattern. A cell is skipped only when every channel is empty. */
export function stampChannels(
	field: Float32Array,
	width: number,
	height: number,
	pattern: ChannelPattern,
): void {
	const originX = Math.floor(Math.random() * width)
	const originY = Math.floor(Math.random() * height)
	const rotation = Math.floor(Math.random() * 4)
	const flip = Math.random() < 0.5
	const [red, green, blue] = pattern.channels

	for (let y = 0; y < pattern.height; y++) {
		for (let x = 0; x < pattern.width; x++) {
			const source = y * pattern.width + x
			const channels = [red[source] ?? 0, green[source] ?? 0, blue[source] ?? 0]
			if (channels.every((value) => value === 0)) continue
			const [offsetX, offsetY] = orient(
				x,
				y,
				pattern.width,
				pattern.height,
				rotation,
				flip,
			)
			const fieldX = (originX + offsetX) % width
			const fieldY = (originY + offsetY) % height
			const index = (fieldY * width + fieldX) * FIELD_CHANNELS
			field[index] = channels[0] ?? 0
			field[index + 1] = channels[1] ?? 0
			field[index + 2] = channels[2] ?? 0
		}
	}
}

/** Quarter-turns and an optional mirror. The kernel is round, so each facing still glides. */
function orient(
	x: number,
	y: number,
	patternWidth: number,
	patternHeight: number,
	rotation: number,
	flip: boolean,
): [number, number] {
	let width = patternWidth
	let height = patternHeight
	let sx = flip ? width - 1 - x : x
	let sy = y
	for (let turn = 0; turn < rotation; turn++) {
		const nextX = height - 1 - sy
		const nextY = sx
		sx = nextX
		sy = nextY
		const nextWidth = height
		height = width
		width = nextWidth
	}
	return [sx, sy]
}

/** A blank field with one creature. Each call picks a new position. */
export function seedField(
	width: number,
	height: number,
	creature: Creature,
): Float32Array {
	const field = new Float32Array(fieldLength(width, height))
	stampCreature(field, width, height, creature)
	return field
}
