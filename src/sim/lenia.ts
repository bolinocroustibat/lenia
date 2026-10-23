import {
	bindField,
	createFieldSamplers,
	FIELD_CHANNELS,
	type FieldSamplers,
	fieldLength,
	PingPong,
} from "../gl/pingPong"
import { FullscreenQuad } from "../gl/quad"
import { createProgram, uniform } from "../gl/shaders"
import type { LeniaParams } from "../params"
import type { ChannelCreature, ChannelRule } from "./channels"
import { type Creature, ORBIUM } from "./creature"
import {
	CHANNEL_FRAG,
	COPY_FRAG,
	DISPLAY_FRAG,
	QUAD_VERT,
	SIM_FRAG,
} from "./glsl"
import {
	clampKernelRadius,
	kernelCacheKey,
	kernelWeights,
	MAX_SENSORS,
	packSensorKernels,
} from "./kernel"
import { seedField, stampChannels, stampCreature } from "./seed"

/** The simulation shader convolves with the ring kernel. 0 would copy the field. */
export const KERNEL_READY = 1

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
	kernel: WebGLUniformLocation
	texelSize: WebGLUniformLocation
	mu: WebGLUniformLocation
	sigma: WebGLUniformLocation
	dt: WebGLUniformLocation
	radius: WebGLUniformLocation
	kernelReady: WebGLUniformLocation
	polynomialGrowth: WebGLUniformLocation
}

interface ChannelUniforms {
	state: WebGLUniformLocation
	kernels: WebGLUniformLocation
	texelSize: WebGLUniformLocation
	dt: WebGLUniformLocation
	atlasRadius: WebGLUniformLocation
	sensorCount: WebGLUniformLocation
	mu: WebGLUniformLocation
	sigma: WebGLUniformLocation
	weight: WebGLUniformLocation
	radius: WebGLUniformLocation
	source: WebGLUniformLocation
	dest: WebGLUniformLocation
}

export class LeniaSimulation {
	private targets: PingPong | undefined
	private gridWidth = 0
	private gridHeight = 0
	private readonly quad: FullscreenQuad
	private readonly samplers: FieldSamplers
	private readonly simProgram: WebGLProgram
	private readonly channelProgram: WebGLProgram
	private readonly displayProgram: WebGLProgram
	private readonly copyProgram: WebGLProgram
	private readonly simUniforms: SimUniforms
	private readonly channelUniforms: ChannelUniforms
	private readonly displayState: WebGLUniformLocation
	private readonly displayRgb: WebGLUniformLocation
	private readonly copyState: WebGLUniformLocation
	private kernelTexture: WebGLTexture | undefined
	private kernelKey = ""
	private channelKernels: WebGLTexture | undefined
	private channelKey = ""
	private channelAtlasRadius = 0
	private readonly sensorMu = new Float32Array(MAX_SENSORS)
	private readonly sensorSigma = new Float32Array(MAX_SENSORS)
	private readonly sensorWeight = new Float32Array(MAX_SENSORS)
	private readonly sensorRadius = new Float32Array(MAX_SENSORS)
	private readonly sensorSource = new Int32Array(MAX_SENSORS)
	private readonly sensorDest = new Int32Array(MAX_SENSORS)

