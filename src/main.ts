import {
	initWebGL2,
	mountCanvas,
	resizeCanvasToDisplay,
	showError,
} from "./gl/context"
import { createLeniaParams } from "./params"
import { gridSizeForCanvas, LeniaSimulation } from "./sim/lenia"
import { mountControls } from "./ui/controls"

function start(): void {
	const canvas = mountCanvas()

	let gl: WebGL2RenderingContext
	try {
		gl = initWebGL2(canvas)
	} catch (error) {
		canvas.remove()
		showError(error instanceof Error ? error.message : "WebGL2 init failed")
		return
	}

	const params = createLeniaParams()
	const sim = new LeniaSimulation(gl)
	let gridWidth = 0
	let gridHeight = 0
	let reseedRequested = false

	const controls = mountControls(params, () => {
		reseedRequested = true
	})

	function syncGrid(): boolean {
		resizeCanvasToDisplay(canvas)
		if (canvas.clientWidth < 1 || canvas.clientHeight < 1) return false
		const next = gridSizeForCanvas(
			canvas.clientWidth,
			canvas.clientHeight,
			params.resolution,
		)
		if (next.width === gridWidth && next.height === gridHeight) return true
		const first = gridWidth === 0
		sim.resize(next.width, next.height)
		if (first) sim.seed()
		gridWidth = next.width
		gridHeight = next.height
		return true
	}

	function render(stepSimulation: boolean): void {
		if (!syncGrid()) return
		if (reseedRequested) {
			sim.seed()
			reseedRequested = false
		}
		if (stepSimulation && !params.paused) {
			const steps = Math.max(1, Math.round(params.speed))
			for (let step = 0; step < steps; step++) sim.step(params)
		}
		sim.draw()
	}

	render(false)

	let frameId = requestAnimationFrame(function loop() {
		render(true)
		frameId = requestAnimationFrame(loop)
	})

	if (import.meta.hot) {
		import.meta.hot.dispose(() => {
			cancelAnimationFrame(frameId)
			controls.dispose()
			sim.dispose()
			canvas.remove()
		})
	}
}

start()
