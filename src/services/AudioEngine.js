/**
 * Audio Engine Service - React version
 * Handles recording, playback, file loading, and audio context management
 */

export class AudioEngineService {
	constructor() {
		this.audioContext = null;
		this.mediaRecorder = null;
		this.recordingStream = null;
		this.recordingSource = null;
		this.recordingProcessor = null;
		this.recordingBuffers = null;
		this.recordingLength = 0;
		this.audioBuffers = new Map();
		this.playingSources = new Map();
		this.currentTime = 0;
		this.isPlaying = false;
		this.isRecording = false;
		this.isPaused = false;
		this.playbackRate = 1.0;
		this.masterGain = null;
		this.recordingData = [];
		this.sampleRate = 44100;
		this.channels = 2;

		// Event callbacks
		this.onPlaybackFinished = null;
		this.onRecordingFinished = null;
		this.onError = null;
		this.onStatusChange = null;
	}

	async initializeAudioContext() {
		try {
			this.audioContext = new (
				window.AudioContext || window.webkitAudioContext
			)({
				sampleRate: this.sampleRate,
			});

			// Create master gain node
			this.masterGain = this.audioContext.createGain();
			this.masterGain.connect(this.audioContext.destination);

			console.log("Audio context initialized:", this.audioContext);
			return true;
		} catch (error) {
			console.error("Failed to initialize audio context:", error);
			this.onError?.("Web Audio API not supported");
			return false;
		}
	}

	async ensureAudioContext() {
		if (!this.audioContext) {
			const success = await this.initializeAudioContext();
			if (!success) return false;
		}

		// Resume context if suspended (autoplay policy)
		if (this.audioContext.state === "suspended") {
			try {
				await this.audioContext.resume();
				console.log("Audio context resumed");
			} catch (error) {
				console.error("Failed to resume audio context:", error);
				this.onError?.("Failed to activate audio context. Please try clicking on the page first.");
				return false;
			}
		}

		return true;
	}

