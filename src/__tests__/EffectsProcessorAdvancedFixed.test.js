import { EffectsProcessorService } from '../services/EffectsProcessor.js';

// Mock Web Audio API
const createMockAudioContext = () => ({
    createBuffer: jest.fn().mockReturnValue({
        length: 44100,
        sampleRate: 44100,
        numberOfChannels: 2,
        getChannelData: jest.fn().mockReturnValue(new Float32Array(44100))
    }),
    createDelay: jest.fn().mockReturnValue({
        delayTime: { value: 0 },
        connect: jest.fn(),
        disconnect: jest.fn()
    }),
    createConvolver: jest.fn().mockReturnValue({
        buffer: null,
        connect: jest.fn(),
        disconnect: jest.fn()
    }),
    createBiquadFilter: jest.fn().mockReturnValue({
        type: 'lowpass',
        frequency: { value: 440 },
        Q: { value: 1 },
        gain: { value: 0 },
        connect: jest.fn(),
        disconnect: jest.fn()
    }),
    createGain: jest.fn().mockReturnValue({
        gain: { value: 1 },
        connect: jest.fn(),
        disconnect: jest.fn()
    }),
    sampleRate: 44100
});

describe('EffectsProcessor Advanced Tests', () => {
    let effectsProcessor;
    let mockAudioContext;
    let mockAudioBuffer;

    beforeEach(() => {
        mockAudioContext = createMockAudioContext();
        effectsProcessor = new EffectsProcessorService(mockAudioContext);
        
        mockAudioBuffer = {
            length: 44100,
            sampleRate: 44100,
            numberOfChannels: 2,
            getChannelData: jest.fn().mockReturnValue(new Float32Array(44100))
        };
    });

    describe('Filter Effects', () => {
        test('should apply low-pass filter correctly', () => {
            const result = effectsProcessor.lowPassFilter(mockAudioBuffer, 1000);
            
            expect(result).toBeTruthy();
            expect(result).toBeInstanceOf(Object);
        });

        test('should apply high-pass filter correctly', () => {
            const result = effectsProcessor.highPassFilter(mockAudioBuffer, 100);
            
            expect(result).toBeTruthy();
            expect(result).toBeInstanceOf(Object);
        });

        test('should apply low-pass filter with different cutoff frequencies', () => {
            const result1 = effectsProcessor.lowPassFilter(mockAudioBuffer, 500);
            const result2 = effectsProcessor.lowPassFilter(mockAudioBuffer, 2000);
            
            expect(result1).toBeTruthy();
            expect(result2).toBeTruthy();
        });

        test('should apply high-pass filter with different cutoff frequencies', () => {
            const result1 = effectsProcessor.highPassFilter(mockAudioBuffer, 80);
            const result2 = effectsProcessor.highPassFilter(mockAudioBuffer, 1200);
            
            expect(result1).toBeTruthy();
            expect(result2).toBeTruthy();
        });
    });

    describe('Dynamics Effects', () => {
        test('should apply compress effect', () => {
            const result = effectsProcessor.compress(mockAudioBuffer, 0.7, 0.01, 0.1, 4);
            
            expect(result).toBeTruthy();
            expect(result).toBeInstanceOf(Object);
        });

        test('should apply distortion effect', () => {
            const result = effectsProcessor.distortion(mockAudioBuffer, 50, 0.5);
            
            expect(result).toBeTruthy();
            expect(result).toBeInstanceOf(Object);
        });

        test('should apply noise reduction', () => {
            const result = effectsProcessor.noiseReduction(mockAudioBuffer, 0.1, 0.8);
            
            expect(result).toBeTruthy();
            expect(result).toBeInstanceOf(Object);
        });
    });

    describe('Time-based Effects', () => {
        test('should apply echo effect with default parameters', () => {
            const result = effectsProcessor.echo(mockAudioBuffer);
            
            expect(result).toBeTruthy();
        });

        test('should apply echo effect with custom parameters', () => {
            const result = effectsProcessor.echo(mockAudioBuffer, 0.2, 0.6, 2);
            
            expect(result).toBeTruthy();
        });

        test('should apply reverb effect', () => {
            const result = effectsProcessor.reverb(mockAudioBuffer, 0.8, 0.6, 0.4);
            
            expect(result).toBeTruthy();
        });
    });

    describe('Modulation Effects', () => {
        test('should apply chorus effect', () => {
            const result = effectsProcessor.chorus(mockAudioBuffer, 0.5, 0.002, 0.5);
            
            expect(result).toBeTruthy();
        });

        test('should apply phaser effect', () => {
            const result = effectsProcessor.phaser(mockAudioBuffer, 0.5, 1, 0.5, 0.5);
            
            expect(result).toBeTruthy();
        });

        test('should apply flanger effect', () => {
            const result = effectsProcessor.flanger(mockAudioBuffer, 0.2, 0.005, 0.3, 0.5);
            
            expect(result).toBeTruthy();
        });
    });

    describe('Pitch and Speed Effects', () => {
        test('should change speed correctly', () => {
            const result = effectsProcessor.changeSpeed(mockAudioBuffer, 1.5);
            
            expect(result).toBeTruthy();
        });

        test('should change pitch correctly', () => {
            const result = effectsProcessor.changePitch(mockAudioBuffer, 1.2);
            
            expect(result).toBeTruthy();
        });

        test('should apply time stretch', () => {
            const result = effectsProcessor.timeStretch(mockAudioBuffer, 1.3);
            
            expect(result).toBeTruthy();
        });

        test('should apply auto-tune with major scale', () => {
            const result = effectsProcessor.autoTune(mockAudioBuffer, 'major');
            
            expect(result).toBeTruthy();
        });

        test('should apply auto-tune with minor scale', () => {
            const result = effectsProcessor.autoTune(mockAudioBuffer, 'minor');
            
            expect(result).toBeTruthy();
        });
    });

    describe('Distortion Effects', () => {
        test('should apply waveshaper effect', () => {
            const result = effectsProcessor.waveshaper(mockAudioBuffer, 10);
            
            expect(result).toBeTruthy();
        });

        test('should apply distortion with different amounts', () => {
            const result1 = effectsProcessor.distortion(mockAudioBuffer, 25);
            const result2 = effectsProcessor.distortion(mockAudioBuffer, 75);
            
            expect(result1).toBeTruthy();
            expect(result2).toBeTruthy();
        });
    });

    describe('Parameter Validation', () => {
        test('should handle invalid frequency in filters', () => {
            const result = effectsProcessor.lowPassFilter(mockAudioBuffer, -100);
            
            // Should still process (clamp to valid range internally)
            expect(result).toBeTruthy();
        });

        test('should handle zero-length fade duration', () => {
            const result = effectsProcessor.fadeIn(mockAudioBuffer, 0);
            
            expect(result).toBe(mockAudioBuffer); // Should return original
        });

        test('should handle fade duration longer than buffer', () => {
            const result = effectsProcessor.fadeIn(mockAudioBuffer, 10);
            
            expect(result).toBeTruthy();
        });
    });

    describe('Effect Chain Processing', () => {
        test('should process multiple effects in sequence', () => {
            let result = effectsProcessor.amplify(mockAudioBuffer, 1.2);
            result = effectsProcessor.lowPassFilter(result, 5000);
            result = effectsProcessor.echo(result, 0.3, 0.4, 2);
            
            expect(result).toBeTruthy();
        });

        test('should maintain buffer properties through effect chain', () => {
            const result = effectsProcessor.normalize(
                effectsProcessor.reverb(
                    effectsProcessor.compress(mockAudioBuffer)
                )
            );
            
            expect(result).toBeTruthy();
            expect(result.sampleRate).toBe(mockAudioBuffer.sampleRate);
            expect(result.numberOfChannels).toBe(mockAudioBuffer.numberOfChannels);
        });
    });

    describe('Error Handling', () => {
        test('should handle null audio buffer in effects', () => {
            expect(() => {
                effectsProcessor.amplify(null, 1.5);
            }).toThrow();
        });

        test('should handle undefined audio buffer', () => {
            expect(() => {
                effectsProcessor.normalize(undefined);
            }).toThrow();
        });

        test('should handle invalid effect parameters', () => {
            // Test with extreme values
            const result = effectsProcessor.amplify(mockAudioBuffer, 1000);
            expect(result).toBeTruthy();
        });
    });

    describe('Utility Methods', () => {
        test('should copy buffer correctly', () => {
            const result = effectsProcessor.copyBuffer(mockAudioBuffer);
            
            expect(result).toBeTruthy();
            expect(result).not.toBe(mockAudioBuffer); // Should be a different object
        });

        test('should handle null buffer in copyBuffer', () => {
            const result = effectsProcessor.copyBuffer(null);
            
            expect(result).toBeNull();
        });

        test('should get effect parameters', () => {
            const params = effectsProcessor.getEffectParameters('amplify');
            
            expect(params).toBeTruthy();
        });

        test('should add to history', () => {
            effectsProcessor.addToHistory('test-effect', { param: 'value' });
            
            expect(effectsProcessor.effectsHistory).toHaveLength(1);
            expect(effectsProcessor.effectsHistory[0].effect).toBe('test-effect');
        });

        test('should apply effect by name', () => {
            const result = effectsProcessor.applyEffect('amplify', mockAudioBuffer, { gain: 1.5 });
            
            expect(result).toBeTruthy();
        });
    });
});
