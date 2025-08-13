/**
 * Audio Engine Service - React version
 * Handles recording, playback, file loading, and audio context management
 */

export class AudioEngineService {
	constructor() {
		this.audioContext = null;
		this.mediaRecorder = null;
		this.recordingStream = null;
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

			// Resume context if suspended (autoplay policy)
			if (this.audioContext.state === "suspended") {
				await this.audioContext.resume();
			}

			console.log("Audio context initialized:", this.audioContext);
			return true;
		} catch (error) {
			console.error("Failed to initialize audio context:", error);
			this.onError?.("Web Audio API not supported");
			return false;
		}
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
			if (!this.recordingStream) {
				await this.requestMicrophoneAccess();
			}

			this.mediaRecorder = new MediaRecorder(this.recordingStream, {
				mimeType: "audio/webm;codecs=opus",
			});

			this.recordingData = [];

			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.recordingData.push(event.data);
				}
			};

			this.mediaRecorder.onstop = async () => {
				const blob = new Blob(this.recordingData, {
					type: "audio/webm;codecs=opus",
				});
				const trackId = await this.loadAudioFromBlob(
					blob,
					"Recording " + Date.now(),
				);
				this.recordingData = [];
				this.onRecordingFinished?.(trackId);
			};

			this.mediaRecorder.start(100);
			this.isRecording = true;
			this.onStatusChange?.("Recording...");

			console.log("Recording started");
		} catch (error) {
			console.error("Failed to start recording:", error);
			this.onError?.("Recording failed: " + error.message);
			throw error;
		}
	}

	stopRecording() {
		if (!this.isRecording) return;

		if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
			this.mediaRecorder.stop();
		}

		this.isRecording = false;
		this.onStatusChange?.("Recording stopped");
		console.log("Recording stopped");
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

	play(trackId = null, startTime = 0, duration = null) {
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
			} catch (error) {
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

	async exportAudio(trackId, format = "wav") {
		const trackData = this.audioBuffers.get(trackId);
		if (!trackData) return null;

		const buffer = trackData.buffer;

		if (format === "wav") {
			return this.exportAsWAV(buffer);
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
			} catch (error) {
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

		if (this.recordingStream) {
			this.recordingStream.getTracks().forEach((track) => track.stop());
		}

		if (this.audioContext) {
			this.audioContext.close();
		}
	}
}