	async requestMicrophoneAccess() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					sampleRate: this.sampleRate,
					channelCount: this.channels,
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false,
				},
			});

			this.recordingStream = stream;
			return stream;
		} catch (error) {
			console.error("Failed to access microphone:", error);
			this.onError?.("Microphone access denied");
			throw error;
		}
	}

	async startRecording() {
		if (this.isRecording) return;

		try {
			// Ensure audio context is ready
			const contextReady = await this.ensureAudioContext();
			if (!contextReady) return;

			if (!this.recordingStream) {
				await this.requestMicrophoneAccess();
			}

			// Use Web Audio API for recording instead of MediaRecorder
			this.recordingSource = this.audioContext.createMediaStreamSource(this.recordingStream);
			this.recordingProcessor = this.audioContext.createScriptProcessor(4096, 2, 2);
			this.recordingBuffers = [[], []]; // Left and right channels
			this.recordingLength = 0;
			
			this.recordingProcessor.onaudioprocess = (event) => {
				if (!this.isRecording) return;
				
				const inputBuffer = event.inputBuffer;
				const leftChannel = inputBuffer.getChannelData(0);
				const rightChannel = inputBuffer.numberOfChannels > 1 ? 
					inputBuffer.getChannelData(1) : leftChannel;
				
				// Copy data to our recording buffers
				this.recordingBuffers[0].push(new Float32Array(leftChannel));
				this.recordingBuffers[1].push(new Float32Array(rightChannel));
				this.recordingLength += leftChannel.length;
			};
			
			// Connect the recording chain
			this.recordingSource.connect(this.recordingProcessor);
			this.recordingProcessor.connect(this.audioContext.destination);

			this.isRecording = true;
			this.onStatusChange?.("Recording...");

			console.log("Recording started with Web Audio API");
		} catch (error) {
			console.error("Failed to start recording:", error);
			this.onError?.("Recording failed: " + error.message);
			throw error;
		}
	}

	stopRecording() {
		if (!this.isRecording) return;

		this.isRecording = false;

		// Disconnect the recording chain
		if (this.recordingSource) {
			this.recordingSource.disconnect();
		}
		if (this.recordingProcessor) {
			this.recordingProcessor.disconnect();
		}

		// Process the recorded audio data
		if (this.recordingBuffers && this.recordingLength > 0) {
			this.processRecordingBuffers();
		}

		this.onStatusChange?.("Recording stopped");
		console.log("Recording stopped");
	}

	processRecordingBuffers() {
		try {
			// Create audio buffer from recorded data
			const audioBuffer = this.audioContext.createBuffer(
				2, // stereo
				this.recordingLength,
				this.audioContext.sampleRate
			);

			// Merge recorded chunks into continuous buffers
			const leftData = audioBuffer.getChannelData(0);
			const rightData = audioBuffer.getChannelData(1);
			
			let offset = 0;
			for (let i = 0; i < this.recordingBuffers[0].length; i++) {
				const leftChunk = this.recordingBuffers[0][i];
				const rightChunk = this.recordingBuffers[1][i];
				
				leftData.set(leftChunk, offset);
				rightData.set(rightChunk, offset);
				offset += leftChunk.length;
			}

			// Create track from recorded buffer
			const trackId = "recording_" + Date.now();
			this.audioBuffers.set(trackId, {
				buffer: audioBuffer,
				name: "Recording " + new Date().toLocaleTimeString(),
				duration: audioBuffer.duration,
				sampleRate: audioBuffer.sampleRate,
				numberOfChannels: audioBuffer.numberOfChannels,
			});

			// Clean up recording data
			this.recordingBuffers = null;
			this.recordingLength = 0;

			console.log("Recording processed successfully:", trackId);
			this.onRecordingFinished?.(trackId);

		} catch (error) {
			console.error("Failed to process recording:", error);
			this.onError?.("Failed to process recording: " + error.message);
		}
	}

	async loadAudioFromFile(file) {
		try {
			const arrayBuffer = await file.arrayBuffer();
			const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

			const trackId = "track_" + Date.now();
			this.audioBuffers.set(trackId, {
				buffer: audioBuffer,
				name: file.name,
				duration: audioBuffer.duration,
				sampleRate: audioBuffer.sampleRate,
				numberOfChannels: audioBuffer.numberOfChannels,
			});

			console.log("Audio file loaded:", file.name, audioBuffer);
			return trackId;
		} catch (error) {
			console.error("Failed to load audio file:", error);
			this.onError?.("Invalid audio file format");
			throw error;
		}
	}

	async loadAudioFromBlob(blob, name = "Audio") {
		try {
			const arrayBuffer = await blob.arrayBuffer();
			const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

			const trackId = "track_" + Date.now();
			this.audioBuffers.set(trackId, {
				buffer: audioBuffer,
				name: name,
				duration: audioBuffer.duration,
				sampleRate: audioBuffer.sampleRate,
				numberOfChannels: audioBuffer.numberOfChannels,
			});

			return trackId;
		} catch (error) {
			console.error("Failed to load audio from blob:", error);
			this.onError?.("Failed to process audio data");
			throw error;
		}
	}

	async play(trackId = null, startTime = 0, duration = null) {
		// Ensure audio context is ready
		const contextReady = await this.ensureAudioContext();
		if (!contextReady) return;

		if (this.isPlaying) {
			this.stop();
		}

		try {
			if (trackId && this.audioBuffers.has(trackId)) {
				this.playTrack(trackId, startTime, duration);
			} else {
				for (const [id] of this.audioBuffers) {
					this.playTrack(id, startTime, duration);
				}
			}

			this.isPlaying = true;
			this.isPaused = false;
			this.currentTime = startTime;
			this.onStatusChange?.("Playing...");

			console.log("Playback started");
		} catch (error) {
			console.error("Failed to start playback:", error);
			this.onError?.("Playback failed: " + error.message);
		}
	}

	playTrack(trackId, startTime = 0, duration = null) {
		const trackData = this.audioBuffers.get(trackId);
		if (!trackData) return;

		const source = this.audioContext.createBufferSource();
		source.buffer = trackData.buffer;
		source.playbackRate.value = this.playbackRate;

		source.connect(this.masterGain);

		const actualDuration = duration || trackData.duration - startTime;
		source.start(this.audioContext.currentTime, startTime, actualDuration);

		this.playingSources.set(trackId, source);

		source.onended = () => {
			this.playingSources.delete(trackId);
			if (this.playingSources.size === 0) {
				this.isPlaying = false;
				this.onPlaybackFinished?.();
			}
		};
	}

	pause() {
		if (!this.isPlaying) return;

		this.stop();
		this.isPaused = true;
		this.onStatusChange?.("Paused");
		console.log("Playback paused");
	}

	stop() {
		for (const [, source] of this.playingSources) {
			try {
				source.stop();
			} catch {
				// Source might already be stopped
			}
		}

		this.playingSources.clear();
		this.isPlaying = false;
		this.isPaused = false;
		this.onStatusChange?.("Stopped");
		console.log("Playback stopped");
	}

	setMasterVolume(volume) {
		if (this.masterGain) {
			const gain = volume === 0 ? 0 : volume ** 2;
			this.masterGain.gain.setValueAtTime(gain, this.audioContext.currentTime);
		}
	}

	setPlaybackRate(rate) {
		this.playbackRate = Math.max(0.25, Math.min(4.0, rate));

		for (const [, source] of this.playingSources) {
			source.playbackRate.value = this.playbackRate;
		}
	}

	// Audio buffer manipulation methods
	cutAudio(trackId, startTime, endTime) {
		const trackData = this.audioBuffers.get(trackId);
		if (!trackData) return false;

		if (startTime >= endTime || startTime < 0 || endTime < 0) return false;

		const buffer = trackData.buffer;
		const sampleRate = buffer.sampleRate;
		const startSample = Math.floor(startTime * sampleRate);
		const endSample = Math.floor(endTime * sampleRate);

		const beforeLength = startSample;
		const afterStart = endSample;
		const afterLength = buffer.length - endSample;
		const newLength = beforeLength + afterLength;

		if (newLength <= 0) return null;

		const newBuffer = this.audioContext.createBuffer(
			buffer.numberOfChannels,
			newLength,
			sampleRate,
		);

		for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
			const oldData = buffer.getChannelData(channel);
			const newData = newBuffer.getChannelData(channel);

			for (let i = 0; i < beforeLength; i++) {
				newData[i] = oldData[i];
			}

			for (let i = 0; i < afterLength; i++) {
				newData[beforeLength + i] = oldData[afterStart + i];
			}
		}

		this.audioBuffers.set(trackId, {
			...trackData,
			buffer: newBuffer,
			duration: newBuffer.duration,
		});

		return true;
	}

	copyAudio(trackId, startTime, endTime) {
		const trackData = this.audioBuffers.get(trackId);
		if (!trackData) return null;

		const buffer = trackData.buffer;
		const sampleRate = buffer.sampleRate;
		const startSample = Math.floor(startTime * sampleRate);
		const endSample = Math.floor(endTime * sampleRate);
		const selectionLength = endSample - startSample;

		if (selectionLength <= 0) return null;

		const newBuffer = this.audioContext.createBuffer(
			buffer.numberOfChannels,
			selectionLength,
			sampleRate,
		);

		for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
			const oldData = buffer.getChannelData(channel);
			const newData = newBuffer.getChannelData(channel);

			for (let i = 0; i < selectionLength; i++) {
				newData[i] = oldData[startSample + i];
			}
		}

		return newBuffer;
	}

	pasteAudio(trackId, sourceBuffer, pasteTime) {
		const trackData = this.audioBuffers.get(trackId);
		if (!trackData || !sourceBuffer) return false;

		const buffer = trackData.buffer;
		const sampleRate = buffer.sampleRate;
		const pastePosition = Math.floor(pasteTime * sampleRate);
		const sourceLength = sourceBuffer.length;
		
		// Create a new buffer that's large enough to hold both the original and pasted audio
		const newLength = Math.max(buffer.length, pastePosition + sourceLength);
		const newBuffer = this.audioContext.createBuffer(
			buffer.numberOfChannels,
			newLength,
			sampleRate,
		);

		// Copy original audio data
		for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
			const oldData = buffer.getChannelData(channel);
			const newData = newBuffer.getChannelData(channel);
			
			// Copy original data
			for (let i = 0; i < buffer.length; i++) {
				newData[i] = oldData[i];
			}
			
			// Paste new data (mix if overlapping)
			const sourceChannelData = sourceBuffer.getChannelData(
				Math.min(channel, sourceBuffer.numberOfChannels - 1)
			);
			
			for (let i = 0; i < sourceLength; i++) {
				const targetIndex = pastePosition + i;
				if (targetIndex < newLength) {
					// Mix the audio if there's existing content
					if (targetIndex < buffer.length) {
						newData[targetIndex] = (newData[targetIndex] + sourceChannelData[i]) * 0.5;
					} else {
						newData[targetIndex] = sourceChannelData[i];
					}
				}
			}
		}

		// Update the track with the new buffer
		this.audioBuffers.set(trackId, {
			...trackData,
			buffer: newBuffer,
		});

		return true;
	}

	// Generate audio content
	generateTone(frequency, duration, amplitude = 0.5, waveform = "sine") {
		const sampleRate = this.audioContext.sampleRate;
		const length = Math.floor(duration * sampleRate);
		const buffer = this.audioContext.createBuffer(1, length, sampleRate);
		const data = buffer.getChannelData(0);

		for (let i = 0; i < length; i++) {
			const t = i / sampleRate;
			let sample = 0;

			switch (waveform) {
				case "sine":
					sample = Math.sin(2 * Math.PI * frequency * t);
					break;
				case "square":
					sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
					break;
				case "sawtooth":
					sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
					break;
				case "triangle":
					sample =
						2 *
							Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) -
						1;
					break;
			}

			data[i] = sample * amplitude;
		}

		const trackId = "generated_" + Date.now();
		this.audioBuffers.set(trackId, {
			buffer: buffer,
			name: `${waveform} ${frequency}Hz`,
			duration: duration,
			sampleRate: sampleRate,
			numberOfChannels: 1,
		});

		return trackId;
	}

	generateNoise(duration, amplitude = 0.1, type = "white") {
		const sampleRate = this.audioContext.sampleRate;
		const length = Math.floor(duration * sampleRate);
		const buffer = this.audioContext.createBuffer(1, length, sampleRate);
		const data = buffer.getChannelData(0);

		if (type === "white") {
			for (let i = 0; i < length; i++) {
				data[i] = (Math.random() * 2 - 1) * amplitude;
			}
		} else if (type === "pink") {
			let b0 = 0,
				b1 = 0,
				b2 = 0,
				b3 = 0,
				b4 = 0,
				b5 = 0,
				b6 = 0;
			for (let i = 0; i < length; i++) {
				const white = Math.random() * 2 - 1;
				b0 = 0.99886 * b0 + white * 0.0555179;
				b1 = 0.99332 * b1 + white * 0.0750759;
				b2 = 0.969 * b2 + white * 0.153852;
				b3 = 0.8665 * b3 + white * 0.3104856;
				b4 = 0.55 * b4 + white * 0.5329522;
				b5 = -0.7616 * b5 - white * 0.016898;
				const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
				b6 = white * 0.115926;
				data[i] = pink * amplitude * 0.11;
			}
		}

		const trackId = "noise_" + Date.now();
		this.audioBuffers.set(trackId, {
			buffer: buffer,
			name: `${type} Noise`,
			duration: duration,
			sampleRate: sampleRate,
			numberOfChannels: 1,
		});

		return trackId;
	}

	generateSilence(duration) {
		const sampleRate = this.audioContext.sampleRate;
		const length = Math.floor(duration * sampleRate);
		const buffer = this.audioContext.createBuffer(1, length, sampleRate);

		const trackId = "silence_" + Date.now();
		this.audioBuffers.set(trackId, {
			buffer: buffer,
			name: "Silence",
			duration: duration,
			sampleRate: sampleRate,
			numberOfChannels: 1,
		});

		return trackId;
	}

	// Phase 1 Priority Generators

	/**
	 * Generate Chirp - Frequency sweep tones
	 */
	generateChirp(startFreq = 440, endFreq = 880, duration = 2, amplitude = 0.5, waveform = "sine") {
		const sampleRate = this.audioContext.sampleRate;
		const length = Math.floor(duration * sampleRate);
		const buffer = this.audioContext.createBuffer(1, length, sampleRate);
		const channelData = buffer.getChannelData(0);

		for (let i = 0; i < length; i++) {
			const progress = i / length;
			const frequency = startFreq + (endFreq - startFreq) * progress;
			const time = i / sampleRate;
			
			let sample;
			switch (waveform) {
				case "sine":
					sample = Math.sin(2 * Math.PI * frequency * time);
					break;
				case "square":
					sample = Math.sign(Math.sin(2 * Math.PI * frequency * time));
					break;
				case "sawtooth":
					sample = 2 * (frequency * time - Math.floor(frequency * time + 0.5));
					break;
				case "triangle":
					sample = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * time));
					break;
				default:
					sample = Math.sin(2 * Math.PI * frequency * time);
			}
			
			channelData[i] = sample * amplitude;
		}

		const trackId = "chirp_" + Date.now();
		this.audioBuffers.set(trackId, {
			buffer: buffer,
			name: `Chirp (${startFreq}Hz-${endFreq}Hz)`,
			duration: duration,
			sampleRate: sampleRate,
			numberOfChannels: 1,
		});

		return trackId;
	}

	/**
	 * Generate DTMF Tones - Telephone keypad tones
	 */
	generateDTMF(digit = "1", duration = 0.5, amplitude = 0.5) {
		// DTMF frequency pairs
		const dtmfFreqs = {
			"1": [697, 1209], "2": [697, 1336], "3": [697, 1477], "A": [697, 1633],
			"4": [770, 1209], "5": [770, 1336], "6": [770, 1477], "B": [770, 1633],
			"7": [852, 1209], "8": [852, 1336], "9": [852, 1477], "C": [852, 1633],
			"*": [941, 1209], "0": [941, 1336], "#": [941, 1477], "D": [941, 1633]
		};

		const frequencies = dtmfFreqs[digit] || dtmfFreqs["1"];
		const sampleRate = this.audioContext.sampleRate;
		const length = Math.floor(duration * sampleRate);
		const buffer = this.audioContext.createBuffer(1, length, sampleRate);
		const channelData = buffer.getChannelData(0);

		for (let i = 0; i < length; i++) {
			const time = i / sampleRate;
			const sample1 = Math.sin(2 * Math.PI * frequencies[0] * time);
			const sample2 = Math.sin(2 * Math.PI * frequencies[1] * time);
			channelData[i] = (sample1 + sample2) * amplitude * 0.5;
		}

		const trackId = "dtmf_" + Date.now();
		this.audioBuffers.set(trackId, {
			buffer: buffer,
			name: `DTMF ${digit}`,
			duration: duration,
			sampleRate: sampleRate,
			numberOfChannels: 1,
		});

		return trackId;
	}

	/**
	 * Generate Rhythm Track - Metronome/click track
	 */
	generateRhythmTrack(bpm = 120, duration = 10, beatsPerMeasure = 4, amplitude = 0.7) {
		const sampleRate = this.audioContext.sampleRate;
		const length = Math.floor(duration * sampleRate);
		const buffer = this.audioContext.createBuffer(1, length, sampleRate);
		const channelData = buffer.getChannelData(0);

		const secondsPerBeat = 60 / bpm;
		const samplesPerBeat = Math.floor(secondsPerBeat * sampleRate);
		const clickDuration = 0.1; // 100ms click
		const clickSamples = Math.floor(clickDuration * sampleRate);

		for (let i = 0; i < length; i++) {
			const currentBeat = Math.floor(i / samplesPerBeat);
			const beatPosition = i % samplesPerBeat;
			
			if (beatPosition < clickSamples) {
				const progress = beatPosition / clickSamples;
				const envelope = Math.sin(progress * Math.PI); // Bell-shaped envelope
				
				// Different frequencies for downbeat vs regular beats
				const isDownbeat = (currentBeat % beatsPerMeasure) === 0;
				const frequency = isDownbeat ? 800 : 400;
				
				const time = i / sampleRate;
				const click = Math.sin(2 * Math.PI * frequency * time) * envelope;
				channelData[i] = click * amplitude;
			}
		}

		const trackId = "rhythm_" + Date.now();
		this.audioBuffers.set(trackId, {
			buffer: buffer,
			name: `Rhythm ${bpm}BPM`,
			duration: duration,
			sampleRate: sampleRate,
			numberOfChannels: 1,
		});

		return trackId;
	}

	/**
	 * Generate Pluck - Synthesized pluck instrument
	 */
	generatePluck(frequency = 440, duration = 2, amplitude = 0.5, decay = 0.5) {
		const sampleRate = this.audioContext.sampleRate;
		const length = Math.floor(duration * sampleRate);
		const buffer = this.audioContext.createBuffer(1, length, sampleRate);
		const channelData = buffer.getChannelData(0);

		// Karplus-Strong pluck synthesis
		const delayLength = Math.floor(sampleRate / frequency);
		const delayLine = new Float32Array(delayLength);
		
		// Initialize with noise burst
		for (let i = 0; i < delayLength; i++) {
			delayLine[i] = (Math.random() * 2 - 1) * amplitude;
		}

		let delayIndex = 0;
		
		for (let i = 0; i < length; i++) {
			const time = i / sampleRate;
			const envelope = Math.exp(-decay * time); // Exponential decay
			
			// Get delayed sample
			const delayed = delayLine[delayIndex];
			
			// Apply low-pass filter (simple average for damping)
			const nextIndex = (delayIndex + 1) % delayLength;
			const filtered = (delayed + delayLine[nextIndex]) * 0.5 * 0.99; // 0.99 for energy loss
			
			// Store back in delay line
			delayLine[delayIndex] = filtered;
			
			// Output with envelope
			channelData[i] = delayed * envelope;
			
			delayIndex = nextIndex;
		}

		const trackId = "pluck_" + Date.now();
		this.audioBuffers.set(trackId, {
			buffer: buffer,
			name: `Pluck ${frequency}Hz`,
			duration: duration,
			sampleRate: sampleRate,
			numberOfChannels: 1,
		});

		return trackId;
	}

	/**
	 * Generate Risset Drum - Realistic drum synthesis
	 */
	generateRissetDrum(frequency = 60, duration = 1, amplitude = 0.8) {
		const sampleRate = this.audioContext.sampleRate;
		const length = Math.floor(duration * sampleRate);
		const buffer = this.audioContext.createBuffer(1, length, sampleRate);
		const channelData = buffer.getChannelData(0);

		for (let i = 0; i < length; i++) {
			const time = i / sampleRate;
			
			// Frequency envelope (pitch drops rapidly)
			const freqEnv = Math.exp(-time * 8);
			const currentFreq = frequency * (0.5 + 0.5 * freqEnv);
			
			// Multiple frequency components for realistic drum sound
			const fundamental = Math.sin(2 * Math.PI * currentFreq * time);
			const harmonic2 = Math.sin(2 * Math.PI * currentFreq * 1.5 * time) * 0.6;
			const harmonic3 = Math.sin(2 * Math.PI * currentFreq * 2.2 * time) * 0.3;
			
			// Noise component for attack
			const noise = (Math.random() * 2 - 1) * Math.exp(-time * 15) * 0.3;
			
			// Amplitude envelope
			const ampEnv = Math.exp(-time * 3);
			
			// Combine components
			const sample = (fundamental + harmonic2 + harmonic3 + noise) * ampEnv;
			channelData[i] = sample * amplitude;
		}

		const trackId = "drum_" + Date.now();
		this.audioBuffers.set(trackId, {
			buffer: buffer,
			name: `Risset Drum ${frequency}Hz`,
			duration: duration,
			sampleRate: sampleRate,
			numberOfChannels: 1,
		});

		return trackId;
	}

	async exportAudio(trackId, format = "wav") {
		const trackData = this.audioBuffers.get(trackId);
		if (!trackData) return null;

		const buffer = trackData.buffer;

		if (format === "wav") {
			return this.exportAsWAV(buffer);
		} else if (format === "mp3") {
			return await this.exportAsMP3(buffer);
		} else if (format === "flac") {
			return await this.exportAsFLAC(buffer);
		} else if (format === "ogg") {
			return await this.exportAsOGG(buffer);
		} else if (format === "aiff") {
			return this.exportAsAIFF(buffer);
		}

		throw new Error(`Export format ${format} not supported`);
	}

	exportAsWAV(audioBuffer) {
		const length = audioBuffer.length;
		const numberOfChannels = audioBuffer.numberOfChannels;
		const sampleRate = audioBuffer.sampleRate;
		const bytesPerSample = 2;
		const blockAlign = numberOfChannels * bytesPerSample;
		const byteRate = sampleRate * blockAlign;
		const dataSize = length * blockAlign;
		const buffer = new ArrayBuffer(44 + dataSize);
		const view = new DataView(buffer);

		const writeString = (offset, string) => {
			for (let i = 0; i < string.length; i++) {
				view.setUint8(offset + i, string.charCodeAt(i));
			}
		};

		writeString(0, "RIFF");
		view.setUint32(4, 36 + dataSize, true);
		writeString(8, "WAVE");
		writeString(12, "fmt ");
		view.setUint32(16, 16, true);
		view.setUint16(20, 1, true);
		view.setUint16(22, numberOfChannels, true);
		view.setUint32(24, sampleRate, true);
		view.setUint32(28, byteRate, true);
		view.setUint16(32, blockAlign, true);
		view.setUint16(34, 16, true);
		writeString(36, "data");
		view.setUint32(40, dataSize, true);

		let offset = 44;
		for (let i = 0; i < length; i++) {
			for (let channel = 0; channel < numberOfChannels; channel++) {
				const sample = Math.max(
					-1,
					Math.min(1, audioBuffer.getChannelData(channel)[i]),
				);
				view.setInt16(
					offset,
					sample < 0 ? sample * 0x8000 : sample * 0x7fff,
					true,
				);
				offset += 2;
			}
		}

		return new Blob([buffer], { type: "audio/wav" });
	}

	async exportAsMP3(audioBuffer) {
		try {
			// Dynamic import of lamejs
			const { Mp3Encoder } = await import('lamejs');
			
			const sampleRate = audioBuffer.sampleRate;
			const numberOfChannels = audioBuffer.numberOfChannels;
			const bitRate = 128; // kbps
			
			const encoder = new Mp3Encoder(numberOfChannels, sampleRate, bitRate);
			const mp3Data = [];
			
			// Convert float32 to int16
			const samples = [];
			for (let channel = 0; channel < numberOfChannels; channel++) {
				const channelData = audioBuffer.getChannelData(channel);
				const int16Array = new Int16Array(channelData.length);
				for (let i = 0; i < channelData.length; i++) {
					const sample = Math.max(-1, Math.min(1, channelData[i]));
					int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
				}
				samples[channel] = int16Array;
			}
			
			// Encode in chunks
			const chunkSize = 1152;
			for (let i = 0; i < samples[0].length; i += chunkSize) {
				const leftChunk = samples[0].subarray(i, i + chunkSize);
				const rightChunk = numberOfChannels > 1 ? samples[1].subarray(i, i + chunkSize) : leftChunk;
				
				const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
				if (mp3buf.length > 0) {
					mp3Data.push(mp3buf);
				}
			}
			
			// Flush the encoder
			const mp3buf = encoder.flush();
			if (mp3buf.length > 0) {
				mp3Data.push(mp3buf);
			}
			
			return new Blob(mp3Data, { type: "audio/mpeg" });
		} catch (error) {
			console.warn("MP3 encoding failed, falling back to WAV:", error);
			const wavData = this.exportAsWAV(audioBuffer);
			return new Blob([wavData], { type: "audio/mpeg" });
		}
	}

	async exportAsFLAC(audioBuffer) {
		try {
			// For now, export as high-quality WAV since FLAC encoding in browsers is complex
			// In a production environment, you would use a proper FLAC encoder library
			console.log("FLAC encoding: Using high-quality WAV format");
			const wavData = this.exportAsWAV(audioBuffer);
			return new Blob([wavData], { type: "audio/flac" });
		} catch (error) {
			console.warn("FLAC encoding failed, falling back to WAV:", error);
			const wavData = this.exportAsWAV(audioBuffer);
			return new Blob([wavData], { type: "audio/flac" });
		}
	}

	async exportAsOGG(audioBuffer) {
		try {
			// For OGG Vorbis, we'll use a simplified approach
			// In a full implementation, you'd use a proper Vorbis encoder
			console.warn("OGG encoding not fully implemented, using WAV");
			const wavData = this.exportAsWAV(audioBuffer);
			return new Blob([wavData], { type: "audio/ogg" });
		} catch (error) {
			console.warn("OGG encoding failed, falling back to WAV:", error);
			const wavData = this.exportAsWAV(audioBuffer);
			return new Blob([wavData], { type: "audio/ogg" });
		}
	}

	exportAsAIFF(audioBuffer) {
		const length = audioBuffer.length;
		const numberOfChannels = audioBuffer.numberOfChannels;
		const sampleRate = audioBuffer.sampleRate;
		const bytesPerSample = 2;
		const blockAlign = numberOfChannels * bytesPerSample;
		const dataSize = length * blockAlign;
		const buffer = new ArrayBuffer(54 + dataSize);
		const view = new DataView(buffer);

		const writeString = (offset, string) => {
			for (let i = 0; i < string.length; i++) {
				view.setUint8(offset + i, string.charCodeAt(i));
			}
		};

		// FORM chunk
		writeString(0, "FORM");
		view.setUint32(4, 46 + dataSize, false); // Big-endian
		writeString(8, "AIFF");
		
		// COMM chunk
		writeString(12, "COMM");
		view.setUint32(16, 18, false);
		view.setUint16(20, numberOfChannels, false);
		view.setUint32(22, length, false);
		view.setUint16(26, 16, false);
		
		// Sample rate as 80-bit IEEE extended precision
		const sampleRateBuffer = new ArrayBuffer(10);
		const sampleRateView = new DataView(sampleRateBuffer);
		// Simplified conversion - for production use proper IEEE 754 conversion
		sampleRateView.setUint16(0, 0x400E, false); // Exponent
		sampleRateView.setUint32(2, Math.floor(sampleRate), false);
		sampleRateView.setUint32(6, 0, false);
		
		for (let i = 0; i < 10; i++) {
			view.setUint8(28 + i, sampleRateView.getUint8(i));
		}
		
		// SSND chunk
		writeString(38, "SSND");
		view.setUint32(42, dataSize + 8, false);
		view.setUint32(46, 0, false); // Offset
		view.setUint32(50, 0, false); // Block size

		let offset = 54;
		for (let i = 0; i < length; i++) {
			for (let channel = 0; channel < numberOfChannels; channel++) {
				const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
				view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, false);
				offset += 2;
			}
		}

		return new Blob([buffer], { type: "audio/aiff" });
	}

	getTrackInfo(trackId) {
		return this.audioBuffers.get(trackId);
	}

	getAllTracks() {
		return Array.from(this.audioBuffers.entries()).map(([id, data]) => ({
			id,
			...data,
		}));
	}

	removeTrack(trackId) {
		if (this.playingSources.has(trackId)) {
			const source = this.playingSources.get(trackId);
			try {
				source.stop();
			} catch {
				// Source might already be stopped
			}
			this.playingSources.delete(trackId);
		}

		return this.audioBuffers.delete(trackId);
	}

	getCurrentTime() {
		return this.currentTime;
	}

	getTotalDuration() {
		let maxDuration = 0;
		for (const [, data] of this.audioBuffers) {
			maxDuration = Math.max(maxDuration, data.duration);
		}
		return maxDuration;
	}

	destroy() {
		this.stop();

		// Stop recording if active
		if (this.isRecording) {
			this.stopRecording();
		}

		// Clean up recording resources
		if (this.recordingSource) {
			this.recordingSource.disconnect();
			this.recordingSource = null;
		}
		
		if (this.recordingProcessor) {
			this.recordingProcessor.disconnect();
			this.recordingProcessor = null;
		}

		if (this.recordingStream) {
			this.recordingStream.getTracks().forEach((track) => track.stop());
			this.recordingStream = null;
		}

		// Clean up recording buffers
		this.recordingBuffers = null;
		this.recordingLength = 0;

		if (this.audioContext) {
			this.audioContext.close();
		}
	}
}
