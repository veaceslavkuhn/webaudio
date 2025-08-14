/**
 * Effects Processor Service - React version
 * Implements various audio effects and processing functionality
 */

export class EffectsProcessorService {
	constructor(audioContext) {
		this.audioContext = audioContext;
		this.effectsHistory = [];
	}

	amplify(audioBuffer, gain = 1.0) {
		const newBuffer = this.copyBuffer(audioBuffer);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			for (let i = 0; i < channelData.length; i++) {
				channelData[i] *= gain;
				channelData[i] = Math.max(-1, Math.min(1, channelData[i]));
			}
		}

		// Track in history
		this.addToHistory("amplify", { gain });

		return newBuffer;
	}

	normalize(audioBuffer, targetPeak = 0.95) {
		let peak = 0;
		for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
			const channelData = audioBuffer.getChannelData(channel);
			for (let i = 0; i < channelData.length; i++) {
				const sample = Math.abs(channelData[i]);
				if (sample > peak) {
					peak = sample;
				}
			}
		}

		if (peak === 0) return audioBuffer;

		const gain = targetPeak / peak;
		const result = this.amplify(audioBuffer, gain);

		// Track in history (subtract 1 from history length since amplify already added one)
		this.effectsHistory.pop(); // Remove the amplify entry
		this.addToHistory("normalize", { targetPeak });

		return result;
	}

	fadeIn(audioBuffer, duration = 1.0) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;
		const fadeSamples = Math.min(duration * sampleRate, audioBuffer.length);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			for (let i = 0; i < fadeSamples; i++) {
				const fadeGain = i / fadeSamples;
				channelData[i] *= fadeGain;
			}
		}

		return newBuffer;
	}

	fadeOut(audioBuffer, duration = 1.0) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;
		const fadeSamples = Math.min(duration * sampleRate, audioBuffer.length);
		const startSample = audioBuffer.length - fadeSamples;

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			for (let i = 0; i < fadeSamples; i++) {
				const fadeGain = 1 - i / fadeSamples;
				channelData[startSample + i] *= fadeGain;
			}
		}

		return newBuffer;
	}

	echo(audioBuffer, delay = 0.3, decay = 0.5, repeat = 3) {
		const sampleRate = audioBuffer.sampleRate;
		const delaySamples = Math.floor(delay * sampleRate);
		const newLength = audioBuffer.length + delaySamples * repeat;

		const newBuffer = this.audioContext.createBuffer(
			audioBuffer.numberOfChannels,
			newLength,
			sampleRate,
		);

		for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
			const inputData = audioBuffer.getChannelData(channel);
			const outputData = newBuffer.getChannelData(channel);

			for (let i = 0; i < inputData.length; i++) {
				outputData[i] = inputData[i];
			}

			let currentDecay = decay;
			for (let echo = 1; echo <= repeat; echo++) {
				const echoStart = echo * delaySamples;
				for (
					let i = 0;
					i < inputData.length && echoStart + i < outputData.length;
					i++
				) {
					outputData[echoStart + i] += inputData[i] * currentDecay;
				}
				currentDecay *= decay;
			}
		}

		return newBuffer;
	}

	reverb(audioBuffer, roomSize = 0.7, damping = 0.5, wetLevel = 0.3) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;

		const delayTimes = [0.03, 0.05, 0.07, 0.09, 0.11, 0.13];
		const delayBuffers = delayTimes.map((time) =>
			new Array(Math.floor(time * sampleRate)).fill(0),
		);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			const delayIndices = new Array(delayBuffers.length).fill(0);

			for (let i = 0; i < channelData.length; i++) {
				let reverbSum = 0;

				for (let d = 0; d < delayBuffers.length; d++) {
					const delayBuffer = delayBuffers[d];
					const delayIndex = delayIndices[d];

					const delayedSample = delayBuffer[delayIndex];
					reverbSum += delayedSample;

					const feedback = channelData[i] + delayedSample * roomSize * damping;
					delayBuffer[delayIndex] = feedback;

					delayIndices[d] = (delayIndex + 1) % delayBuffer.length;
				}

				const reverbSignal = reverbSum / delayBuffers.length;
				channelData[i] =
					channelData[i] * (1 - wetLevel) + reverbSignal * wetLevel;
			}
		}

		return newBuffer;
	}

	changeSpeed(audioBuffer, speedRatio = 1.0) {
		if (speedRatio === 1.0) return audioBuffer;

		const newLength = Math.floor(audioBuffer.length / speedRatio);
		const newBuffer = this.audioContext.createBuffer(
			audioBuffer.numberOfChannels,
			newLength,
			audioBuffer.sampleRate,
		);

		for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
			const inputData = audioBuffer.getChannelData(channel);
			const outputData = newBuffer.getChannelData(channel);

			for (let i = 0; i < newLength; i++) {
				const sourceIndex = i * speedRatio;
				const index = Math.floor(sourceIndex);
				const fraction = sourceIndex - index;

				if (index < inputData.length - 1) {
					outputData[i] =
						inputData[index] * (1 - fraction) + inputData[index + 1] * fraction;
				} else if (index < inputData.length) {
					outputData[i] = inputData[index];
				}
			}
		}

		return newBuffer;
	}

	changePitch(audioBuffer, pitchRatio = 1.0) {
		if (pitchRatio === 1.0) return audioBuffer;

		const frameSize = 1024;
		const hopSize = frameSize / 4;

		const newBuffer = this.copyBuffer(audioBuffer);

		for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
			const inputData = audioBuffer.getChannelData(channel);
			const outputData = newBuffer.getChannelData(channel);
			outputData.fill(0);

			let inputPos = 0;
			let outputPos = 0;

			while (
				inputPos + frameSize < inputData.length &&
				outputPos + frameSize < outputData.length
			) {
				for (let i = 0; i < frameSize; i++) {
					const sourceIndex = inputPos + i * pitchRatio;
					const index = Math.floor(sourceIndex);
					const fraction = sourceIndex - index;

					if (index < inputData.length - 1) {
						const sample =
							inputData[index] * (1 - fraction) +
							inputData[index + 1] * fraction;

						const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / frameSize));
						outputData[outputPos + i] += sample * window;
					}
				}

				inputPos += hopSize;
				outputPos += hopSize;
			}
		}

		return newBuffer;
	}

	highPassFilter(audioBuffer, cutoffFreq = 1000) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;
		const rc = 1 / (2 * Math.PI * cutoffFreq);
		const dt = 1 / sampleRate;
		const alpha = rc / (rc + dt);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			let y = 0;
			let x_prev = 0;
			let y_prev = 0;

			for (let i = 0; i < channelData.length; i++) {
				const x = channelData[i];
				y = alpha * (y_prev + x - x_prev);
				channelData[i] = y;

				x_prev = x;
				y_prev = y;
			}
		}

		return newBuffer;
	}

	lowPassFilter(audioBuffer, cutoffFreq = 1000) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;
		const rc = 1 / (2 * Math.PI * cutoffFreq);
		const dt = 1 / sampleRate;
		const alpha = dt / (rc + dt);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			let y = 0;

			for (let i = 0; i < channelData.length; i++) {
				y += alpha * (channelData[i] - y);
				channelData[i] = y;
			}
		}

		return newBuffer;
	}

	noiseReduction(audioBuffer, noiseFloor = 0.1, reduction = 0.8) {
		const newBuffer = this.copyBuffer(audioBuffer);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);

			for (let i = 0; i < channelData.length; i++) {
				const sample = channelData[i];
				const amplitude = Math.abs(sample);

				if (amplitude < noiseFloor) {
					channelData[i] = sample * (1 - reduction);
				}
			}
		}

		return newBuffer;
	}

	compress(
		audioBuffer,
		threshold = 0.7,
		ratio = 4,
		attack = 0.01,
		release = 0.1,
	) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;
		const attackSamples = attack * sampleRate;
		const releaseSamples = release * sampleRate;

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			let envelope = 0;

			for (let i = 0; i < channelData.length; i++) {
				const sample = Math.abs(channelData[i]);

				if (sample > envelope) {
					envelope += (sample - envelope) / attackSamples;
				} else {
					envelope += (sample - envelope) / releaseSamples;
				}

				if (envelope > threshold) {
					const excess = envelope - threshold;
					const compressedExcess = excess / ratio;
					const gain = (threshold + compressedExcess) / envelope;
					channelData[i] *= gain;
				}
			}
		}

		return newBuffer;
	}

	distortion(audioBuffer, amount = 50, tone = 0.5) {
		const newBuffer = this.copyBuffer(audioBuffer);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);

			for (let i = 0; i < channelData.length; i++) {
				let sample = channelData[i];

				sample *= amount;
				sample = Math.tanh(sample);

				if (i > 0) {
					sample = sample * tone + channelData[i - 1] * (1 - tone);
				}

				channelData[i] = sample;
			}
		}

		return newBuffer;
	}

	copyBuffer(audioBuffer) {
		if (!audioBuffer) {
			console.warn("copyBuffer: audioBuffer is null or undefined");
			return null;
		}

		const newBuffer = this.audioContext.createBuffer(
			audioBuffer.numberOfChannels,
			audioBuffer.length,
			audioBuffer.sampleRate,
		);

		for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
			const inputData = audioBuffer.getChannelData(channel);
			const outputData = newBuffer.getChannelData(channel);
			outputData.set(inputData);
		}

		return newBuffer;
	}

	getEffectParameters(effectName) {
		const parameters = {
			amplify: [
				{
					name: "gain",
					label: "Gain",
					type: "number",
					min: 0,
					max: 10,
					default: 1.5,
					step: 0.1,
				},
			],
			normalize: [
				{
					name: "targetPeak",
					label: "Target Peak",
					type: "number",
					min: 0.1,
					max: 1.0,
					default: 0.95,
					step: 0.01,
				},
			],
			fadeIn: [
				{
					name: "duration",
					label: "Duration",
					type: "number",
					min: 0.1,
					max: 10,
					default: 1,
					step: 0.1,
				},
			],
			fadeOut: [
				{
					name: "duration",
					label: "Duration",
					type: "number",
					min: 0.1,
					max: 10,
					default: 1,
					step: 0.1,
				},
			],
			echo: [
				{
					name: "delay",
					label: "Delay",
					type: "number",
					min: 0.01,
					max: 2,
					default: 0.3,
					step: 0.01,
				},
				{
					name: "decay",
					label: "Decay",
					type: "number",
					min: 0.1,
					max: 0.9,
					default: 0.5,
					step: 0.01,
				},
				{
					name: "repeat",
					label: "Repeat",
					type: "number",
					min: 1,
					max: 10,
					default: 3,
					step: 1,
				},
			],
			reverb: [
				{
					name: "roomSize",
					label: "Room Size",
					type: "number",
					min: 0.1,
					max: 1,
					default: 0.7,
					step: 0.01,
				},
				{
					name: "damping",
					label: "Damping",
					type: "number",
					min: 0.1,
					max: 1,
					default: 0.5,
					step: 0.01,
				},
				{
					name: "wetLevel",
					label: "Wet Level",
					type: "number",
					min: 0,
					max: 1,
					default: 0.3,
					step: 0.01,
				},
			],
			changeSpeed: [
				{
					name: "speedRatio",
					label: "Speed Ratio",
					type: "number",
					min: 0.25,
					max: 4,
					default: 1,
					step: 0.01,
				},
			],
			changePitch: [
				{
					name: "pitchRatio",
					label: "Pitch Ratio",
					type: "number",
					min: 0.25,
					max: 4,
					default: 1,
					step: 0.01,
				},
			],
			highPassFilter: [
				{
					name: "cutoffFreq",
					label: "Cutoff Frequency",
					type: "number",
					min: 20,
					max: 20000,
					default: 1000,
					step: 10,
				},
			],
			lowPassFilter: [
				{
					name: "cutoffFreq",
					label: "Cutoff Frequency",
					type: "number",
					min: 20,
					max: 20000,
					default: 1000,
					step: 10,
				},
			],
			noiseReduction: [
				{
					name: "noiseFloor",
					label: "Noise Floor",
					type: "number",
					min: 0.01,
					max: 0.5,
					default: 0.1,
					step: 0.01,
				},
				{
					name: "reduction",
					label: "Reduction",
					type: "number",
					min: 0.1,
					max: 1,
					default: 0.8,
					step: 0.01,
				},
			],
			compress: [
				{
					name: "threshold",
					label: "Threshold",
					type: "number",
					min: 0.1,
					max: 1,
					default: 0.7,
					step: 0.01,
				},
				{
					name: "ratio",
					label: "Ratio",
					type: "number",
					min: 1,
					max: 20,
					default: 4,
					step: 0.1,
				},
				{
					name: "attack",
					label: "Attack",
					type: "number",
					min: 0.001,
					max: 0.1,
					default: 0.01,
					step: 0.001,
				},
				{
					name: "release",
					label: "Release",
					type: "number",
					min: 0.01,
					max: 1,
					default: 0.1,
					step: 0.01,
				},
			],
			distortion: [
				{
					name: "amount",
					label: "Amount",
					type: "number",
					min: 1,
					max: 100,
					default: 50,
					step: 1,
				},
				{
					name: "tone",
					label: "Tone",
					type: "number",
					min: 0,
					max: 1,
					default: 0.5,
					step: 0.01,
				},
			],
			limiter: [
				{
					name: "threshold",
					label: "Threshold (dB)",
					type: "number",
					min: -30,
					max: 0,
					default: -6,
					step: 0.1,
				},
				{
					name: "makeupGain",
					label: "Makeup Gain (dB)",
					type: "number",
					min: 0,
					max: 20,
					default: 0,
					step: 0.1,
				},
				{
					name: "lookahead",
					label: "Lookahead (ms)",
					type: "number",
					min: 1,
					max: 20,
					default: 5,
					step: 1,
				},
			],
			changeTempo: [
				{
					name: "tempoRatio",
					label: "Tempo Ratio",
					type: "number",
					min: 0.25,
					max: 4.0,
					default: 1.0,
					step: 0.01,
				},
			],
			vocoder: [
				{
					name: "carrierFreq",
					label: "Carrier Frequency (Hz)",
					type: "number",
					min: 100,
					max: 2000,
					default: 440,
					step: 10,
				},
				{
					name: "numBands",
					label: "Number of Bands",
					type: "number",
					min: 4,
					max: 32,
					default: 16,
					step: 1,
				},
			],
			filterCurveEQ: [
				{
					name: "curve",
					label: "EQ Curve",
					type: "array",
					default: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				},
			],
			loudnessNormalization: [
				{
					name: "targetLUFS",
					label: "Target LUFS",
					type: "number",
					min: -40,
					max: -10,
					default: -23,
					step: 0.1,
				},
			],
			paulstretch: [
				{
					name: "stretchFactor",
					label: "Stretch Factor",
					type: "number",
					min: 1.1,
					max: 10.0,
					default: 2.0,
					step: 0.1,
				},
			],
		};

		return parameters[effectName] || [];
	}

	applyEffect(effectName, audioBuffer, parameters = {}) {
		switch (effectName) {
			case "amplify":
				return this.amplify(audioBuffer, parameters.gain || 1);
			case "normalize":
				return this.normalize(audioBuffer, parameters.targetPeak || 0.95);
			case "fadeIn":
				return this.fadeIn(audioBuffer, parameters.duration || 1);
			case "fadeOut":
				return this.fadeOut(audioBuffer, parameters.duration || 1);
			case "echo":
				return this.echo(
					audioBuffer,
					parameters.delay || 0.3,
					parameters.decay || 0.5,
					parameters.repeat || 3,
				);
			case "reverb":
				return this.reverb(
					audioBuffer,
					parameters.roomSize || 0.7,
					parameters.damping || 0.5,
					parameters.wetLevel || 0.3,
				);
			case "changeSpeed":
				return this.changeSpeed(audioBuffer, parameters.speedRatio || 1);
			case "changePitch":
				return this.changePitch(audioBuffer, parameters.pitchRatio || 1);
			case "highPassFilter":
				return this.highPassFilter(audioBuffer, parameters.cutoffFreq || 1000);
			case "lowPassFilter":
				return this.lowPassFilter(audioBuffer, parameters.cutoffFreq || 1000);
			case "noiseReduction":
				return this.noiseReduction(
					audioBuffer,
					parameters.noiseFloor || 0.1,
					parameters.reduction || 0.8,
				);
			case "compress":
				return this.compress(
					audioBuffer,
					parameters.threshold || 0.7,
					parameters.ratio || 4,
					parameters.attack || 0.01,
					parameters.release || 0.1,
				);
			case "distortion":
				return this.distortion(
					audioBuffer,
					parameters.amount || 50,
					parameters.tone || 0.5,
				);
			// Phase 1 Priority Effects
			case "bassAndTreble":
				return this.bassAndTreble(
					audioBuffer,
					parameters.bassGain || 0,
					parameters.trebleGain || 0,
					parameters.bassFreq || 250,
					parameters.trebleFreq || 4000,
				);
			case "graphicEQ": {
				const bands = [
					parameters.band31 || 0,
					parameters.band62 || 0,
					parameters.band125 || 0,
					parameters.band250 || 0,
					parameters.band500 || 0,
					parameters.band1k || 0,
					parameters.band2k || 0,
					parameters.band4k || 0,
					parameters.band8k || 0,
					parameters.band16k || 0,
				];
				return this.graphicEQ(audioBuffer, bands);
			}
			case "notchFilter":
				return this.notchFilter(
					audioBuffer,
					parameters.frequency || 60,
					parameters.quality || 30,
				);
			case "clickRemoval":
				return this.clickRemoval(
					audioBuffer,
					parameters.threshold || 200,
					parameters.width || 5,
				);
			case "clipFix":
				return this.clipFix(audioBuffer, parameters.threshold || 0.95);
			case "noiseGate":
				return this.noiseGate(
					audioBuffer,
					parameters.threshold || -40,
					parameters.attack || 0.01,
					parameters.hold || 0.01,
					parameters.release || 0.1,
				);
			case "tremolo":
				return this.tremolo(
					audioBuffer,
					parameters.rate || 5,
					parameters.depth || 0.5,
					parameters.waveform || "sine",
				);
			case "wahwah":
				return this.wahwah(
					audioBuffer,
					parameters.rate || 0.5,
					parameters.depth || 0.7,
					parameters.freqOffset || 450,
				);
			case "invert":
				return this.invert(audioBuffer);
			case "repeat":
				return this.repeat(audioBuffer, parameters.times || 1);
			case "reverse":
				return this.reverse(audioBuffer);
			case "limiter":
				return this.limiter(
					audioBuffer,
					parameters.threshold || -6,
					parameters.makeupGain || 0,
					parameters.lookahead || 5,
				);
			case "changeTempo":
				return this.changeTempo(audioBuffer, parameters.tempoRatio || 1.0);
			case "vocoder":
				return this.vocoder(
					audioBuffer,
					parameters.carrierFreq || 440,
					parameters.numBands || 16,
				);
			case "filterCurveEQ":
				return this.filterCurveEQ(
					audioBuffer,
					parameters.curve || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				);
			case "loudnessNormalization":
				return this.loudnessNormalization(
					audioBuffer,
					parameters.targetLUFS || -23,
				);
			case "paulstretch":
				return this.paulstretch(audioBuffer, parameters.stretchFactor || 2.0);
			default:
				throw new Error(`Unknown effect: ${effectName}`);
		}
	}

	// Helper method to track effect application in history
	addToHistory(effectName, parameters = {}) {
		this.effectsHistory.push({
			effectName,
			parameters,
			timestamp: Date.now(),
		});
	}

	// Utility method to create impulse response for reverb
	createImpulseResponse(duration, decay, sampleRate) {
		const length = Math.floor(sampleRate * duration);
		const impulse = this.audioContext.createBuffer(2, length, sampleRate);

		for (let channel = 0; channel < 2; channel++) {
			const channelData = impulse.getChannelData(channel);
			for (let i = 0; i < length; i++) {
				const randomValue = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
				channelData[i] = randomValue;
			}
		}

		return impulse;
	}

	// Advanced Effects

	pitchShift(audioBuffer, semitones = 0) {
		// Handle null or undefined audioBuffer
		if (!audioBuffer) {
			console.warn("pitchShift: audioBuffer is null or undefined");
			return null;
		}

		// Simple pitch shifting using playback rate simulation
		const pitchRatio = 2 ** (semitones / 12);
		const newBuffer = this.copyBuffer(audioBuffer);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			const originalData = audioBuffer.getChannelData(channel);

			for (let i = 0; i < channelData.length; i++) {
				const sourceIndex = i * pitchRatio;
				const index = Math.floor(sourceIndex);
				const fraction = sourceIndex - index;

				if (index < originalData.length - 1) {
					// Linear interpolation
					channelData[i] =
						originalData[index] * (1 - fraction) +
						originalData[index + 1] * fraction;
				} else if (index < originalData.length) {
					channelData[i] = originalData[index];
				} else {
					channelData[i] = 0;
				}
			}
		}

		return newBuffer;
	}

	timeStretch(audioBuffer, stretchFactor = 1.0) {
		// Simple time stretching by resampling
		const newLength = Math.floor(audioBuffer.length * stretchFactor);
		const newBuffer = this.audioContext.createBuffer(
			audioBuffer.numberOfChannels,
			newLength,
			audioBuffer.sampleRate,
		);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			const originalData = audioBuffer.getChannelData(channel);

			for (let i = 0; i < newLength; i++) {
				const sourceIndex = i / stretchFactor;
				const index = Math.floor(sourceIndex);
				const fraction = sourceIndex - index;

				if (index < originalData.length - 1) {
					channelData[i] =
						originalData[index] * (1 - fraction) +
						originalData[index + 1] * fraction;
				} else if (index < originalData.length) {
					channelData[i] = originalData[index];
				} else {
					channelData[i] = 0;
				}
			}
		}

		return newBuffer;
	}

	chorus(audioBuffer, rate = 0.5, depth = 0.002, mix = 0.5) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;
		const delaySamples = Math.floor(depth * sampleRate);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			const originalData = audioBuffer.getChannelData(channel);

			for (let i = 0; i < channelData.length; i++) {
				const time = i / sampleRate;
				const lfo = Math.sin(2 * Math.PI * rate * time);
				const delay = Math.floor(delaySamples * (1 + lfo));
				const delayedIndex = i - delay;

				let delayedSample = 0;
				if (delayedIndex >= 0 && delayedIndex < originalData.length) {
					delayedSample = originalData[delayedIndex];
				}

				channelData[i] = originalData[i] * (1 - mix) + delayedSample * mix;
			}
		}

		return newBuffer;
	}

	phaser(audioBuffer, rate = 0.5, depth = 1, feedback = 0.5, mix = 0.5) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;

		// All-pass filter coefficients
		const delay = [0, 0, 0, 0];

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			const originalData = audioBuffer.getChannelData(channel);

			for (let i = 0; i < channelData.length; i++) {
				const time = i / sampleRate;
				const lfo = Math.sin(2 * Math.PI * rate * time);
				const freq = 200 + (depth * 1000 * (lfo + 1)) / 2;
				const omega = (2 * Math.PI * freq) / sampleRate;
				const alpha = Math.sin(omega) / (2 * Math.SQRT1_2);

				// Simple all-pass filter simulation
				const processed = originalData[i] + delay[0] * feedback;
				delay[0] = delay[1];
				delay[1] = delay[2];
				delay[2] = delay[3];
				delay[3] = processed * alpha;

				channelData[i] = originalData[i] * (1 - mix) + processed * mix;
			}
		}

		return newBuffer;
	}

	flanger(audioBuffer, rate = 0.2, depth = 0.005, feedback = 0.3, mix = 0.5) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;
		const maxDelay = Math.floor(depth * sampleRate);
		const delayBuffer = new Array(maxDelay).fill(0);
		let writeIndex = 0;

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			const originalData = audioBuffer.getChannelData(channel);

			for (let i = 0; i < channelData.length; i++) {
				const time = i / sampleRate;
				const lfo = Math.sin(2 * Math.PI * rate * time);
				const delayTime = (maxDelay / 2) * (1 + lfo);
				const readIndex =
					(writeIndex - Math.floor(delayTime) + maxDelay) % maxDelay;

				const delayedSample = delayBuffer[readIndex];
				const output = originalData[i] + delayedSample * feedback;

				delayBuffer[writeIndex] = output;
				writeIndex = (writeIndex + 1) % maxDelay;

				channelData[i] = originalData[i] * (1 - mix) + delayedSample * mix;
			}
		}

		return newBuffer;
	}

	waveshaper(audioBuffer, amount = 50) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const curve = new Float32Array(44100);
		const deg = Math.PI / 180;

		// Create distortion curve
		for (let i = 0; i < 44100; i++) {
			const x = (i * 2) / 44100 - 1;
			curve[i] =
				((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
		}

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);

			for (let i = 0; i < channelData.length; i++) {
				const sample = channelData[i];
				const index = Math.floor((sample + 1) * 22050);
				const clampedIndex = Math.max(0, Math.min(44099, index));
				channelData[i] = curve[clampedIndex];
			}
		}

		return newBuffer;
	}

	autoTune(audioBuffer, scale = "major") {
		// Simplified auto-tune - detects pitch and corrects to nearest note
		const newBuffer = this.copyBuffer(audioBuffer);

		// Define scale intervals (semitones from root)
		const scales = {
			major: [0, 2, 4, 5, 7, 9, 11],
			minor: [0, 2, 3, 5, 7, 8, 10],
			chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
		};

		const scaleNotes = scales[scale] || scales.major;

		// This is a simplified implementation
		// Real auto-tune would require pitch detection and PSOLA
		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);

			// Apply subtle pitch correction simulation using scale notes
			for (let i = 0; i < channelData.length; i++) {
				// Simplified: apply slight modulation based on scale
				const noteIndex = i % scaleNotes.length;
				const correction = Math.sin(i * 0.01 * scaleNotes[noteIndex]) * 0.1;
				channelData[i] = channelData[i] * (1 + correction);
			}
		}

		return newBuffer;
	}

	// Phase 1 Priority Effects Implementation

	/**
	 * Bass and Treble - Independent low/high frequency control
	 */
	bassAndTreble(
		audioBuffer,
		bassGain = 0,
		trebleGain = 0,
		bassFreq = 250,
		trebleFreq = 4000,
	) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);

			// Simple shelving filters using biquad coefficients
			// Bass shelf (low shelf)
			const bassShelf = this.createShelfFilter(
				sampleRate,
				bassFreq,
				bassGain,
				"low",
			);
			// Treble shelf (high shelf)
			const trebleShelf = this.createShelfFilter(
				sampleRate,
				trebleFreq,
				trebleGain,
				"high",
			);

			// Apply filters sequentially
			this.applyBiquadFilter(channelData, bassShelf);
			this.applyBiquadFilter(channelData, trebleShelf);
		}

		this.addToHistory("bassAndTreble", {
			bassGain,
			trebleGain,
			bassFreq,
			trebleFreq,
		});
		return newBuffer;
	}

	/**
	 * Graphic EQ - Multi-band slider equalizer
	 */
	graphicEQ(audioBuffer, bands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;

		// Standard 10-band EQ frequencies (31.25Hz to 16kHz)
		const frequencies = [
			31.25, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
		];

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);

			// Apply each band
			for (let i = 0; i < bands.length && i < frequencies.length; i++) {
				if (bands[i] !== 0) {
					const filter = this.createPeakingFilter(
						sampleRate,
						frequencies[i],
						bands[i],
						1.0,
					);
					this.applyBiquadFilter(channelData, filter);
				}
			}
		}

		this.addToHistory("graphicEQ", { bands });
		return newBuffer;
	}

	/**
	 * Notch Filter - Remove specific frequencies
	 */
	notchFilter(audioBuffer, frequency = 60, quality = 30) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);

			// Create notch (band-stop) filter
			const filter = this.createNotchFilter(sampleRate, frequency, quality);
			this.applyBiquadFilter(channelData, filter);
		}

		this.addToHistory("notchFilter", { frequency, quality });
		return newBuffer;
	}

	/**
	 * Click Removal - Vinyl record declicking
	 */
	clickRemoval(audioBuffer, threshold = 200, width = 5) {
		const newBuffer = this.copyBuffer(audioBuffer);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			const length = channelData.length;

			// Detect clicks by looking for sudden amplitude changes
			for (let i = width; i < length - width; i++) {
				const current = Math.abs(channelData[i]);
				const prevAvg = this.getAverageAmplitude(channelData, i - width, i);
				const nextAvg = this.getAverageAmplitude(
					channelData,
					i + 1,
					i + width + 1,
				);

				// If current sample is significantly higher than surrounding samples
				if (current > (threshold * Math.max(prevAvg, nextAvg)) / 100) {
					// Replace with interpolated value
					channelData[i] = (channelData[i - 1] + channelData[i + 1]) / 2;
				}
			}
		}

		this.addToHistory("clickRemoval", { threshold, width });
		return newBuffer;
	}

	/**
	 * Clip Fix - Reconstruct clipped audio
	 */
	clipFix(audioBuffer, threshold = 0.95) {
		const newBuffer = this.copyBuffer(audioBuffer);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			const length = channelData.length;

			for (let i = 1; i < length - 1; i++) {
				const sample = Math.abs(channelData[i]);

				// If sample is clipped (at or near maximum)
				if (sample >= threshold) {
					// Find the extent of the clipped region
					let start = i;
					let end = i;

					// Find start of clipped region
					while (start > 0 && Math.abs(channelData[start - 1]) >= threshold) {
						start--;
					}

					// Find end of clipped region
					while (
						end < length - 1 &&
						Math.abs(channelData[end + 1]) >= threshold
					) {
						end++;
					}

					// Interpolate across the clipped region
					if (start > 0 && end < length - 1) {
						const startValue = channelData[start - 1];
						const endValue = channelData[end + 1];
						const regionLength = end - start + 1;

						for (let j = start; j <= end; j++) {
							const progress = (j - start) / regionLength;
							channelData[j] = startValue + (endValue - startValue) * progress;
						}
					}

					i = end; // Skip past this region
				}
			}
		}

		this.addToHistory("clipFix", { threshold });
		return newBuffer;
	}

	/**
	 * Noise Gate - Threshold-based noise reduction
	 */
	noiseGate(
		audioBuffer,
		threshold = -40,
		attack = 0.001,
		hold = 0.01,
		release = 0.1,
	) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;

		// Convert times to samples
		const attackSamples = Math.floor(attack * sampleRate);
		const holdSamples = Math.floor(hold * sampleRate);
		const releaseSamples = Math.floor(release * sampleRate);

		// Convert threshold from dB to linear
		const thresholdLinear = 10 ** (threshold / 20);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			const length = channelData.length;

			let gateState = "closed"; // 'closed', 'opening', 'open', 'holding', 'closing'
			let gateLevel = 0;
			let holdCounter = 0;
			let envelopeCounter = 0;

			for (let i = 0; i < length; i++) {
				const inputLevel = Math.abs(channelData[i]);

				// Determine gate state
				if (gateState === "closed" && inputLevel > thresholdLinear) {
					gateState = "opening";
					envelopeCounter = 0;
				} else if (gateState === "open" && inputLevel < thresholdLinear) {
					gateState = "holding";
					holdCounter = 0;
				} else if (gateState === "holding") {
					holdCounter++;
					if (holdCounter >= holdSamples) {
						if (inputLevel < thresholdLinear) {
							gateState = "closing";
							envelopeCounter = 0;
						} else {
							gateState = "open";
						}
					}
				}

				// Calculate gate level based on state
				switch (gateState) {
					case "closed":
						gateLevel = 0;
						break;
					case "opening":
						gateLevel = envelopeCounter / attackSamples;
						envelopeCounter++;
						if (envelopeCounter >= attackSamples) {
							gateState = "open";
							gateLevel = 1;
						}
						break;
					case "open":
					case "holding":
						gateLevel = 1;
						break;
					case "closing":
						gateLevel = 1 - envelopeCounter / releaseSamples;
						envelopeCounter++;
						if (envelopeCounter >= releaseSamples) {
							gateState = "closed";
							gateLevel = 0;
						}
						break;
				}

				// Apply gate
				channelData[i] *= Math.max(0, Math.min(1, gateLevel));
			}
		}

		this.addToHistory("noiseGate", { threshold, attack, hold, release });
		return newBuffer;
	}

	/**
	 * Tremolo - Volume modulation
	 */
	tremolo(audioBuffer, rate = 5, depth = 0.5, waveform = "sine") {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);

			for (let i = 0; i < channelData.length; i++) {
				const time = i / sampleRate;
				let modulation;

				switch (waveform) {
					case "sine":
						modulation = Math.sin(2 * Math.PI * rate * time);
						break;
					case "square":
						modulation = Math.sign(Math.sin(2 * Math.PI * rate * time));
						break;
					case "triangle":
						modulation =
							(2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * rate * time));
						break;
					case "sawtooth":
						modulation = 2 * (time * rate - Math.floor(time * rate + 0.5));
						break;
					default:
						modulation = Math.sin(2 * Math.PI * rate * time);
				}

				const amplitude = 1 + modulation * depth;
				channelData[i] *= amplitude;
			}
		}

		this.addToHistory("tremolo", { rate, depth, waveform });
		return newBuffer;
	}

	/**
	 * Wahwah - Frequency sweeping effect
	 */
	wahwah(audioBuffer, rate = 0.5, depth = 0.7, freqOffset = 450) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);

			// State variables for the filter
			let x1 = 0,
				x2 = 0,
				y1 = 0,
				y2 = 0;

			for (let i = 0; i < channelData.length; i++) {
				const time = i / sampleRate;

				// Calculate the sweep frequency
				const lfo = Math.sin(2 * Math.PI * rate * time);
				const frequency = freqOffset + freqOffset * depth * lfo;

				// Resonant filter (simplified)
				const omega = (2 * Math.PI * frequency) / sampleRate;
				const cosOmega = Math.cos(omega);
				const sinOmega = Math.sin(omega);
				const Q = 5; // Resonance
				const alpha = sinOmega / (2 * Q);

				// Biquad coefficients for bandpass filter
				const b0 = alpha;
				const b1 = 0;
				const b2 = -alpha;
				const a0 = 1 + alpha;
				const a1 = -2 * cosOmega;
				const a2 = 1 - alpha;

				// Apply filter
				const input = channelData[i];
				const output =
					(b0 * input + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;

				// Update state
				x2 = x1;
				x1 = input;
				y2 = y1;
				y1 = output;

				channelData[i] = output + input * 0.5; // Mix with dry signal
			}
		}

		this.addToHistory("wahwah", { rate, depth, freqOffset });
		return newBuffer;
	}

	/**
	 * Invert - Phase inversion
	 */
	invert(audioBuffer) {
		const newBuffer = this.copyBuffer(audioBuffer);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			for (let i = 0; i < channelData.length; i++) {
				channelData[i] = -channelData[i];
			}
		}

		this.addToHistory("invert", {});
		return newBuffer;
	}

	/**
	 * Repeat - Audio repetition
	 */
	repeat(audioBuffer, times = 1) {
		const originalLength = audioBuffer.length;
		const newLength = originalLength * (times + 1);

		const newBuffer = this.audioContext.createBuffer(
			audioBuffer.numberOfChannels,
			newLength,
			audioBuffer.sampleRate,
		);

		for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
			const originalData = audioBuffer.getChannelData(channel);
			const newData = newBuffer.getChannelData(channel);

			// Copy original
			for (let i = 0; i < originalLength; i++) {
				newData[i] = originalData[i];
			}

			// Add repeats
			for (let repeat = 1; repeat <= times; repeat++) {
				const offset = repeat * originalLength;
				for (let i = 0; i < originalLength; i++) {
					newData[offset + i] = originalData[i];
				}
			}
		}

		this.addToHistory("repeat", { times });
		return newBuffer;
	}

	/**
	 * Reverse - Audio reversal
	 */
	reverse(audioBuffer) {
		const newBuffer = this.copyBuffer(audioBuffer);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			const length = channelData.length;

			// Reverse the array
			for (let i = 0; i < length / 2; i++) {
				const temp = channelData[i];
				channelData[i] = channelData[length - 1 - i];
				channelData[length - 1 - i] = temp;
			}
		}

		this.addToHistory("reverse", {});
		return newBuffer;
	}

	// Helper methods for new effects

	createShelfFilter(sampleRate, frequency, gain, type) {
		const omega = (2 * Math.PI * frequency) / sampleRate;
		const cosOmega = Math.cos(omega);
		const sinOmega = Math.sin(omega);
		const A = 10 ** (gain / 40);
		const S = 1; // Shelf slope
		const beta = Math.sqrt(A) / S;

		let b0, b1, b2, a0, a1, a2;

		if (type === "low") {
			// Low shelf
			b0 = A * (A + 1 - (A - 1) * cosOmega + beta * sinOmega);
			b1 = 2 * A * (A - 1 - (A + 1) * cosOmega);
			b2 = A * (A + 1 - (A - 1) * cosOmega - beta * sinOmega);
			a0 = A + 1 + (A - 1) * cosOmega + beta * sinOmega;
			a1 = -2 * (A - 1 + (A + 1) * cosOmega);
			a2 = A + 1 + (A - 1) * cosOmega - beta * sinOmega;
		} else {
			// High shelf
			b0 = A * (A + 1 + (A - 1) * cosOmega + beta * sinOmega);
			b1 = -2 * A * (A - 1 + (A + 1) * cosOmega);
			b2 = A * (A + 1 + (A - 1) * cosOmega - beta * sinOmega);
			a0 = A + 1 - (A - 1) * cosOmega + beta * sinOmega;
			a1 = 2 * (A - 1 - (A + 1) * cosOmega);
			a2 = A + 1 - (A - 1) * cosOmega - beta * sinOmega;
		}

		return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
	}

	createPeakingFilter(sampleRate, frequency, gain, Q) {
		const omega = (2 * Math.PI * frequency) / sampleRate;
		const cosOmega = Math.cos(omega);
		const sinOmega = Math.sin(omega);
		const A = 10 ** (gain / 40);
		const alpha = sinOmega / (2 * Q);

		const b0 = 1 + alpha * A;
		const b1 = -2 * cosOmega;
		const b2 = 1 - alpha * A;
		const a0 = 1 + alpha / A;
		const a1 = -2 * cosOmega;
		const a2 = 1 - alpha / A;

		return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
	}

	createNotchFilter(sampleRate, frequency, Q) {
		const omega = (2 * Math.PI * frequency) / sampleRate;
		const cosOmega = Math.cos(omega);
		const sinOmega = Math.sin(omega);
		const alpha = sinOmega / (2 * Q);

		const b0 = 1;
		const b1 = -2 * cosOmega;
		const b2 = 1;
		const a0 = 1 + alpha;
		const a1 = -2 * cosOmega;
		const a2 = 1 - alpha;

		return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
	}

	applyBiquadFilter(channelData, filter) {
		let x1 = 0,
			x2 = 0,
			y1 = 0,
			y2 = 0;

		for (let i = 0; i < channelData.length; i++) {
			const input = channelData[i];
			const output =
				filter.b0 * input +
				filter.b1 * x1 +
				filter.b2 * x2 -
				filter.a1 * y1 -
				filter.a2 * y2;

			x2 = x1;
			x1 = input;
			y2 = y1;
			y1 = output;

			channelData[i] = output;
		}
	}

	getAverageAmplitude(channelData, start, end) {
		let sum = 0;
		for (let i = start; i < end && i < channelData.length; i++) {
			sum += Math.abs(channelData[i]);
		}
		return sum / (end - start);
	}

	// New professional effects
	limiter(audioBuffer, threshold = -6, makeupGain = 0, lookahead = 5) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;
		const thresholdLinear = 10 ** (threshold / 20);
		const makeupLinear = 10 ** (makeupGain / 20);
		const lookaheadSamples = Math.floor((lookahead / 1000) * sampleRate);

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			const delayedSignal = new Float32Array(
				channelData.length + lookaheadSamples,
			);

			// Copy with lookahead delay
			for (let i = 0; i < channelData.length; i++) {
				delayedSignal[i + lookaheadSamples] = channelData[i];
			}

			// Peak detection and limiting
			for (let i = 0; i < channelData.length; i++) {
				let peak = 0;
				// Look ahead for peaks
				for (
					let j = 0;
					j < lookaheadSamples && i + j < channelData.length;
					j++
				) {
					peak = Math.max(peak, Math.abs(channelData[i + j]));
				}

				let gain = 1;
				if (peak > thresholdLinear) {
					gain = thresholdLinear / peak;
				}

				channelData[i] = delayedSignal[i] * gain * makeupLinear;
				channelData[i] = Math.max(-1, Math.min(1, channelData[i]));
			}
		}

		this.addToHistory("limiter", { threshold, makeupGain, lookahead });
		return newBuffer;
	}

	changeTempo(audioBuffer, tempoRatio = 1.0) {
		// Simple tempo change using PSOLA-like approach
		const newLength = Math.floor(audioBuffer.length / tempoRatio);
		const newBuffer = this.audioContext.createBuffer(
			audioBuffer.numberOfChannels,
			newLength,
			audioBuffer.sampleRate,
		);

		const frameSize = 1024;
		const hopSize = frameSize / 4;
		const overlap = frameSize - hopSize;

		for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
			const inputData = audioBuffer.getChannelData(channel);
			const outputData = newBuffer.getChannelData(channel);

			// Simple overlap-add time stretching
			for (let i = 0; i < newLength - frameSize; i += hopSize) {
				const sourcePos = i * tempoRatio;
				const sourceIndex = Math.floor(sourcePos);

				if (sourceIndex + frameSize < inputData.length) {
					// Copy frame with overlap
					for (let j = 0; j < frameSize; j++) {
						if (i + j < outputData.length) {
							const fade = j < overlap ? j / overlap : 1;
							outputData[i + j] += inputData[sourceIndex + j] * fade;
						}
					}
				}
			}
		}

		this.addToHistory("changeTempo", { tempoRatio });
		return newBuffer;
	}

	vocoder(audioBuffer, carrierFreq = 440, numBands = 16) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;
		const nyquist = sampleRate / 2;

		// Create filter bank
		const filters = [];
		for (let i = 0; i < numBands; i++) {
			const freq = (carrierFreq / 2) * 2 ** (i / numBands);
			if (freq < nyquist) {
				const filter = this.createPeakingFilter(sampleRate, freq, 0, 2);
				filters.push({ freq, filter });
			}
		}

		// Generate carrier signal
		const carrier = new Float32Array(audioBuffer.length);
		for (let i = 0; i < carrier.length; i++) {
			carrier[i] = Math.sin((2 * Math.PI * carrierFreq * i) / sampleRate) * 0.5;
		}

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			const output = new Float32Array(channelData.length);

			// Process each frequency band
			filters.forEach(({ filter }) => {
				const modulatorBand = new Float32Array(channelData);
				const carrierBand = new Float32Array(carrier);

				// Filter both signals
				this.applyBiquadFilter(modulatorBand, filter);
				this.applyBiquadFilter(carrierBand, filter);

				// Extract envelope from modulator
				for (let i = 0; i < modulatorBand.length; i++) {
					const envelope = Math.abs(modulatorBand[i]);
					output[i] += carrierBand[i] * envelope;
				}
			});

			// Copy result back
			for (let i = 0; i < channelData.length; i++) {
				channelData[i] = output[i] / numBands;
			}
		}

		this.addToHistory("vocoder", { carrierFreq, numBands });
		return newBuffer;
	}

	filterCurveEQ(audioBuffer, curve = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) {
		const newBuffer = this.copyBuffer(audioBuffer);
		const sampleRate = audioBuffer.sampleRate;
		const frequencies = [
			31.25, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
		];

		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);

			// Apply each band
			curve.forEach((gain, index) => {
				if (gain !== 0 && index < frequencies.length) {
					const filter = this.createPeakingFilter(
						sampleRate,
						frequencies[index],
						gain,
						1,
					);
					this.applyBiquadFilter(channelData, filter);
				}
			});
		}

		this.addToHistory("filterCurveEQ", { curve });
		return newBuffer;
	}

	loudnessNormalization(audioBuffer, targetLUFS = -23) {
		// Simplified loudness normalization (full EBU R128 would be more complex)
		const newBuffer = this.copyBuffer(audioBuffer);

		// Calculate RMS for approximate loudness
		let totalRMS = 0;
		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			let sum = 0;
			for (let i = 0; i < channelData.length; i++) {
				sum += channelData[i] * channelData[i];
			}
			totalRMS += Math.sqrt(sum / channelData.length);
		}

		const avgRMS = totalRMS / newBuffer.numberOfChannels;
		const currentLUFS = 20 * Math.log10(avgRMS) - 10; // Approximation
		const gainDb = targetLUFS - currentLUFS;
		const gain = 10 ** (gainDb / 20);

		// Apply gain
		for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
			const channelData = newBuffer.getChannelData(channel);
			for (let i = 0; i < channelData.length; i++) {
				channelData[i] *= gain;
				channelData[i] = Math.max(-1, Math.min(1, channelData[i]));
			}
		}

		this.addToHistory("loudnessNormalization", { targetLUFS });
		return newBuffer;
	}

	paulstretch(audioBuffer, stretchFactor = 2.0) {
		// Extreme time-stretching using FFT approach
		const newLength = Math.floor(audioBuffer.length * stretchFactor);
		const newBuffer = this.audioContext.createBuffer(
			audioBuffer.numberOfChannels,
			newLength,
			audioBuffer.sampleRate,
		);

		const frameSize = 2048;
		const hopIn = frameSize / 4;
		const hopOut = Math.floor(hopIn * stretchFactor);

		for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
			const inputData = audioBuffer.getChannelData(channel);
			const outputData = newBuffer.getChannelData(channel);

			// Simple overlap-add with larger frames for extreme stretching
			for (let pos = 0; pos < newLength - frameSize; pos += hopOut) {
				const sourcePos = Math.floor(pos / stretchFactor);

				if (sourcePos + frameSize < inputData.length) {
					for (let j = 0; j < frameSize; j++) {
						const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * j) / frameSize); // Hann window
						if (pos + j < outputData.length) {
							outputData[pos + j] += inputData[sourcePos + j] * window * 0.5;
						}
					}
				}
			}
		}

		this.addToHistory("paulstretch", { stretchFactor });
		return newBuffer;
	}
}
