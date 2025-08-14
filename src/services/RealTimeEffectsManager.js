/**
 * Real-time Effects Manager for WebAudacity
 * Manages real-time audio effects processing during playback
 */

export class RealTimeEffectsManager {
	constructor(audioContext) {
		this.audioContext = audioContext;
		this.effectChain = [];
		this.inputNode = null;
		this.outputNode = null;
		this.isActive = false;
		this.bypassedEffects = new Set();
		this.wetDryMix = 1.0; // 0 = dry, 1 = wet
		this.onEffectChainChanged = null;
	}

	/**
	 * Initialize the real-time effects system
	 * @param {AudioNode} inputNode - Input audio node
	 * @param {AudioNode} outputNode - Output audio node
	 */
	initialize(inputNode, outputNode) {
		this.inputNode = inputNode;
		this.outputNode = outputNode;
		this.setupEffectChain();
		this.isActive = true;
	}

	/**
	 * Add an effect to the chain
	 * @param {string} effectType - Type of effect
	 * @param {Object} parameters - Effect parameters
	 * @param {number} position - Position in chain (optional)
	 * @returns {string} - Effect ID
	 */
	addEffect(effectType, parameters = {}, position = -1) {
		const effectId = `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		const effect = {
			id: effectId,
			type: effectType,
			parameters: { ...parameters },
			nodes: this.createEffectNodes(effectType, parameters),
			bypass: false,
			wetDryMix: 1.0,
			created: Date.now(),
		};

		// Insert at position or add to end
		if (position >= 0 && position < this.effectChain.length) {
			this.effectChain.splice(position, 0, effect);
		} else {
			this.effectChain.push(effect);
		}

		this.reconnectEffectChain();
		this.notifyEffectChainChanged();
		return effectId;
	}

	/**
	 * Remove an effect from the chain
	 * @param {string} effectId - Effect ID to remove
	 * @returns {boolean} - Success status
	 */
	removeEffect(effectId) {
		const index = this.effectChain.findIndex(
			(effect) => effect.id === effectId,
		);
		if (index === -1) return false;

		const effect = this.effectChain[index];
		this.disconnectEffect(effect);
		this.effectChain.splice(index, 1);
		this.reconnectEffectChain();
		this.notifyEffectChainChanged();
		return true;
	}

	/**
	 * Update effect parameters in real-time
	 * @param {string} effectId - Effect ID
	 * @param {Object} parameters - New parameters
	 * @returns {boolean} - Success status
	 */
	updateEffectParameters(effectId, parameters) {
		const effect = this.effectChain.find((e) => e.id === effectId);
		if (!effect) return false;

		// Update parameters object
		Object.assign(effect.parameters, parameters);

		// Apply parameter changes to audio nodes
		this.applyParametersToNodes(effect, parameters);
		this.notifyEffectChainChanged();
		return true;
	}

	/**
	 * Toggle effect bypass
	 * @param {string} effectId - Effect ID
	 * @param {boolean} bypass - Bypass state
	 * @returns {boolean} - Success status
	 */
	bypassEffect(effectId, bypass = true) {
		const effect = this.effectChain.find((e) => e.id === effectId);
		if (!effect) return false;

		effect.bypass = bypass;
		if (bypass) {
			this.bypassedEffects.add(effectId);
		} else {
			this.bypassedEffects.delete(effectId);
		}

		this.reconnectEffectChain();
		this.notifyEffectChainChanged();
		return true;
	}

	/**
	 * Reorder effects in the chain
	 * @param {string} effectId - Effect to move
	 * @param {number} newPosition - New position
	 * @returns {boolean} - Success status
	 */
	reorderEffect(effectId, newPosition) {
		const currentIndex = this.effectChain.findIndex((e) => e.id === effectId);
		if (currentIndex === -1) return false;

		const effect = this.effectChain.splice(currentIndex, 1)[0];
		const clampedPosition = Math.max(
			0,
			Math.min(newPosition, this.effectChain.length),
		);
		this.effectChain.splice(clampedPosition, 0, effect);

		this.reconnectEffectChain();
		this.notifyEffectChainChanged();
		return true;
	}

	/**
	 * Create audio nodes for a specific effect type
	 * @param {string} effectType - Type of effect
	 * @param {Object} parameters - Effect parameters
	 * @returns {Object} - Audio nodes and controls
	 */
	createEffectNodes(effectType, parameters) {
		const ctx = this.audioContext;

		switch (effectType) {
			case "lowpass":
			case "highpass":
			case "bandpass":
			case "notch": {
				const filter = ctx.createBiquadFilter();
				filter.type = effectType;
				filter.frequency.value = parameters.frequency || 1000;
				filter.Q.value = parameters.q || 1;
				return {
					input: filter,
					output: filter,
					filter: filter,
				};
			}

			case "reverb": {
				const convolver = ctx.createConvolver();
				const wetGain = ctx.createGain();
				const dryGain = ctx.createGain();
				const mixer = ctx.createGain();

				// Create impulse response for reverb
				const length = (parameters.roomSize || 2) * ctx.sampleRate;
				const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

				for (let channel = 0; channel < 2; channel++) {
					const channelData = buffer.getChannelData(channel);
					for (let i = 0; i < length; i++) {
						channelData[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
					}
				}
				convolver.buffer = buffer;

				wetGain.gain.value = parameters.wetLevel || 0.3;
				dryGain.gain.value = 1 - (parameters.wetLevel || 0.3);

				return {
					input: ctx.createGain(),
					output: mixer,
					convolver,
					wetGain,
					dryGain,
					mixer,
				};
			}

			case "delay": {
				const delayNode = ctx.createDelay(2);
				const feedback = ctx.createGain();
				const wetGain = ctx.createGain();
				const dryGain = ctx.createGain();
				const mixer = ctx.createGain();

				delayNode.delayTime.value = parameters.delayTime || 0.2;
				feedback.gain.value = parameters.feedback || 0.3;
				wetGain.gain.value = parameters.wetLevel || 0.5;
				dryGain.gain.value = 1 - (parameters.wetLevel || 0.5);

				// Connect delay feedback loop
				delayNode.connect(feedback);
				feedback.connect(delayNode);

				return {
					input: ctx.createGain(),
					output: mixer,
					delay: delayNode,
					feedback,
					wetGain,
					dryGain,
					mixer,
				};
			}

			case "compression": {
				const compressor = ctx.createDynamicsCompressor();
				compressor.threshold.value = parameters.threshold || -24;
				compressor.knee.value = parameters.knee || 30;
				compressor.ratio.value = parameters.ratio || 12;
				compressor.attack.value = parameters.attack || 0.003;
				compressor.release.value = parameters.release || 0.25;

				return {
					input: compressor,
					output: compressor,
					compressor,
				};
			}

			case "distortion": {
				const waveshaper = ctx.createWaveShaper();
				const gain = ctx.createGain();

				// Create distortion curve
				const amount = parameters.amount || 50;
				const samples = 44100;
				const curve = new Float32Array(samples);
				for (let i = 0; i < samples; i++) {
					const x = (i * 2) / samples - 1;
					curve[i] =
						((3 + amount) * x * 20 * Math.PI) /
						180 /
						(Math.PI + amount * Math.abs(x));
				}
				waveshaper.curve = curve;
				waveshaper.oversample = "4x";

				gain.gain.value = parameters.outputGain || 0.5;

				return {
					input: waveshaper,
					output: gain,
					waveshaper,
					gain,
				};
			}

			case "chorus": {
				const delay1 = ctx.createDelay(0.1);
				const delay2 = ctx.createDelay(0.1);
				const lfo1 = ctx.createOscillator();
				const lfo2 = ctx.createOscillator();
				const lfoGain1 = ctx.createGain();
				const lfoGain2 = ctx.createGain();
				const wetGain = ctx.createGain();
				const dryGain = ctx.createGain();
				const mixer = ctx.createGain();

				// Configure LFOs
				lfo1.frequency.value = parameters.rate || 1.5;
				lfo2.frequency.value = (parameters.rate || 1.5) * 1.1;
				lfoGain1.gain.value = parameters.depth || 0.01;
				lfoGain2.gain.value = parameters.depth || 0.01;

				wetGain.gain.value = parameters.wetLevel || 0.5;
				dryGain.gain.value = 1 - (parameters.wetLevel || 0.5);

				// Start LFOs
				lfo1.start();
				lfo2.start();

				return {
					input: ctx.createGain(),
					output: mixer,
					delay1,
					delay2,
					lfo1,
					lfo2,
					lfoGain1,
					lfoGain2,
					wetGain,
					dryGain,
					mixer,
				};
			}

			default: {
				// Pass-through for unknown effects
				const passthrough = ctx.createGain();
				return {
					input: passthrough,
					output: passthrough,
				};
			}
		}
	}

	/**
	 * Apply parameter changes to audio nodes
	 * @param {Object} effect - Effect object
	 * @param {Object} parameters - Parameters to update
	 */
	applyParametersToNodes(effect, parameters) {
		const nodes = effect.nodes;
		const ctx = this.audioContext;

		switch (effect.type) {
			case "lowpass":
			case "highpass":
			case "bandpass":
			case "notch":
				if (parameters.frequency !== undefined) {
					nodes.filter.frequency.setTargetAtTime(
						parameters.frequency,
						ctx.currentTime,
						0.01,
					);
				}
				if (parameters.q !== undefined) {
					nodes.filter.Q.setTargetAtTime(parameters.q, ctx.currentTime, 0.01);
				}
				break;

			case "reverb":
				if (parameters.wetLevel !== undefined) {
					nodes.wetGain.gain.setTargetAtTime(
						parameters.wetLevel,
						ctx.currentTime,
						0.01,
					);
					nodes.dryGain.gain.setTargetAtTime(
						1 - parameters.wetLevel,
						ctx.currentTime,
						0.01,
					);
				}
				break;

			case "delay":
				if (parameters.delayTime !== undefined) {
					nodes.delay.delayTime.setTargetAtTime(
						parameters.delayTime,
						ctx.currentTime,
						0.01,
					);
				}
				if (parameters.feedback !== undefined) {
					nodes.feedback.gain.setTargetAtTime(
						parameters.feedback,
						ctx.currentTime,
						0.01,
					);
				}
				if (parameters.wetLevel !== undefined) {
					nodes.wetGain.gain.setTargetAtTime(
						parameters.wetLevel,
						ctx.currentTime,
						0.01,
					);
					nodes.dryGain.gain.setTargetAtTime(
						1 - parameters.wetLevel,
						ctx.currentTime,
						0.01,
					);
				}
				break;

			case "compression":
				if (parameters.threshold !== undefined) {
					nodes.compressor.threshold.setTargetAtTime(
						parameters.threshold,
						ctx.currentTime,
						0.01,
					);
				}
				if (parameters.ratio !== undefined) {
					nodes.compressor.ratio.setTargetAtTime(
						parameters.ratio,
						ctx.currentTime,
						0.01,
					);
				}
				if (parameters.attack !== undefined) {
					nodes.compressor.attack.setTargetAtTime(
						parameters.attack,
						ctx.currentTime,
						0.01,
					);
				}
				if (parameters.release !== undefined) {
					nodes.compressor.release.setTargetAtTime(
						parameters.release,
						ctx.currentTime,
						0.01,
					);
				}
				break;

			// Add more parameter mappings as needed
		}
	}

	/**
	 * Set up the initial effect chain
	 */
	setupEffectChain() {
		if (!this.inputNode || !this.outputNode) return;

		// Initially connect input directly to output
		this.inputNode.connect(this.outputNode);
	}

	/**
	 * Reconnect the entire effect chain
	 */
	reconnectEffectChain() {
		if (!this.inputNode || !this.outputNode) return;

		// Disconnect everything first
		try {
			this.inputNode.disconnect();
			this.effectChain.forEach((effect) => {
				if (effect.nodes.input && effect.nodes.output) {
					effect.nodes.input.disconnect();
					effect.nodes.output.disconnect();
				}
			});
		} catch {
			// Ignore disconnection errors
		}

		// Reconnect the chain
		let currentNode = this.inputNode;

		for (const effect of this.effectChain) {
			if (!effect.bypass && effect.nodes.input && effect.nodes.output) {
				currentNode.connect(effect.nodes.input);
				currentNode = effect.nodes.output;
			}
		}

		// Connect final node to output
		currentNode.connect(this.outputNode);
	}

	/**
	 * Disconnect an effect's nodes
	 * @param {Object} effect - Effect to disconnect
	 */
	disconnectEffect(effect) {
		try {
			if (effect.nodes.input) effect.nodes.input.disconnect();
			if (effect.nodes.output) effect.nodes.output.disconnect();

			// Disconnect any internal nodes
			Object.values(effect.nodes).forEach((node) => {
				if (node && typeof node.disconnect === "function") {
					node.disconnect();
				}
			});
		} catch {
			// Ignore disconnection errors
		}
	}

	/**
	 * Get the current effect chain
	 * @returns {Array} - Array of effects
	 */
	getEffectChain() {
		return this.effectChain.map((effect) => ({
			id: effect.id,
			type: effect.type,
			parameters: { ...effect.parameters },
			bypass: effect.bypass,
			wetDryMix: effect.wetDryMix,
		}));
	}

	/**
	 * Clear all effects
	 */
	clearEffects() {
		this.effectChain.forEach((effect) => this.disconnectEffect(effect));
		this.effectChain = [];
		this.bypassedEffects.clear();
		this.reconnectEffectChain();
		this.notifyEffectChainChanged();
	}

	/**
	 * Get effect by ID
	 * @param {string} effectId - Effect ID
	 * @returns {Object|null} - Effect object or null
	 */
	getEffect(effectId) {
		return this.effectChain.find((e) => e.id === effectId) || null;
	}

	/**
	 * Enable/disable the entire effects system
	 * @param {boolean} active - Active state
	 */
	setActive(active) {
		this.isActive = active;
		if (active) {
			this.reconnectEffectChain();
		} else {
			// Direct connection, bypassing all effects
			try {
				this.inputNode.disconnect();
				this.inputNode.connect(this.outputNode);
			} catch {
				// Ignore connection errors
			}
		}
		this.notifyEffectChainChanged();
	}

	/**
	 * Set callback for effect chain changes
	 * @param {Function} callback - Callback function
	 */
	setOnEffectChainChanged(callback) {
		this.onEffectChainChanged = callback;
	}

	/**
	 * Notify listeners of effect chain changes
	 */
	notifyEffectChainChanged() {
		if (this.onEffectChainChanged) {
			this.onEffectChainChanged(this.getEffectChain());
		}
	}

	/**
	 * Cleanup resources
	 */
	destroy() {
		this.clearEffects();
		this.inputNode = null;
		this.outputNode = null;
		this.isActive = false;
	}
}

export default RealTimeEffectsManager;
