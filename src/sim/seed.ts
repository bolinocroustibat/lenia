import type { Creature } from "./creature"

/** Stamp one creature onto an existing field. Position and facing are random. */
export function stampCreature(
	field: Float32Array,
	width: number,
	height: number,
	creature: Creature,
): void {
	const size = creature.cells.length
	const originX = Math.floor(Math.random() * width)
	const originY = Math.floor(Math.random() * height)
	const rotation = Math.floor(Math.random() * 4)
	const flip = Math.random() < 0.5

	for (let y = 0; y < size; y++) {
		const row = creature.cells[y]
		for (let x = 0; x < row.length; x++) {
			const level = row[x]
			if (level === 0) continue
			const [offsetX, offsetY] = orient(x, y, size, rotation, flip)
			const fieldX = (originX + offsetX) % width
			const fieldY = (originY + offsetY) % height
			field[fieldY * width + fieldX] = level / 255
		}
	}
}

/** Quarter-turns and an optional mirror. The kernel is round, so each facing still glides. */
function orient(
	x: number,
	y: number,
	size: number,
	rotation: number,
	flip: boolean,
): [number, number] {
	let sx = flip ? size - 1 - x : x
	let sy = y
	for (let turn = 0; turn < rotation; turn++) {
		const nextX = size - 1 - sy
		const nextY = sx
		sx = nextX
		sy = nextY
	}
	return [sx, sy]
}

/** A blank field with one creature. Each call picks a new position. */
export function seedField(
	width: number,
	height: number,
	creature: Creature,
): Float32Array {
	const field = new Float32Array(width * height)
	stampCreature(field, width, height, creature)
	return field
}
