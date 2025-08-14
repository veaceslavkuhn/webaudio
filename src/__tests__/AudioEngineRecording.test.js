import { AudioEngineService } from "../services/AudioEngine";

// Mock the Web Audio API components needed for recording
const mockMediaStreamSource = {
	connect: jest.fn(),
	disconnect: jest.fn()
};

const mockScriptProcessor = {
	connect: jest.fn(),
	disconnect: jest.fn(),
	onaudioprocess: null
};

const mockMediaStream = {
	getTracks: jest.fn(() => [
		{ stop: jest.fn() }
	])
};

const mockAudioContext = {
	createMediaStreamSource: jest.fn(() => mockMediaStreamSource),
	createScriptProcessor: jest.fn(() => mockScriptProcessor),
	createBuffer: jest.fn(() => ({
		duration: 2.0,
		numberOfChannels: 2,
		sampleRate: 44100,
		getChannelData: jest.fn(() => new Float32Array(88200))
	})),
	sampleRate: 44100,
	destination: {},
	close: jest.fn()
};

// Mock getUserMedia
global.navigator = {
	mediaDevices: {
		getUserMedia: jest.fn(() => Promise.resolve(mockMediaStream))
	}
};

describe('AudioEngine Recording', () => {
	let audioEngine;

	beforeEach(() => {
		audioEngine = new AudioEngineService();
		audioEngine.audioContext = mockAudioContext;
		audioEngine.onRecordingFinished = jest.fn();
		audioEngine.onError = jest.fn();
		audioEngine.onStatusChange = jest.fn();
		jest.clearAllMocks();
	});

	afterEach(() => {
		if (audioEngine) {
			audioEngine.destroy();
		}
	});

	describe('Recording Functionality', () => {
		test('should start recording successfully', async () => {
			await audioEngine.startRecording();

			expect(audioEngine.isRecording).toBe(true);
			expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
				audio: {
					sampleRate: 44100,
					channelCount: 2,
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false,
				},
			});
			expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockMediaStream);
			expect(mockAudioContext.createScriptProcessor).toHaveBeenCalledWith(4096, 2, 2);
			expect(mockMediaStreamSource.connect).toHaveBeenCalledWith(mockScriptProcessor);
			expect(mockScriptProcessor.connect).toHaveBeenCalledWith(mockAudioContext.destination);
			expect(audioEngine.onStatusChange).toHaveBeenCalledWith("Recording...");
		});

		test('should stop recording and process audio', () => {
			// Setup recording state
			audioEngine.isRecording = true;
			audioEngine.recordingSource = mockMediaStreamSource;
			audioEngine.recordingProcessor = mockScriptProcessor;
			audioEngine.recordingBuffers = [
				[new Float32Array([0.1, 0.2, 0.3])],
				[new Float32Array([0.4, 0.5, 0.6])]
			];
			audioEngine.recordingLength = 3;

			audioEngine.stopRecording();

			expect(audioEngine.isRecording).toBe(false);
			expect(mockMediaStreamSource.disconnect).toHaveBeenCalled();
			expect(mockScriptProcessor.disconnect).toHaveBeenCalled();
			expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(2, 3, 44100);
			expect(audioEngine.onRecordingFinished).toHaveBeenCalled();
			expect(audioEngine.onStatusChange).toHaveBeenCalledWith("Recording stopped");
		});

		test('should handle recording permission denied', async () => {
			navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(
				new Error('Permission denied')
			);

			await expect(audioEngine.startRecording()).rejects.toThrow('Permission denied');
			expect(audioEngine.onError).toHaveBeenCalledWith('Recording failed: Permission denied');
		});

		test('should not start recording if already recording', async () => {
			audioEngine.isRecording = true;

			await audioEngine.startRecording();

			expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
		});

		test('should not stop recording if not recording', () => {
			audioEngine.isRecording = false;

			audioEngine.stopRecording();

			expect(audioEngine.onStatusChange).not.toHaveBeenCalled();
		});
	});

	describe('Audio Processing', () => {
		test('should process recording buffers correctly', () => {
			// Setup mock recording data
			const leftChunk1 = new Float32Array([0.1, 0.2]);
			const rightChunk1 = new Float32Array([0.3, 0.4]);
			const leftChunk2 = new Float32Array([0.5, 0.6]);
			const rightChunk2 = new Float32Array([0.7, 0.8]);

			audioEngine.recordingBuffers = [
				[leftChunk1, leftChunk2],
				[rightChunk1, rightChunk2]
			];
			audioEngine.recordingLength = 4;

			const mockBuffer = {
				getChannelData: jest.fn()
					.mockReturnValueOnce(new Float32Array(4)) // left channel
					.mockReturnValueOnce(new Float32Array(4)) // right channel
			};
			mockAudioContext.createBuffer.mockReturnValueOnce(mockBuffer);

			audioEngine.processRecordingBuffers();

			expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(2, 4, 44100);
			expect(mockBuffer.getChannelData).toHaveBeenCalledWith(0); // left channel
			expect(mockBuffer.getChannelData).toHaveBeenCalledWith(1); // right channel
			expect(audioEngine.onRecordingFinished).toHaveBeenCalled();
		});

		test('should handle audio processing errors', () => {
			audioEngine.recordingBuffers = [[], []];
			audioEngine.recordingLength = 0;
			mockAudioContext.createBuffer.mockImplementationOnce(() => {
				throw new Error('Buffer creation failed');
			});

			audioEngine.processRecordingBuffers();

			expect(audioEngine.onError).toHaveBeenCalledWith(
				'Failed to process recording: Buffer creation failed'
			);
		});
	});
});
