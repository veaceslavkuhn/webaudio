import { EffectsProcessor } from '../services/EffectsProcessor';

// Mock Web Audio API
const mockAudioContext = {
	createBuffer: jest.fn((channels, length, sampleRate) => ({
		numberOfChannels: channels,
		length,
		sampleRate,
		getChannelData: jest.fn(() => new Float32Array(length))
	})),
	sampleRate: 44100
};

describe('Advanced Effects Processor', () => {
	let effectsProcessor;
	let mockAudioBuffer;

	beforeEach(() => {
		effectsProcessor = new EffectsProcessor(mockAudioContext);
		
		// Create test audio buffer
		mockAudioBuffer = {
			numberOfChannels: 2,
			length: 1024,
			sampleRate: 44100,
			getChannelData: jest.fn(() => {
				const data = new Float32Array(1024);
				// Fill with test sine wave
				for (let i = 0; i < data.length; i++) {
					data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5;
				}
				return data;
			})
		};

		// Mock copyBuffer method
		effectsProcessor.copyBuffer = jest.fn(() => ({
			...mockAudioBuffer,
			getChannelData: jest.fn(() => new Float32Array(1024))
		}));
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Pitch Shift Effect', () => {
		test('should apply pitch shift without errors', () => {
			const result = effectsProcessor.pitchShift(mockAudioBuffer, 12); // Up one octave
			
			expect(result).toBeDefined();
			expect(effectsProcessor.copyBuffer).toHaveBeenCalledWith(mockAudioBuffer);
		});

		test('should handle negative pitch shift', () => {
			const result = effectsProcessor.pitchShift(mockAudioBuffer, -12); // Down one octave
			
			expect(result).toBeDefined();
			expect(effectsProcessor.copyBuffer).toHaveBeenCalledWith(mockAudioBuffer);
		});

		test('should handle zero pitch shift', () => {
			const result = effectsProcessor.pitchShift(mockAudioBuffer, 0);
			
			expect(result).toBeDefined();
			expect(effectsProcessor.copyBuffer).toHaveBeenCalledWith(mockAudioBuffer);
		});
	});

	describe('Time Stretch Effect', () => {
		test('should apply time stretch without errors', () => {
			const result = effectsProcessor.timeStretch(mockAudioBuffer, 1.5);
			
			expect(result).toBeDefined();
			expect(mockAudioContext.createBuffer).toHaveBeenCalled();
		});

		test('should handle compression (stretch factor < 1)', () => {
			const result = effectsProcessor.timeStretch(mockAudioBuffer, 0.5);
			
			expect(result).toBeDefined();
		});

		test('should handle normal speed (stretch factor = 1)', () => {
			const result = effectsProcessor.timeStretch(mockAudioBuffer, 1.0);
			
			expect(result).toBeDefined();
		});
	});

	describe('Chorus Effect', () => {
		test('should apply chorus with default parameters', () => {
			const result = effectsProcessor.chorus(mockAudioBuffer);
			
			expect(result).toBeDefined();
			expect(effectsProcessor.copyBuffer).toHaveBeenCalledWith(mockAudioBuffer);
		});

		test('should apply chorus with custom parameters', () => {
			const result = effectsProcessor.chorus(mockAudioBuffer, 1.0, 0.005, 0.7);
			
			expect(result).toBeDefined();
		});

		test('should handle extreme parameters', () => {
			const result = effectsProcessor.chorus(mockAudioBuffer, 0.1, 0.001, 1.0);
			
			expect(result).toBeDefined();
		});
	});

	describe('Phaser Effect', () => {
		test('should apply phaser with default parameters', () => {
			const result = effectsProcessor.phaser(mockAudioBuffer);
			
			expect(result).toBeDefined();
			expect(effectsProcessor.copyBuffer).toHaveBeenCalledWith(mockAudioBuffer);
		});

		test('should apply phaser with custom parameters', () => {
			const result = effectsProcessor.phaser(mockAudioBuffer, 0.3, 2.0, 0.8, 0.6);
			
			expect(result).toBeDefined();
		});
	});

	describe('Flanger Effect', () => {
		test('should apply flanger with default parameters', () => {
			const result = effectsProcessor.flanger(mockAudioBuffer);
			
			expect(result).toBeDefined();
			expect(effectsProcessor.copyBuffer).toHaveBeenCalledWith(mockAudioBuffer);
		});

		test('should apply flanger with custom parameters', () => {
			const result = effectsProcessor.flanger(mockAudioBuffer, 0.1, 0.002, 0.5, 0.8);
			
			expect(result).toBeDefined();
		});
	});

	describe('Waveshaper Effect', () => {
		test('should apply waveshaper with default parameters', () => {
			const result = effectsProcessor.waveshaper(mockAudioBuffer);
			
			expect(result).toBeDefined();
			expect(effectsProcessor.copyBuffer).toHaveBeenCalledWith(mockAudioBuffer);
		});

		test('should apply waveshaper with high amount', () => {
			const result = effectsProcessor.waveshaper(mockAudioBuffer, 100);
			
			expect(result).toBeDefined();
		});

		test('should apply waveshaper with low amount', () => {
			const result = effectsProcessor.waveshaper(mockAudioBuffer, 10);
			
			expect(result).toBeDefined();
		});
	});

	describe('Auto-Tune Effect', () => {
		test('should apply auto-tune with default parameters', () => {
			const result = effectsProcessor.autoTune(mockAudioBuffer);
			
			expect(result).toBeDefined();
			expect(effectsProcessor.copyBuffer).toHaveBeenCalledWith(mockAudioBuffer);
		});

		test('should apply auto-tune with major scale', () => {
			const result = effectsProcessor.autoTune(mockAudioBuffer, 'major');
			
			expect(result).toBeDefined();
		});

		test('should apply auto-tune with minor scale', () => {
			const result = effectsProcessor.autoTune(mockAudioBuffer, 'minor');
			
			expect(result).toBeDefined();
		});

		test('should apply auto-tune with chromatic scale', () => {
			const result = effectsProcessor.autoTune(mockAudioBuffer, 'chromatic');
			
			expect(result).toBeDefined();
		});

		test('should handle unknown scale (fallback to major)', () => {
			const result = effectsProcessor.autoTune(mockAudioBuffer, 'unknown');
			
			expect(result).toBeDefined();
		});
	});

	describe('Effect Chain Integration', () => {
		test('should chain multiple effects without errors', () => {
			let result = effectsProcessor.pitchShift(mockAudioBuffer, 5);
			result = effectsProcessor.chorus(result, 0.5, 0.003, 0.4);
			result = effectsProcessor.phaser(result, 0.8, 1.5, 0.6, 0.5);
			
			expect(result).toBeDefined();
		});

		test('should maintain buffer structure through effect chain', () => {
			const result = effectsProcessor.autoTune(mockAudioBuffer, 'minor');
			
			expect(result).toBeDefined();
			expect(result.numberOfChannels).toBe(mockAudioBuffer.numberOfChannels);
		});
	});

	describe('Error Handling', () => {
		test('should handle null audio buffer gracefully', () => {
			expect(() => {
				effectsProcessor.pitchShift(null, 12);
			}).not.toThrow();
		});

		test('should handle empty audio buffer', () => {
			const emptyBuffer = {
				...mockAudioBuffer,
				length: 0,
				getChannelData: jest.fn(() => new Float32Array(0))
			};
			
			expect(() => {
				effectsProcessor.timeStretch(emptyBuffer, 1.5);
			}).not.toThrow();
		});
	});
});