	constructor(private readonly gl: WebGL2RenderingContext) {
		this.quad = new FullscreenQuad(gl)
		this.samplers = createFieldSamplers(gl)
		this.simProgram = createProgram(gl, QUAD_VERT, SIM_FRAG)
		this.channelProgram = createProgram(gl, QUAD_VERT, CHANNEL_FRAG)
		this.displayProgram = createProgram(gl, QUAD_VERT, DISPLAY_FRAG)
		this.copyProgram = createProgram(gl, QUAD_VERT, COPY_FRAG)
		this.simUniforms = {
			state: uniform(gl, this.simProgram, "u_state"),
			kernel: uniform(gl, this.simProgram, "u_kernel"),
			texelSize: uniform(gl, this.simProgram, "u_texelSize"),
			mu: uniform(gl, this.simProgram, "u_mu"),
			sigma: uniform(gl, this.simProgram, "u_sigma"),
			dt: uniform(gl, this.simProgram, "u_dt"),
			radius: uniform(gl, this.simProgram, "u_radius"),
			kernelReady: uniform(gl, this.simProgram, "u_kernelReady"),
			polynomialGrowth: uniform(gl, this.simProgram, "u_polynomialGrowth"),
		}
		this.channelUniforms = {
			state: uniform(gl, this.channelProgram, "u_state"),
			kernels: uniform(gl, this.channelProgram, "u_kernels"),
			texelSize: uniform(gl, this.channelProgram, "u_texelSize"),
			dt: uniform(gl, this.channelProgram, "u_dt"),
			atlasRadius: uniform(gl, this.channelProgram, "u_atlasRadius"),
			sensorCount: uniform(gl, this.channelProgram, "u_sensorCount"),
			mu: uniform(gl, this.channelProgram, "u_mu"),
			sigma: uniform(gl, this.channelProgram, "u_sigma"),
			weight: uniform(gl, this.channelProgram, "u_weight"),
			radius: uniform(gl, this.channelProgram, "u_radius"),
			source: uniform(gl, this.channelProgram, "u_source"),
			dest: uniform(gl, this.channelProgram, "u_dest"),
		}
		this.displayState = uniform(gl, this.displayProgram, "u_state")
		this.displayRgb = uniform(gl, this.displayProgram, "u_rgb")
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

	seed(creature: Creature = ORBIUM): void {
		this.field().upload(seedField(this.gridWidth, this.gridHeight, creature))
	}

	clear(): void {
		this.field().upload(
			new Float32Array(fieldLength(this.gridWidth, this.gridHeight)),
		)
	}

	/**
	 * Replace the field with a random value in each live channel.
	 * A one-channel rule keeps green and blue at 0.
	 */
	randomize(allChannels: boolean): void {
		const field = new Float32Array(fieldLength(this.gridWidth, this.gridHeight))
		const live = allChannels ? 3 : 1
		for (let index = 0; index < field.length; index += FIELD_CHANNELS) {
			for (let channel = 0; channel < live; channel++) {
				field[index + channel] = Math.random()
			}
		}
		this.field().upload(field)
	}

	/** Stamp one creature onto the current field without clearing it. */
	addCreature(creature: Creature): void {
		const targets = this.field()
		const field = targets.download()
		stampCreature(field, this.gridWidth, this.gridHeight, creature)
		targets.upload(field)
	}

	/** Stamp one three-channel pattern onto the current field without clearing it. */
	addChannels(creature: ChannelCreature): void {
		const targets = this.field()
		const field = targets.download()
		stampChannels(field, this.gridWidth, this.gridHeight, creature.pattern)
		targets.upload(field)
	}

	/** Read one texture, write the other, then swap. */
	step(params: LeniaParams): void {
		if (params.channels) {
			this.stepChannels(params.channels)
			return
		}
		const gl = this.gl
		const targets = this.field()
		gl.bindFramebuffer(gl.FRAMEBUFFER, targets.writeFramebuffer)
		gl.viewport(0, 0, this.gridWidth, this.gridHeight)
		gl.useProgram(this.simProgram)
		const radius = this.syncKernel(params)
		bindField(gl, 0, targets.readTexture, this.samplers.nearest)
		bindField(gl, 1, this.kernelField(), this.samplers.nearest)
		gl.uniform1i(this.simUniforms.state, 0)
		gl.uniform1i(this.simUniforms.kernel, 1)
		gl.uniform2f(
			this.simUniforms.texelSize,
			1 / this.gridWidth,
			1 / this.gridHeight,
		)
		gl.uniform1f(this.simUniforms.mu, params.mu)
		gl.uniform1f(this.simUniforms.sigma, Math.max(params.sigma, 0.001))
		gl.uniform1f(this.simUniforms.dt, params.dt)
		gl.uniform1f(this.simUniforms.radius, radius)
		gl.uniform1f(this.simUniforms.kernelReady, KERNEL_READY)
		gl.uniform1f(
			this.simUniforms.polynomialGrowth,
			params.growth === "polynomial" ? 1 : 0,
		)
		this.quad.draw(this.simProgram)
		targets.swap()
	}

	/** Draw the current field across the whole canvas. */
	draw(rgb: boolean): void {
		const gl = this.gl
		const targets = this.field()
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
		gl.useProgram(this.displayProgram)
		bindField(gl, 0, targets.readTexture, this.samplers.linear)
		gl.uniform1i(this.displayState, 0)
		gl.uniform1f(this.displayRgb, rgb ? 1 : 0)
		this.quad.draw(this.displayProgram)
	}

	dispose(): void {
		const gl = this.gl
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		gl.bindSampler(0, null)
		gl.bindSampler(1, null)
		this.targets?.dispose()
		if (this.kernelTexture) gl.deleteTexture(this.kernelTexture)
		if (this.channelKernels) gl.deleteTexture(this.channelKernels)
		this.quad.dispose()
		gl.deleteSampler(this.samplers.nearest)
		gl.deleteSampler(this.samplers.linear)
		gl.deleteProgram(this.simProgram)
		gl.deleteProgram(this.channelProgram)
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

	/** Rebuild the kernel texture when the radius or the ring peaks change. */
	private syncKernel(params: LeniaParams): number {
		const next = clampKernelRadius(params.radius)
		const key = kernelCacheKey(next, params.kernel)
		if (this.kernelTexture && key === this.kernelKey) return next
		const gl = this.gl
		const weights = kernelWeights(next, params.kernel)
		const size = next * 2 + 1
		if (!this.kernelTexture) {
			const texture = gl.createTexture()
			if (!texture) throw new Error("Could not create kernel texture")
			this.kernelTexture = texture
		}
		gl.bindTexture(gl.TEXTURE_2D, this.kernelTexture)
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.R32F,
			size,
			size,
			0,
			gl.RED,
			gl.FLOAT,
			weights,
		)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.bindTexture(gl.TEXTURE_2D, null)
		this.kernelKey = key
		return next
	}

	private kernelField(): WebGLTexture {
		if (!this.kernelTexture) throw new Error("Kernel is not allocated")
		return this.kernelTexture
	}

	/** One pass sums every sensor, then clips each channel. */
	private stepChannels(rule: ChannelRule): void {
		const gl = this.gl
		const targets = this.field()
		const atlasRadius = this.syncChannelKernels(rule)
		gl.bindFramebuffer(gl.FRAMEBUFFER, targets.writeFramebuffer)
		gl.viewport(0, 0, this.gridWidth, this.gridHeight)
		gl.useProgram(this.channelProgram)
		bindField(gl, 0, targets.readTexture, this.samplers.nearest)
		gl.activeTexture(gl.TEXTURE1)
		gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.channelKernelField())
		gl.bindSampler(1, this.samplers.nearest)
		this.writeSensorUniforms(rule)
		gl.uniform1i(this.channelUniforms.state, 0)
		gl.uniform1i(this.channelUniforms.kernels, 1)
		gl.uniform2f(
			this.channelUniforms.texelSize,
			1 / this.gridWidth,
			1 / this.gridHeight,
		)
		gl.uniform1f(this.channelUniforms.dt, rule.dt)
		gl.uniform1f(this.channelUniforms.atlasRadius, atlasRadius)
		gl.uniform1i(this.channelUniforms.sensorCount, rule.sensors.length)
		this.quad.draw(this.channelProgram)
		gl.activeTexture(gl.TEXTURE1)
		gl.bindTexture(gl.TEXTURE_2D_ARRAY, null)
		targets.swap()
	}

