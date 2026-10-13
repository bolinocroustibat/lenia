/** Smooth disks on a torus, scaled by the kernel radius, so the field is visible. */
export function seedField(
	width: number,
	height: number,
	radius: number,
): Float32Array {
	const field = new Float32Array(width * height)
	const blobs: ReadonlyArray<readonly [number, number]> = Array.from(
		{ length: 4 },
		() => [Math.random(), Math.random()],
	)
	const spread = Math.max(radius * 0.55, 1)
	const spreadSq = 2 * spread * spread

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let value = 0
			for (const [bx, by] of blobs) {
				const dx = wrapDistance(x - bx * width, width)
				const dy = wrapDistance(y - by * height, height)
				value += Math.exp(-(dx * dx + dy * dy) / spreadSq)
			}
			field[y * width + x] = Math.min(1, value)
		}
	}
	return field
}

function wrapDistance(delta: number, size: number): number {
	const wrapped = Math.abs(delta) % size
	return Math.min(wrapped, size - wrapped)
}
