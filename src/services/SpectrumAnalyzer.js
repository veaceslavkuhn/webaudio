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
				frequencies: spectrum
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
				const angle = -2 * Math.PI * k * n / N;
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
			if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) {
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
				window[j] *= 0.5 * (1 - Math.cos(2 * Math.PI * j / (window.length - 1)));
			}
			
			const spectrum = this.performFFT(window);
			
			// Convert to dB
			const dbSpectrum = spectrum.map(magnitude => 
				20 * Math.log10(Math.max(magnitude, 1e-10))
			);
			
			spectrogram.push({
				time: i / sampleRate,
				spectrum: dbSpectrum
			});
		}
		
		return spectrogram;
	}

	destroy() {
		if (this.analyser) {
			this.analyser.disconnect();
			this.analyser = null;
		}
		this.dataArray = null;
	}
}
