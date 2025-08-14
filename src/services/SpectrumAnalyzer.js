export class SpectrumAnalyzer {
	constructor(audioContext) {
		this.audioContext = audioContext;
		this.analyser = null;
		this.dataArray = null;
		this.bufferLength = 0;
		this.fftSize = 2048;
	}

	initialize(fftSize = 2048) {
		this.fftSize = fftSize;
		this.analyser = this.audioContext.createAnalyser();
		this.analyser.fftSize = fftSize;
		this.bufferLength = this.analyser.frequencyBinCount;
		this.dataArray = new Uint8Array(this.bufferLength);

		return this.analyser;
	}

	getFrequencyData() {
		if (!this.analyser) return null;

		this.analyser.getByteFrequencyData(this.dataArray);
		return new Uint8Array(this.dataArray);
	}

	getTimeDomainData() {
		if (!this.analyser) return null;

		this.analyser.getByteTimeDomainData(this.dataArray);
		return new Uint8Array(this.dataArray);
	}

	analyzeAudioBuffer(audioBuffer) {
		// Analyze a complete audio buffer (for offline analysis)
		const channelData = audioBuffer.getChannelData(0);
		const sampleRate = audioBuffer.sampleRate;
		const windowSize = this.fftSize;
		const hopSize = windowSize / 2;

		const results = [];

		for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
			const window = channelData.slice(i, i + windowSize);
			const spectrum = this.performFFT(window);

			results.push({
				time: i / sampleRate,
				frequencies: spectrum,
			});
		}

		return results;
	}

	performFFT(samples) {
		// Simple FFT implementation for spectrum analysis
		const N = samples.length;
		const spectrum = new Array(N / 2);

		for (let k = 0; k < N / 2; k++) {
			let real = 0;
			let imag = 0;

			for (let n = 0; n < N; n++) {
				const angle = (-2 * Math.PI * k * n) / N;
				real += samples[n] * Math.cos(angle);
				imag += samples[n] * Math.sin(angle);
			}

			spectrum[k] = Math.sqrt(real * real + imag * imag);
		}

		return spectrum;
	}

	getFrequencyBins(sampleRate) {
		const bins = [];
		const nyquist = sampleRate / 2;

		for (let i = 0; i < this.bufferLength; i++) {
			bins.push((i * nyquist) / this.bufferLength);
		}

		return bins;
	}

	getPeakFrequency(frequencyData, sampleRate) {
		let maxValue = 0;
		let maxIndex = 0;

		for (let i = 0; i < frequencyData.length; i++) {
			if (frequencyData[i] > maxValue) {
				maxValue = frequencyData[i];
				maxIndex = i;
			}
		}

		const nyquist = sampleRate / 2;
		return (maxIndex * nyquist) / frequencyData.length;
	}

	getSpectralCentroid(frequencyData, sampleRate) {
		let weightedSum = 0;
		let magnitudeSum = 0;
		const nyquist = sampleRate / 2;

		for (let i = 0; i < frequencyData.length; i++) {
			const frequency = (i * nyquist) / frequencyData.length;
			const magnitude = frequencyData[i];

			weightedSum += frequency * magnitude;
			magnitudeSum += magnitude;
		}

		return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
	}

	getRMS(audioBuffer) {
		let sum = 0;
		const channelData = audioBuffer.getChannelData(0);

		for (let i = 0; i < channelData.length; i++) {
			sum += channelData[i] * channelData[i];
		}

		return Math.sqrt(sum / channelData.length);
	}

	getZeroCrossingRate(audioBuffer) {
		const channelData = audioBuffer.getChannelData(0);
		let crossings = 0;

		for (let i = 1; i < channelData.length; i++) {
			if (channelData[i] >= 0 !== channelData[i - 1] >= 0) {
				crossings++;
			}
		}

		return crossings / channelData.length;
	}

	createSpectrogram(audioBuffer, windowSize = 1024, hopSize = 512) {
		const channelData = audioBuffer.getChannelData(0);
		const sampleRate = audioBuffer.sampleRate;
		const spectrogram = [];

		for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
			const window = channelData.slice(i, i + windowSize);

			// Apply Hann window
			for (let j = 0; j < window.length; j++) {
				window[j] *=
					0.5 * (1 - Math.cos((2 * Math.PI * j) / (window.length - 1)));
			}

			const spectrum = this.performFFT(window);

			// Convert to dB
			const dbSpectrum = spectrum.map(
				(magnitude) => 20 * Math.log10(Math.max(magnitude, 1e-10)),
			);

			spectrogram.push({
				time: i / sampleRate,
				spectrum: dbSpectrum,
			});
		}

		return spectrogram;
	}

	// New Analysis Tools
	findClipping(audioBuffer, threshold = 0.98) {
		const clippedSamples = [];

		for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
			const channelData = audioBuffer.getChannelData(channel);

			for (let i = 0; i < channelData.length; i++) {
				if (Math.abs(channelData[i]) >= threshold) {
					clippedSamples.push({
						channel: channel,
						sample: i,
						time: i / audioBuffer.sampleRate,
						value: channelData[i],
					});
				}
			}
		}

		return {
			total: clippedSamples.length,
			samples: clippedSamples,
			percentage:
				(clippedSamples.length /
					(audioBuffer.length * audioBuffer.numberOfChannels)) *
				100,
		};
	}

	measureRMS(audioBuffer, startTime = 0, endTime = null) {
		if (endTime === null) endTime = audioBuffer.duration;

		const startSample = Math.floor(startTime * audioBuffer.sampleRate);
		const endSample = Math.floor(endTime * audioBuffer.sampleRate);

		const rmsValues = [];

		for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
			const channelData = audioBuffer.getChannelData(channel);
			let sum = 0;
			let count = 0;

			for (
				let i = startSample;
				i < Math.min(endSample, channelData.length);
				i++
			) {
				sum += channelData[i] * channelData[i];
				count++;
			}

			const rms = Math.sqrt(sum / count);
			const dbFS = 20 * Math.log10(rms);
			rmsValues.push({ rms, dbFS });
		}

		return rmsValues;
	}

	contrastAnalysis(
		audioBuffer,
		foregroundStart,
		foregroundEnd,
		backgroundStart,
		backgroundEnd,
	) {
		// Speech intelligibility analysis
		const foregroundRMS = this.measureRMS(
			audioBuffer,
			foregroundStart,
			foregroundEnd,
		);
		const backgroundRMS = this.measureRMS(
			audioBuffer,
			backgroundStart,
			backgroundEnd,
		);

		const foregroundLevel = foregroundRMS[0].dbFS;
		const backgroundLevel = backgroundRMS[0].dbFS;
		const contrast = foregroundLevel - backgroundLevel;

		// Basic intelligibility assessment
		let assessment = "Poor";
		if (contrast > 20) assessment = "Excellent";
		else if (contrast > 15) assessment = "Good";
		else if (contrast > 10) assessment = "Fair";

		return {
			foregroundLevel,
			backgroundLevel,
			contrast,
			assessment,
		};
	}

	labelSounds(
		audioBuffer,
		silenceThreshold = -40,
		minSoundDuration = 0.1,
		minSilenceDuration = 0.1,
	) {
		const channelData = audioBuffer.getChannelData(0);
		const sampleRate = audioBuffer.sampleRate;
		const thresholdLinear = 10 ** (silenceThreshold / 20);
		const minSoundSamples = Math.floor(minSoundDuration * sampleRate);
		const minSilenceSamples = Math.floor(minSilenceDuration * sampleRate);

		const labels = [];
		let currentStart = 0;
		let consecutiveSamples = 0;
		let lastState = "silence";

		for (let i = 0; i < channelData.length; i++) {
			const amplitude = Math.abs(channelData[i]);
			const isSound = amplitude > thresholdLinear;
			const currentState = isSound ? "sound" : "silence";

			if (currentState === lastState) {
				consecutiveSamples++;
			} else {
				// State change
				if (
					lastState === "silence" &&
					consecutiveSamples >= minSilenceSamples
				) {
					// End of silence period
					labels.push({
						type: "silence",
						start: currentStart / sampleRate,
						end: i / sampleRate,
						duration: consecutiveSamples / sampleRate,
					});
				} else if (
					lastState === "sound" &&
					consecutiveSamples >= minSoundSamples
				) {
					// End of sound period
					labels.push({
						type: "sound",
						start: currentStart / sampleRate,
						end: i / sampleRate,
						duration: consecutiveSamples / sampleRate,
					});
				}

				currentStart = i;
				consecutiveSamples = 1;
				lastState = currentState;
			}
		}

		// Handle final segment
		if (
			consecutiveSamples >=
			(lastState === "sound" ? minSoundSamples : minSilenceSamples)
		) {
			labels.push({
				type: lastState,
				start: currentStart / sampleRate,
				end: channelData.length / sampleRate,
				duration: consecutiveSamples / sampleRate,
			});
		}

		return labels;
	}

	beatFinder(audioBuffer, minBPM = 60, maxBPM = 200) {
		// Simple beat detection using onset detection
		const channelData = audioBuffer.getChannelData(0);
		const sampleRate = audioBuffer.sampleRate;
		const hopSize = 512;
		const windowSize = 1024;

		// Calculate spectral flux for onset detection
		const onsets = [];
		let previousSpectrum = null;

		for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
			const window = channelData.slice(i, i + windowSize);
			const spectrum = this.performFFT(window);

			if (previousSpectrum) {
				let flux = 0;
				for (let j = 0; j < spectrum.length; j++) {
					const diff = spectrum[j] - previousSpectrum[j];
					if (diff > 0) flux += diff;
				}

				// Simple peak picking
				if (flux > 0.1) {
					// Threshold
					onsets.push(i / sampleRate);
				}
			}

			previousSpectrum = spectrum;
		}

		// Estimate BPM from onset intervals
		if (onsets.length < 2) {
			return { bpm: 0, beats: [], confidence: 0 };
		}

		const intervals = [];
		for (let i = 1; i < onsets.length; i++) {
			intervals.push(onsets[i] - onsets[i - 1]);
		}

		// Find most common interval
		const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
		const bpm = 60 / avgInterval;

		// Filter BPM to reasonable range
		const clampedBPM = Math.max(minBPM, Math.min(maxBPM, bpm));

		return {
			bpm: Math.round(clampedBPM),
			beats: onsets,
			confidence: intervals.length > 4 ? 0.8 : 0.3,
		};
	}

	plotSpectrum(audioBuffer, startTime = 0, duration = 0.1) {
		// Detailed frequency analysis for a specific time range
		const sampleRate = audioBuffer.sampleRate;
		const startSample = Math.floor(startTime * sampleRate);
		const samples = Math.floor(duration * sampleRate);

		if (startSample + samples > audioBuffer.length) {
			throw new Error("Analysis range exceeds audio duration");
		}

		const channelData = audioBuffer.getChannelData(0);
		const window = channelData.slice(startSample, startSample + samples);

		// Apply Hann window
		for (let i = 0; i < window.length; i++) {
			const windowValue =
				0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (window.length - 1));
			window[i] *= windowValue;
		}

		const spectrum = this.performFFT(window);
		const frequencies = [];
		const magnitudes = [];
		const phases = [];

		for (let i = 0; i < spectrum.length / 2; i++) {
			const frequency = (i * sampleRate) / spectrum.length;
			const magnitude = Math.sqrt(
				spectrum[i * 2] * spectrum[i * 2] +
					spectrum[i * 2 + 1] * spectrum[i * 2 + 1],
			);
			const phase = Math.atan2(spectrum[i * 2 + 1], spectrum[i * 2]);

			frequencies.push(frequency);
			magnitudes.push(20 * Math.log10(magnitude + 1e-10)); // Convert to dB
			phases.push(phase);
		}

		return {
			frequencies,
			magnitudes,
			phases,
			sampleRate,
			duration: duration,
		};
	}

	destroy() {
		if (this.analyser) {
			this.analyser.disconnect();
			this.analyser = null;
		}
		this.dataArray = null;
	}
}
