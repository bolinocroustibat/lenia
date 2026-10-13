import {
	bindField,
	createFieldSamplers,
	type FieldSamplers,
	PingPong,
} from "../gl/pingPong"
import { FullscreenQuad } from "../gl/quad"
import { createProgram, uniform } from "../gl/shaders"
import type { LeniaParams } from "../params"
import { COPY_FRAG, DISPLAY_FRAG, QUAD_VERT, SIM_FRAG } from "./glsl"
import { seedField } from "./seed"

/**
 * Flip to 1 when `convolve` in the simulation shader returns the ring-kernel potential.
 * While it stays 0, each step copies the field so the ping-pong path can be checked.
 */
export const KERNEL_READY = 0

export interface GridSize {
	width: number
	height: number
}

/** One cell covers `resolution` CSS pixels on each axis. The result still fills the canvas. */
export function gridSizeForCanvas(
	cssWidth: number,
	cssHeight: number,
	resolution: number,
): GridSize {
	const cell = Math.max(1, Math.round(resolution))
	return {
		width: Math.max(1, Math.floor(cssWidth / cell)),
		height: Math.max(1, Math.floor(cssHeight / cell)),
	}
}

interface SimUniforms {
	state: WebGLUniformLocation
	texelSize: WebGLUniformLocation
	mu: WebGLUniformLocation
	sigma: WebGLUniformLocation
	dt: WebGLUniformLocation
	radius: WebGLUniformLocation
	kernelReady: WebGLUniformLocation
}

export class LeniaSimulation {
	private targets: PingPong | undefined
	private gridWidth = 0
	private gridHeight = 0
	private readonly quad: FullscreenQuad
	private readonly samplers: FieldSamplers
	private readonly simProgram: WebGLProgram
	private readonly displayProgram: WebGLProgram
	private readonly copyProgram: WebGLProgram
	private readonly simUniforms: SimUniforms
	private readonly displayState: WebGLUniformLocation
	private readonly copyState: WebGLUniformLocation

	constructor(private readonly gl: WebGL2RenderingContext) {
		this.quad = new FullscreenQuad(gl)
		this.samplers = createFieldSamplers(gl)
		this.simProgram = createProgram(gl, QUAD_VERT, SIM_FRAG)
		this.displayProgram = createProgram(gl, QUAD_VERT, DISPLAY_FRAG)
		this.copyProgram = createProgram(gl, QUAD_VERT, COPY_FRAG)
		this.simUniforms = {
			state: uniform(gl, this.simProgram, "u_state"),
			texelSize: uniform(gl, this.simProgram, "u_texelSize"),
			mu: uniform(gl, this.simProgram, "u_mu"),
			sigma: uniform(gl, this.simProgram, "u_sigma"),
			dt: uniform(gl, this.simProgram, "u_dt"),
			radius: uniform(gl, this.simProgram, "u_radius"),
			kernelReady: uniform(gl, this.simProgram, "u_kernelReady"),
		}
		this.displayState = uniform(gl, this.displayProgram, "u_state")
		this.copyState = uniform(gl, this.copyProgram, "u_state")
	}

	/** Replace the float grid. An existing field is stretched into the new size. */
	resize(width: number, height: number): void {
		if (
			this.targets &&
			width === this.gridWidth &&
			height === this.gridHeight
		) {
			return
		}
		const next = new PingPong(this.gl, width, height)
		if (this.targets) {
			this.stretch(this.targets, next)
			this.targets.dispose()
		}
		this.targets = next
		this.gridWidth = width
		this.gridHeight = height
	}

	seed(radius: number): void {
		this.field().upload(seedField(this.gridWidth, this.gridHeight, radius))
	}

	/** Read one texture, write the other, then swap. */
	step(params: LeniaParams): void {
		const gl = this.gl
		const targets = this.field()
		gl.bindFramebuffer(gl.FRAMEBUFFER, targets.writeFramebuffer)
		gl.viewport(0, 0, this.gridWidth, this.gridHeight)
		gl.useProgram(this.simProgram)
		bindField(gl, 0, targets.readTexture, this.samplers.nearest)
		gl.uniform1i(this.simUniforms.state, 0)
		gl.uniform2f(
			this.simUniforms.texelSize,
			1 / this.gridWidth,
			1 / this.gridHeight,
		)
		gl.uniform1f(this.simUniforms.mu, params.mu)
		gl.uniform1f(this.simUniforms.sigma, Math.max(params.sigma, 0.001))
		gl.uniform1f(this.simUniforms.dt, params.dt)
		gl.uniform1f(
			this.simUniforms.radius,
			Math.max(1, Math.round(params.radius)),
		)
		gl.uniform1f(this.simUniforms.kernelReady, KERNEL_READY)
		this.quad.draw(this.simProgram)
		targets.swap()
	}

	/** Draw the current field across the whole canvas. */
	draw(): void {
		const gl = this.gl
		const targets = this.field()
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
		gl.useProgram(this.displayProgram)
		bindField(gl, 0, targets.readTexture, this.samplers.linear)
		gl.uniform1i(this.displayState, 0)
		this.quad.draw(this.displayProgram)
	}

	dispose(): void {
		const gl = this.gl
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		gl.bindSampler(0, null)
		this.targets?.dispose()
		this.quad.dispose()
		gl.deleteSampler(this.samplers.nearest)
		gl.deleteSampler(this.samplers.linear)
		gl.deleteProgram(this.simProgram)
		gl.deleteProgram(this.displayProgram)
		gl.deleteProgram(this.copyProgram)
	}

	private stretch(source: PingPong, destination: PingPong): void {
		const gl = this.gl
		gl.bindFramebuffer(gl.FRAMEBUFFER, destination.writeFramebuffer)
		gl.viewport(0, 0, destination.width, destination.height)
		gl.useProgram(this.copyProgram)
		bindField(gl, 0, source.readTexture, this.samplers.linear)
		gl.uniform1i(this.copyState, 0)
		this.quad.draw(this.copyProgram)
		destination.swap()
	}

	private field(): PingPong {
		if (!this.targets) throw new Error("Grid is not allocated")
		return this.targets
	}
}
