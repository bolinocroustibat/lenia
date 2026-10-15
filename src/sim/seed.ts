/**
 * Orbium unicaudatus from Bert Chan's Lenia, in units of 1/255.
 * Native size for R = 13. It is not scaled when the radius slider moves.
 */
const ORBIUM_CELLS: readonly (readonly number[])[] = [
	[0, 0, 0, 0, 0, 0, 0, 13, 4, 0, 0, 0, 0, 0, 0, 60, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 35, 53, 54, 21, 18, 25, 26, 18, 1, 65, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 22, 68, 91, 98, 87, 48, 47, 44, 47, 45, 27, 89, 0, 0, 0],
	[0, 0, 0, 0, 3, 17, 89, 116, 119, 97, 33, 20, 14, 16, 31, 55, 180, 0, 0, 0],
	[0, 0, 0, 9, 33, 47, 87, 103, 98, 72, 34, 0, 0, 0, 0, 12, 102, 84, 0, 0],
	[1, 0, 4, 35, 43, 34, 28, 63, 69, 67, 53, 0, 0, 0, 0, 0, 5, 220, 0, 0],
	[60, 0, 26, 44, 20, 0, 0, 51, 79, 94, 95, 61, 0, 0, 0, 0, 0, 116, 40, 0],
	[0, 31, 47, 28, 0, 0, 0, 69, 109, 129, 137, 130, 0, 0, 0, 0, 0, 0, 132, 0],
	[0, 150, 55, 8, 0, 0, 0, 48, 135, 162, 174, 174, 107, 0, 0, 0, 0, 0, 109, 0],
	[0, 141, 60, 0, 0, 0, 0, 7, 158, 193, 214, 218, 206, 27, 0, 0, 0, 0, 72, 25],
	[0, 0, 152, 0, 0, 0, 0, 0, 170, 223, 245, 253, 248, 143, 0, 0, 0, 0, 57, 36],
	[0, 0, 214, 0, 0, 0, 0, 0, 129, 247, 255, 255, 255, 233, 71, 0, 0, 6, 56, 34],
	[0, 0, 141, 19, 0, 0, 0, 0, 85, 255, 255, 250, 255, 248, 142, 40, 13, 30, 62, 22],
	[0, 0, 8, 114, 0, 0, 0, 0, 45, 217, 255, 228, 220, 221, 166, 85, 50, 55, 59, 10],
	[0, 0, 0, 108, 29, 0, 0, 0, 29, 158, 224, 210, 199, 189, 156, 104, 75, 68, 42, 0],
	[0, 0, 0, 20, 85, 19, 0, 0, 30, 108, 172, 184, 173, 160, 134, 103, 79, 57, 16, 0],
	[0, 0, 0, 0, 42, 66, 38, 30, 44, 86, 127, 142, 139, 127, 109, 86, 62, 30, 0, 0],
	[0, 0, 0, 0, 0, 37, 59, 60, 66, 81, 99, 108, 105, 92, 78, 58, 32, 5, 0, 0],
	[0, 0, 0, 0, 0, 0, 18, 43, 58, 64, 70, 71, 66, 59, 42, 24, 5, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 15, 26, 33, 34, 30, 20, 11, 0, 0, 0, 0, 0],
]

/** Stamp one Orbium onto an existing field. Position and facing are random. */
export function stampOrbium(
	field: Float32Array,
	width: number,
	height: number,
): void {
	const size = ORBIUM_CELLS.length
	const originX = Math.floor(Math.random() * width)
	const originY = Math.floor(Math.random() * height)
	const rotation = Math.floor(Math.random() * 4)
	const flip = Math.random() < 0.5

	for (let y = 0; y < size; y++) {
		const row = ORBIUM_CELLS[y]
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

/** A blank field with one Orbium. Each call picks a new position. */
export function seedField(width: number, height: number): Float32Array {
	const field = new Float32Array(width * height)
	stampOrbium(field, width, height)
	return field
}
