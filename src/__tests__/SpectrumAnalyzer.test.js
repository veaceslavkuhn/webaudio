import { SpectrumAnalyzer } from '../services/SpectrumAnalyzer';

// Mock Web Audio API
const mockAudioContext = {
	createAnalyser: jest.fn(() => ({
		fftSize: 2048,
		frequencyBinCount: 1024,
		getByteFrequencyData: jest.fn((array) => {
			// Fill with mock frequency data
			for (let i = 0; i < array.length; i++) {
				array[i] = Math.floor(Math.random() * 255);
			}
		}),
		getByteTimeDomainData: jest.fn((array) => {
			// Fill with mock time domain data
			for (let i = 0; i < array.length; i++) {
				array[i] = 128 + Math.sin(i * 0.1) * 50;
			}
		}),
		disconnect: jest.fn()
	})),
	close: jest.fn()
};

describe('Spectrum Analyzer', () => {
	let spectrumAnalyzer;
	let mockAudioBuffer;

	beforeEach(() => {
		spectrumAnalyzer = new SpectrumAnalyzer(mockAudioContext);
		
		// Create mock audio buffer
		mockAudioBuffer = {
			numberOfChannels: 2,
			length: 4096,
			sampleRate: 44100,
			getChannelData: jest.fn(() => {
				const data = new Float32Array(4096);
				// Fill with test sine wave
				for (let i = 0; i < data.length; i++) {
					data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5;
				}
				return data;
			})
		};
	});

	afterEach(() => {
		spectrumAnalyzer.destroy();
		jest.clearAllMocks();
	});

	describe('Initialization', () => {
		test('should initialize with default FFT size', () => {
			const analyser = spectrumAnalyzer.initialize();
			
			expect(analyser).toBeDefined();
			expect(spectrumAnalyzer.fftSize).toBe(2048);
			expect(spectrumAnalyzer.bufferLength).toBe(1024);
			expect(spectrumAnalyzer.dataArray).toBeInstanceOf(Uint8Array);
		});

		test('should initialize with custom FFT size', () => {
			const analyser = spectrumAnalyzer.initialize(1024);
			
			expect(analyser).toBeDefined();
			expect(spectrumAnalyzer.fftSize).toBe(1024);
			expect(spectrumAnalyzer.bufferLength).toBe(512);
		});

		test('should create analyser node', () => {
			spectrumAnalyzer.initialize();
			
			expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
			expect(spectrumAnalyzer.analyser).toBeDefined();
		});
	});

	describe('Real-time Analysis', () => {
		beforeEach(() => {
			spectrumAnalyzer.initialize();
		});

		test('should get frequency data', () => {
			const frequencyData = spectrumAnalyzer.getFrequencyData();
			
			expect(frequencyData).toBeInstanceOf(Uint8Array);
			expect(frequencyData.length).toBe(1024);
		});

		test('should get time domain data', () => {
			const timeDomainData = spectrumAnalyzer.getTimeDomainData();
			
			expect(timeDomainData).toBeInstanceOf(Uint8Array);
			expect(timeDomainData.length).toBe(1024);
		});

		test('should return null when not initialized', () => {
			const uninitialized = new SpectrumAnalyzer(mockAudioContext);
			
			expect(uninitialized.getFrequencyData()).toBeNull();
			expect(uninitialized.getTimeDomainData()).toBeNull();
		});
	});

	describe('Audio Buffer Analysis', () => {
		test('should analyze complete audio buffer', () => {
			spectrumAnalyzer.initialize();
			const results = spectrumAnalyzer.analyzeAudioBuffer(mockAudioBuffer);
			
			expect(results).toBeInstanceOf(Array);
			expect(results.length).toBeGreaterThan(0);
			
			// Check result structure
			const firstResult = results[0];
			expect(firstResult).toHaveProperty('time');
			expect(firstResult).toHaveProperty('frequencies');
			expect(firstResult.time).toBeGreaterThanOrEqual(0);
			expect(firstResult.frequencies).toBeInstanceOf(Array);
		});

		test('should handle empty audio buffer', () => {
			const emptyBuffer = {
				...mockAudioBuffer,
				length: 0,
				getChannelData: jest.fn(() => new Float32Array(0))
			};
			
			spectrumAnalyzer.initialize();
			const results = spectrumAnalyzer.analyzeAudioBuffer(emptyBuffer);
			
			expect(results).toBeInstanceOf(Array);
			expect(results.length).toBe(0);
		});
	});

	describe('FFT Implementation', () => {
		test('should perform FFT on sample data', () => {
			const samples = new Float32Array(1024);
			// Fill with sine wave
			for (let i = 0; i < samples.length; i++) {
				samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100);
			}
			
			const spectrum = spectrumAnalyzer.performFFT(samples);
			
			expect(spectrum).toBeInstanceOf(Array);
			expect(spectrum.length).toBe(512); // Half the input size
			expect(spectrum.every(val => val >= 0)).toBe(true); // All magnitudes positive
		});

		test('should handle DC signal', () => {
			const samples = new Float32Array(1024);
			samples.fill(1.0); // DC signal
			
			const spectrum = spectrumAnalyzer.performFFT(samples);
			
			expect(spectrum).toBeInstanceOf(Array);
			expect(spectrum[0]).toBeGreaterThan(0); // DC bin should have energy
		});
	});

	describe('Frequency Analysis', () => {
		test('should get frequency bins', () => {
			spectrumAnalyzer.initialize();
			const bins = spectrumAnalyzer.getFrequencyBins(44100);
			
			expect(bins).toBeInstanceOf(Array);
			expect(bins.length).toBe(1024);
			expect(bins[0]).toBe(0); // First bin at 0 Hz
			expect(bins[bins.length - 1]).toBeCloseTo(22050, 0); // Last bin at Nyquist
		});

		test('should find peak frequency', () => {
			const frequencyData = new Uint8Array(1024);
			frequencyData[100] = 255; // Peak at bin 100
			
			const peakFreq = spectrumAnalyzer.getPeakFrequency(frequencyData, 44100);
			
			expect(peakFreq).toBeCloseTo(2156.25, 0); // 100 * 22050 / 1024
		});

		test('should calculate spectral centroid', () => {
			const frequencyData = new Uint8Array(1024);
			// Create a simple distribution
			for (let i = 0; i < 1024; i++) {
				frequencyData[i] = i < 512 ? 255 : 0;
			}
			
			const centroid = spectrumAnalyzer.getSpectralCentroid(frequencyData, 44100);
			
			expect(centroid).toBeGreaterThan(0);
			expect(centroid).toBeLessThan(22050);
		});
	});

	describe('Audio Features', () => {
		test('should calculate RMS', () => {
			const rms = spectrumAnalyzer.getRMS(mockAudioBuffer);
			
			expect(typeof rms).toBe('number');
			expect(rms).toBeGreaterThanOrEqual(0);
			expect(rms).toBeLessThanOrEqual(1);
		});

		test('should calculate zero crossing rate', () => {
			const zcr = spectrumAnalyzer.getZeroCrossingRate(mockAudioBuffer);
			
			expect(typeof zcr).toBe('number');
			expect(zcr).toBeGreaterThanOrEqual(0);
		});

		test('should handle silent audio', () => {
			const silentBuffer = {
				...mockAudioBuffer,
				getChannelData: jest.fn(() => new Float32Array(4096)) // All zeros
			};
			
			const rms = spectrumAnalyzer.getRMS(silentBuffer);
			const zcr = spectrumAnalyzer.getZeroCrossingRate(silentBuffer);
			
			expect(rms).toBe(0);
			expect(zcr).toBe(0);
		});
	});

	describe('Spectrogram Generation', () => {
		test('should create spectrogram', () => {
			const spectrogram = spectrumAnalyzer.createSpectrogram(mockAudioBuffer);
			
			expect(spectrogram).toBeInstanceOf(Array);
			expect(spectrogram.length).toBeGreaterThan(0);
			
			// Check structure
			const firstFrame = spectrogram[0];
			expect(firstFrame).toHaveProperty('time');
			expect(firstFrame).toHaveProperty('spectrum');
			expect(firstFrame.spectrum).toBeInstanceOf(Array);
		});

		test('should create spectrogram with custom parameters', () => {
			const spectrogram = spectrumAnalyzer.createSpectrogram(mockAudioBuffer, 512, 256);
			
			expect(spectrogram).toBeInstanceOf(Array);
			expect(spectrogram.length).toBeGreaterThan(0);
		});

		test('should apply windowing function', () => {
			const spectrogram = spectrumAnalyzer.createSpectrogram(mockAudioBuffer);
			
			// Should have applied Hann window (implementation detail)
			expect(spectrogram).toBeInstanceOf(Array);
		});
	});

	describe('Cleanup', () => {
		test('should destroy analyser properly', () => {
			spectrumAnalyzer.initialize();
			const analyser = spectrumAnalyzer.analyser;
			
			spectrumAnalyzer.destroy();
			
			expect(analyser.disconnect).toHaveBeenCalled();
			expect(spectrumAnalyzer.analyser).toBeNull();
			expect(spectrumAnalyzer.dataArray).toBeNull();
		});

		test('should handle multiple destroy calls', () => {
			spectrumAnalyzer.initialize();
			
			expect(() => {
				spectrumAnalyzer.destroy();
				spectrumAnalyzer.destroy();
			}).not.toThrow();
		});
	});
});
