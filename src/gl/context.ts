export function mountCanvas(
	parent: ParentNode = document.body,
): HTMLCanvasElement {
	const canvas = document.createElement("canvas")
	canvas.id = "canvas"
	parent.appendChild(canvas)
	return canvas
}

export function initWebGL2(canvas: HTMLCanvasElement): WebGL2RenderingContext {
	const gl = canvas.getContext("webgl2", {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
		premultipliedAlpha: false,
		preserveDrawingBuffer: false,
		powerPreference: "high-performance",
	})
	if (!gl) throw new Error("WebGL2 is not available")
	if (!gl.getExtension("EXT_color_buffer_float")) {
		throw new Error("EXT_color_buffer_float is required for the float field")
	}
	gl.disable(gl.DEPTH_TEST)
	gl.disable(gl.BLEND)
	gl.disable(gl.CULL_FACE)
	return gl
}

/** Match the drawing buffer to the canvas CSS size. Returns true when it changed. */
export function resizeCanvasToDisplay(canvas: HTMLCanvasElement): boolean {
	const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
	const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio))
	const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio))
	if (canvas.width === width && canvas.height === height) return false
	canvas.width = width
	canvas.height = height
	return true
}

export function showError(message: string): void {
	const paragraph = document.createElement("p")
	paragraph.className = "error"
	paragraph.textContent = message
	document.body.appendChild(paragraph)
}