	private writeSensorUniforms(rule: ChannelRule): void {
		const gl = this.gl
		this.sensorMu.fill(0)
		this.sensorSigma.fill(0)
		this.sensorWeight.fill(0)
		this.sensorRadius.fill(0)
		this.sensorSource.fill(0)
		this.sensorDest.fill(0)
		rule.sensors.forEach((sensor, index) => {
			this.sensorMu[index] = sensor.mu
			this.sensorSigma[index] = sensor.sigma
			this.sensorWeight[index] = sensor.weight
			this.sensorRadius[index] = sensor.radius
			this.sensorSource[index] = sensor.source
			this.sensorDest[index] = sensor.dest
		})
		gl.uniform1fv(this.channelUniforms.mu, this.sensorMu)
		gl.uniform1fv(this.channelUniforms.sigma, this.sensorSigma)
		gl.uniform1fv(this.channelUniforms.weight, this.sensorWeight)
		gl.uniform1fv(this.channelUniforms.radius, this.sensorRadius)
		gl.uniform1iv(this.channelUniforms.source, this.sensorSource)
		gl.uniform1iv(this.channelUniforms.dest, this.sensorDest)
	}

	/** Rebuild the kernel array when a sensor's radius or ring peaks change. */
	private syncChannelKernels(rule: ChannelRule): number {
		const key = rule.sensors
			.map((sensor) => `${sensor.radius}:${sensor.peaks.join(",")}`)
			.join("|")
		if (this.channelKernels && key === this.channelKey) {
			return this.channelAtlasRadius
		}
		const gl = this.gl
		const packed = packSensorKernels(rule.sensors)
		const size = packed.atlasRadius * 2 + 1
		if (!this.channelKernels) {
			const texture = gl.createTexture()
			if (!texture) throw new Error("Could not create kernel array")
			this.channelKernels = texture
		}
		gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.channelKernels)
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
		gl.texImage3D(
			gl.TEXTURE_2D_ARRAY,
			0,
			gl.R32F,
			size,
			size,
			rule.sensors.length,
			0,
			gl.RED,
			gl.FLOAT,
			packed.weights,
		)
		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
		gl.bindTexture(gl.TEXTURE_2D_ARRAY, null)
		const uploadError = gl.getError()
		if (uploadError !== gl.NO_ERROR) {
			throw new Error(`Kernel array upload failed (${uploadError})`)
		}
		this.channelKey = key
		this.channelAtlasRadius = packed.atlasRadius
		return packed.atlasRadius
	}

	private channelKernelField(): WebGLTexture {
		if (!this.channelKernels)
			throw new Error("Channel kernels are not allocated")
		return this.channelKernels
	}
}
