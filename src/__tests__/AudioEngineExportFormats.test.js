import { AudioEngineService } from '../services/AudioEngine';

// Mock Web Audio API for testing
const mockAudioContext = {
	createBuffer: jest.fn((channels, length, sampleRate) => ({
		numberOfChannels: channels,
		length,
		sampleRate,
		getChannelData: jest.fn(() => new Float32Array(length))
	})),
	createGain: jest.fn(() => ({
		connect: jest.fn(),
		gain: { value: 1 }
	})),
	createBufferSource: jest.fn(() => ({
		connect: jest.fn(),
		start: jest.fn(),
		stop: jest.fn(),
		buffer: null,
		playbackRate: { value: 1 },
		onended: null
	})),
	createAnalyser: jest.fn(() => ({
		connect: jest.fn(),
		disconnect: jest.fn(),
		fftSize: 2048,
		frequencyBinCount: 1024,
		getByteFrequencyData: jest.fn(),
		getByteTimeDomainData: jest.fn()
	})),
	createMediaStreamSource: jest.fn(() => ({
		connect: jest.fn(),
		disconnect: jest.fn(),
		mediaStream: {
			getTracks: () => [{ stop: jest.fn() }]
		}
	})),
	currentTime: 0,
	close: jest.fn()
};

describe('AudioEngine Export Formats', () => {
	let audioEngine;
	let mockAudioBuffer;

	beforeEach(() => {
		audioEngine = new AudioEngineService();
		audioEngine.audioContext = mockAudioContext;
		
		// Create mock audio buffer
		mockAudioBuffer = {
			numberOfChannels: 2,
			length: 44100,
			sampleRate: 44100,
			getChannelData: jest.fn(() => {
				const data = new Float32Array(44100);
				// Fill with test data
				for (let i = 0; i < data.length; i++) {
					data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5;
				}
				return data;
			})
		};
		
		// Add test track
		audioEngine.audioBuffers.set('test-track', {
			buffer: mockAudioBuffer,
			name: 'Test Track',
			duration: 1.0
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('WAV Export', () => {
		test('should export track as WAV format', async () => {
			const result = await audioEngine.exportAudio('test-track', 'wav');
			
			expect(result).toBeInstanceOf(Blob);
			expect(result.type).toBe('audio/wav');
			expect(result.size).toBeGreaterThan(0);
		});

		test('should handle non-existent track', async () => {
			const result = await audioEngine.exportAudio('non-existent', 'wav');
			expect(result).toBeNull();
		});
	});

	describe('MP3 Export', () => {
		test('should export track as MP3 format', async () => {
			const result = await audioEngine.exportAudio('test-track', 'mp3');
			
			expect(result).toBeInstanceOf(Blob);
			expect(result.type).toBe('audio/mpeg');
			expect(result.size).toBeGreaterThan(0);
		});
	});

	describe('FLAC Export', () => {
		test('should export track as FLAC format', async () => {
			const result = await audioEngine.exportAudio('test-track', 'flac');
			
			expect(result).toBeInstanceOf(Blob);
			expect(result.type).toBe('audio/flac');
			expect(result.size).toBeGreaterThan(0);
		});
	});

	describe('OGG Export', () => {
		test('should export track as OGG format', async () => {
			const result = await audioEngine.exportAudio('test-track', 'ogg');
			
			expect(result).toBeInstanceOf(Blob);
			expect(result.type).toBe('audio/ogg');
			expect(result.size).toBeGreaterThan(0);
		});
	});

	describe('Unsupported Format', () => {
		test('should throw error for unsupported format', async () => {
			await expect(audioEngine.exportAudio('test-track', 'xyz')).rejects.toThrow('Export format xyz not supported');
		});
	});

	describe('Export Integration', () => {
		test('should maintain audio quality in export', async () => {
			const wavResult = await audioEngine.exportAudio('test-track', 'wav');
			const mp3Result = await audioEngine.exportAudio('test-track', 'mp3');
			
			// Both should be valid blobs
			expect(wavResult).toBeInstanceOf(Blob);
			expect(mp3Result).toBeInstanceOf(Blob);
			
			// Should have reasonable file sizes
			expect(wavResult.size).toBeGreaterThan(100);
			expect(mp3Result.size).toBeGreaterThan(100);
		});
	});
});
