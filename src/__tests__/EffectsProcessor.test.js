import { EffectsProcessorService } from "../services/EffectsProcessor";

// Mock AudioContext
const mockAudioBuffer = {
	duration: 2.0,
	numberOfChannels: 2,
	sampleRate: 44100,
	length: 88200,
	getChannelData: jest.fn().mockReturnValue(new Float32Array(88200).map((_, i) => Math.sin(i * 0.01)))
};

const mockNewBuffer = {
	duration: 2.0,
	numberOfChannels: 2,
	sampleRate: 44100,
	length: 88200,
	getChannelData: jest.fn().mockReturnValue(new Float32Array(88200))
};

const mockAudioContext = {
	createBuffer: jest.fn().mockReturnValue(mockNewBuffer),
	sampleRate: 44100
};

describe('EffectsProcessorService', () => {
	let effectsProcessor;

	beforeEach(() => {
		effectsProcessor = new EffectsProcessorService(mockAudioContext);
		jest.clearAllMocks();
	});

	describe('Basic Effects', () => {
		test('should amplify audio', () => {
			const result = effectsProcessor.amplify(mockAudioBuffer, 2.0);

			expect(result).toBeTruthy();
			expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(
				mockAudioBuffer.numberOfChannels,
				mockAudioBuffer.length,
				mockAudioBuffer.sampleRate
			);
		});

		test('should normalize audio', () => {
			const result = effectsProcessor.normalize(mockAudioBuffer, 0.95);

			expect(result).toBeTruthy();
			expect(mockAudioContext.createBuffer).toHaveBeenCalled();
		});

		test('should apply fade in', () => {
			const result = effectsProcessor.fadeIn(mockAudioBuffer, 1.0);

			expect(result).toBeTruthy();
			expect(mockAudioContext.createBuffer).toHaveBeenCalled();
		});

		test('should apply fade out', () => {
			const result = effectsProcessor.fadeOut(mockAudioBuffer, 1.0);

			expect(result).toBeTruthy();
			expect(mockAudioContext.createBuffer).toHaveBeenCalled();
		});
	});

	describe('Time-based Effects', () => {
		test('should apply echo effect', () => {
			const result = effectsProcessor.echo(mockAudioBuffer, 0.3, 0.5, 3);

			expect(result).toBeTruthy();
			expect(mockAudioContext.createBuffer).toHaveBeenCalled();
		});

		test('should apply reverb effect', () => {
			const result = effectsProcessor.reverb(mockAudioBuffer, 0.5, 0.5, 0.3);

			expect(result).toBeTruthy();
			expect(mockAudioContext.createBuffer).toHaveBeenCalled();
		});
	});

	describe('Frequency-based Effects', () => {
		test('should apply high pass filter', () => {
			const result = effectsProcessor.highPassFilter(mockAudioBuffer, 1000);

			expect(result).toBeTruthy();
			expect(mockAudioContext.createBuffer).toHaveBeenCalled();
		});

		test('should apply low pass filter', () => {
			const result = effectsProcessor.lowPassFilter(mockAudioBuffer, 1000);

			expect(result).toBeTruthy();
			expect(mockAudioContext.createBuffer).toHaveBeenCalled();
		});
	});

	describe('Advanced Effects', () => {
		test('should change speed', () => {
			const result = effectsProcessor.changeSpeed(mockAudioBuffer, 1.5);

			expect(result).toBeTruthy();
			expect(mockAudioContext.createBuffer).toHaveBeenCalled();
		});

		test('should change pitch', () => {
			const result = effectsProcessor.changePitch(mockAudioBuffer, 1.2);

			expect(result).toBeTruthy();
			expect(mockAudioContext.createBuffer).toHaveBeenCalled();
		});

		test('should apply noise reduction', () => {
			const result = effectsProcessor.noiseReduction(mockAudioBuffer, 0.1, 0.8);

			expect(result).toBeTruthy();
			expect(mockAudioContext.createBuffer).toHaveBeenCalled();
		});
	});

	describe('Effect Application', () => {
		test('should apply effect by name with parameters', () => {
			const result = effectsProcessor.applyEffect('amplify', mockAudioBuffer, { gain: 2.0 });

			expect(result).toBeTruthy();
			expect(mockAudioContext.createBuffer).toHaveBeenCalled();
		});

		test('should handle unknown effect name', () => {
			expect(() => {
				effectsProcessor.applyEffect('unknownEffect', mockAudioBuffer, {});
			}).toThrow('Unknown effect: unknownEffect');
		});

		test('should get effect parameters', () => {
			const params = effectsProcessor.getEffectParameters('amplify');

			expect(params).toEqual([
				{
					name: 'gain',
					label: 'Gain',
					type: 'number',
					min: 0,
					max: 10,
					default: 1.5,
					step: 0.1
				}
			]);
		});

		test('should return empty array for unknown effect parameters', () => {
			const params = effectsProcessor.getEffectParameters('unknownEffect');
			expect(params).toEqual([]);
		});
	});

	describe('Effect History', () => {
		test('should track effect history', () => {
			effectsProcessor.amplify(mockAudioBuffer, 2.0);
			effectsProcessor.normalize(mockAudioBuffer, 0.95);

			expect(effectsProcessor.effectsHistory).toHaveLength(2);
			expect(effectsProcessor.effectsHistory[0].effectName).toBe('amplify');
			expect(effectsProcessor.effectsHistory[1].effectName).toBe('normalize');
		});

		test('should include timestamps in history', () => {
			const beforeTime = Date.now();
			effectsProcessor.amplify(mockAudioBuffer, 2.0);
			const afterTime = Date.now();

			const historyEntry = effectsProcessor.effectsHistory[0];
			expect(historyEntry.timestamp).toBeGreaterThanOrEqual(beforeTime);
			expect(historyEntry.timestamp).toBeLessThanOrEqual(afterTime);
		});
	});

	describe('Utility Methods', () => {
		test('should copy buffer correctly', () => {
			const result = effectsProcessor.copyBuffer(mockAudioBuffer);

			expect(result).toBeTruthy();
			expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(
				mockAudioBuffer.numberOfChannels,
				mockAudioBuffer.length,
				mockAudioBuffer.sampleRate
			);
		});

		test('should create impulse response for reverb', () => {
			const impulseResponse = effectsProcessor.createImpulseResponse(2.0, 0.3, 44100);

			expect(impulseResponse).toBeTruthy();
			expect(mockAudioContext.createBuffer).toHaveBeenCalled();
		});
	});

	describe('Edge Cases', () => {
		test('should handle zero-length buffer', () => {
			const zeroBuffer = {
				...mockAudioBuffer,
				length: 0,
				getChannelData: jest.fn().mockReturnValue(new Float32Array(0))
			};

			const result = effectsProcessor.amplify(zeroBuffer, 2.0);
			expect(result).toBeTruthy();
		});

		test('should handle extreme gain values', () => {
			const result = effectsProcessor.amplify(mockAudioBuffer, 0);
			expect(result).toBeTruthy();

			const result2 = effectsProcessor.amplify(mockAudioBuffer, 1000);
			expect(result2).toBeTruthy();
		});

		test('should handle extreme speed ratios', () => {
			const result = effectsProcessor.changeSpeed(mockAudioBuffer, 0.1);
			expect(result).toBeTruthy();

			const result2 = effectsProcessor.changeSpeed(mockAudioBuffer, 10);
			expect(result2).toBeTruthy();
		});
	});
});
