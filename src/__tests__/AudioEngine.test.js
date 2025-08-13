import { AudioEngineService } from "../services/AudioEngine";

// Mock AudioContext and related APIs
const mockGainNode = {
	connect: jest.fn(),
	gain: {
		setValueAtTime: jest.fn()
	}
};

const mockBufferSource = {
	connect: jest.fn(),
	start: jest.fn(),
	stop: jest.fn(),
	playbackRate: { value: 1 },
	onended: null
};

const mockAudioBuffer = {
	duration: 2.5,
	numberOfChannels: 2,
	sampleRate: 44100,
	length: 110250,
	getChannelData: jest.fn().mockReturnValue(new Float32Array(110250))
};

const mockAudioContext = {
	createGain: jest.fn().mockReturnValue(mockGainNode),
	createBufferSource: jest.fn().mockReturnValue(mockBufferSource),
	createBuffer: jest.fn().mockReturnValue(mockAudioBuffer),
	decodeAudioData: jest.fn().mockResolvedValue(mockAudioBuffer),
	close: jest.fn(),
	resume: jest.fn().mockResolvedValue(),
	state: 'running',
	sampleRate: 44100,
	currentTime: 0,
	destination: {}
};

global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
global.webkitAudioContext = global.AudioContext;

describe('AudioEngineService', () => {
	let audioEngine;

	beforeEach(() => {
		audioEngine = new AudioEngineService();
		// Set up working audio context for tests that need it
		audioEngine.audioContext = mockAudioContext;
		audioEngine.masterGain = {
			connect: jest.fn(),
			disconnect: jest.fn(),
			gain: { 
				value: 1.0,
				setValueAtTime: jest.fn()
			}
		};
		jest.clearAllMocks();
	});

	afterEach(() => {
		if (audioEngine) {
			audioEngine.destroy();
		}
	});

	describe('Initialization', () => {
		test('should initialize audio context successfully', async () => {
			const result = await audioEngine.initializeAudioContext();
			
			expect(result).toBe(true);
			expect(audioEngine.audioContext).toBeTruthy();
			expect(audioEngine.masterGain).toBeTruthy();
			expect(mockAudioContext.createGain).toHaveBeenCalled();
		});

		test('should handle audio context initialization failure', async () => {
			global.AudioContext = jest.fn().mockImplementation(() => {
				throw new Error('AudioContext not supported');
			});

			audioEngine.onError = jest.fn();
			const result = await audioEngine.initializeAudioContext();
			
			expect(result).toBe(false);
			expect(audioEngine.onError).toHaveBeenCalledWith('Web Audio API not supported');
		});
	});

	describe('Track Management', () => {
		test('should add and retrieve track info', () => {
			const trackId = 'test-track';
			const trackInfo = {
				buffer: mockAudioBuffer,
				name: 'Test Track',
				duration: 2.5,
				sampleRate: 44100,
				numberOfChannels: 2
			};

			audioEngine.audioBuffers.set(trackId, trackInfo);
			const retrieved = audioEngine.getTrackInfo(trackId);

			expect(retrieved).toEqual(trackInfo);
		});

		test('should remove track successfully', () => {
			const trackId = 'test-track';
			audioEngine.audioBuffers.set(trackId, { buffer: mockAudioBuffer });

			const result = audioEngine.removeTrack(trackId);

			expect(result).toBe(true);
			expect(audioEngine.audioBuffers.has(trackId)).toBe(false);
		});

		test('should return false when removing non-existent track', () => {
			const result = audioEngine.removeTrack('non-existent');
			expect(result).toBe(false);
		});

		test('should calculate total duration correctly', () => {
			audioEngine.audioBuffers.set('track1', { duration: 2.5 });
			audioEngine.audioBuffers.set('track2', { duration: 3.7 });
			audioEngine.audioBuffers.set('track3', { duration: 1.2 });

			const totalDuration = audioEngine.getTotalDuration();
			expect(totalDuration).toBe(3.7);
		});
	});

	describe('Audio Generation', () => {
		test('should generate sine tone', () => {
			const trackId = audioEngine.generateTone(440, 1.0, 0.5, 'sine');

			expect(trackId).toBeTruthy();
			expect(trackId.startsWith('generated_')).toBe(true);
			expect(audioEngine.audioBuffers.has(trackId)).toBe(true);

			const trackInfo = audioEngine.audioBuffers.get(trackId);
			expect(trackInfo.name).toBe('sine 440Hz');
			expect(trackInfo.duration).toBe(1.0);
		});

		test('should generate different waveforms', () => {
			const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
			
			waveforms.forEach(waveform => {
				const trackId = audioEngine.generateTone(440, 1.0, 0.5, waveform);
				const trackInfo = audioEngine.audioBuffers.get(trackId);
				expect(trackInfo.name).toBe(`${waveform} 440Hz`);
			});
		});

		test('should generate white noise', () => {
			const trackId = audioEngine.generateNoise(1.0, 0.1, 'white');

			expect(trackId).toBeTruthy();
			expect(trackId.startsWith('noise_')).toBe(true);

			const trackInfo = audioEngine.audioBuffers.get(trackId);
			expect(trackInfo.name).toBe('white Noise');
			expect(trackInfo.duration).toBe(1.0);
		});

		test('should generate pink noise', () => {
			const trackId = audioEngine.generateNoise(1.0, 0.1, 'pink');
			const trackInfo = audioEngine.audioBuffers.get(trackId);
			expect(trackInfo.name).toBe('pink Noise');
		});

		test('should generate silence', () => {
			const trackId = audioEngine.generateSilence(2.0);

			expect(trackId).toBeTruthy();
			expect(trackId.startsWith('silence_')).toBe(true);

			const trackInfo = audioEngine.audioBuffers.get(trackId);
			expect(trackInfo.name).toBe('Silence');
			expect(trackInfo.duration).toBe(2.0);
		});
	});

	describe('Audio Editing', () => {
		let trackId;

		beforeEach(() => {
			trackId = audioEngine.generateTone(440, 2.0, 0.5, 'sine');
		});

		test('should copy audio segment', () => {
			const copiedBuffer = audioEngine.copyAudio(trackId, 0.5, 1.5);

			expect(copiedBuffer).toBeTruthy();
			expect(copiedBuffer.numberOfChannels).toBe(mockAudioBuffer.numberOfChannels);
			expect(mockAudioContext.createBuffer).toHaveBeenCalled();
		});

		test('should return null for invalid copy parameters', () => {
			const result = audioEngine.copyAudio(trackId, 1.5, 0.5); // end before start
			expect(result).toBeNull();
		});

		test('should return null for non-existent track copy', () => {
			const result = audioEngine.copyAudio('non-existent', 0, 1);
			expect(result).toBeNull();
		});

		test('should cut audio segment', () => {
			const result = audioEngine.cutAudio(trackId, 0.5, 1.5);

			expect(result).toBe(true);
			expect(mockAudioContext.createBuffer).toHaveBeenCalled();
			
			// Verify the track info was updated
			const updatedInfo = audioEngine.getTrackInfo(trackId);
			expect(updatedInfo.buffer).toBe(mockAudioBuffer); // Mock returns same buffer
		});

		test('should return false for invalid cut parameters', () => {
			const result = audioEngine.cutAudio(trackId, 1.5, 0.5); // end before start
			expect(result).toBe(false);
		});

		test('should return false for non-existent track cut', () => {
			const result = audioEngine.cutAudio('non-existent', 0, 1);
			expect(result).toBe(false);
		});
	});

	describe('Audio Export', () => {
		let trackId;

		beforeEach(() => {
			trackId = audioEngine.generateTone(440, 1.0, 0.5, 'sine');
		});

		test('should export audio as WAV', async () => {
			const blob = await audioEngine.exportAudio(trackId, 'wav');

			expect(blob).toBeInstanceOf(Blob);
			expect(blob.type).toBe('audio/wav');
		});

		test('should return null for non-existent track export', async () => {
			const result = await audioEngine.exportAudio('non-existent', 'wav');
			expect(result).toBeNull();
		});

		test('should throw error for unsupported format', async () => {
			await expect(audioEngine.exportAudio(trackId, 'mp3'))
				.rejects.toThrow('Export format mp3 not supported');
		});
	});

	describe('Playback Control', () => {
		let trackId;

		beforeEach(() => {
			trackId = audioEngine.generateTone(440, 1.0, 0.5, 'sine');
		});

		test('should play track', () => {
			audioEngine.play(trackId, 0, 1.0);

			expect(audioEngine.isPlaying).toBe(true);
			expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
			expect(mockBufferSource.start).toHaveBeenCalled();
		});

		test('should stop playback', () => {
			audioEngine.play(trackId);
			audioEngine.stop();

			expect(audioEngine.isPlaying).toBe(false);
			expect(audioEngine.playingSources.size).toBe(0);
		});

		test('should set master volume', () => {
			audioEngine.setMasterVolume(0.5);

			expect(audioEngine.masterGain.gain.setValueAtTime).toHaveBeenCalledWith(
				0.25, // 0.5^2
				0
			);
		});

		test('should set playback rate', () => {
			audioEngine.setPlaybackRate(1.5);
			expect(audioEngine.playbackRate).toBe(1.5);
		});

		test('should clamp playback rate to valid range', () => {
			audioEngine.setPlaybackRate(0.1); // Below minimum
			expect(audioEngine.playbackRate).toBe(0.25);

			audioEngine.setPlaybackRate(5.0); // Above maximum
			expect(audioEngine.playbackRate).toBe(4.0);
		});
	});

	describe('File Loading', () => {
		test('should load audio from file', async () => {
			const mockFile = new File(['test'], 'test.wav', { type: 'audio/wav' });
			
			// Mock arrayBuffer method
			mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));

			const trackId = await audioEngine.loadAudioFromFile(mockFile);

			expect(trackId).toBeTruthy();
			expect(trackId.startsWith('track_')).toBe(true);
			expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
			expect(audioEngine.audioBuffers.has(trackId)).toBe(true);
		});

		test('should handle file loading error', async () => {
			const mockFile = new File(['test'], 'test.wav', { type: 'audio/wav' });
			mockFile.arrayBuffer = jest.fn().mockRejectedValue(new Error('Invalid file'));

			audioEngine.onError = jest.fn();

			await expect(audioEngine.loadAudioFromFile(mockFile))
				.rejects.toThrow('Invalid file');
			expect(audioEngine.onError).toHaveBeenCalledWith('Invalid audio file format');
		});
	});
});
