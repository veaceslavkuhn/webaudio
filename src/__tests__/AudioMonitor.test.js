import { AudioMonitor } from '../services/AudioMonitor';

// Mock Web Audio API
const mockAudioContext = {
	createAnalyser: jest.fn(() => ({
		fftSize: 512,
		smoothingTimeConstant: 0.8,
		frequencyBinCount: 256,
		getByteFrequencyData: jest.fn((array) => {
			// Fill with mock data simulating audio levels
			for (let i = 0; i < array.length; i++) {
				array[i] = Math.floor(Math.random() * 200 + 50);
			}
		}),
		disconnect: jest.fn()
	})),
	createMediaStreamSource: jest.fn(() => ({
		connect: jest.fn(),
		disconnect: jest.fn(),
		mediaStream: {
			getTracks: () => [{
				stop: jest.fn()
			}]
		}
	}))
};

// Mock navigator.mediaDevices
global.navigator.mediaDevices = {
	getUserMedia: jest.fn(() => Promise.resolve({
		getTracks: () => [{
			stop: jest.fn()
		}]
	})),
	enumerateDevices: jest.fn(() => Promise.resolve([
		{
			deviceId: 'input1',
			kind: 'audioinput',
			label: 'Microphone 1',
			groupId: 'group1'
		},
		{
			deviceId: 'input2',
			kind: 'audioinput',
			label: 'Microphone 2',
			groupId: 'group2'
		},
		{
			deviceId: 'output1',
			kind: 'audiooutput',
			label: 'Speaker 1',
			groupId: 'group3'
		}
	]))
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
	setTimeout(callback, 16);
	return 1;
});

global.cancelAnimationFrame = jest.fn();

describe('Audio Monitor', () => {
	let audioMonitor;
	let onLevelUpdateMock;
	let onErrorMock;

	beforeEach(() => {
		audioMonitor = new AudioMonitor(mockAudioContext);
		onLevelUpdateMock = jest.fn();
		onErrorMock = jest.fn();
		
		audioMonitor.setCallback(onLevelUpdateMock);
		audioMonitor.setErrorCallback(onErrorMock);
		
		jest.clearAllMocks();
	});

	afterEach(() => {
		if (audioMonitor.isMonitoring) {
			audioMonitor.stopMonitoring();
		}
	});

	describe('Initialization', () => {
		test('should initialize with correct default values', () => {
			expect(audioMonitor.isMonitoring).toBe(false);
			expect(audioMonitor.analyser).toBeNull();
			expect(audioMonitor.microphone).toBeNull();
			expect(audioMonitor.peakLevel).toBe(0);
		});

		test('should set callbacks correctly', () => {
			const testCallback = jest.fn();
			const testErrorCallback = jest.fn();
			
			audioMonitor.setCallback(testCallback);
			audioMonitor.setErrorCallback(testErrorCallback);
			
			expect(audioMonitor.onLevelUpdate).toBe(testCallback);
			expect(audioMonitor.onError).toBe(testErrorCallback);
		});
	});

	describe('Start Monitoring', () => {
		test('should start monitoring successfully', async () => {
			const result = await audioMonitor.startMonitoring();
			
			expect(result).toBe(true);
			expect(audioMonitor.isMonitoring).toBe(true);
			expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
				audio: {
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false
				}
			});
			expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
			expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalled();
		});

		test('should handle microphone access failure', async () => {
			navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(
				new Error('Permission denied')
			);
			
			const result = await audioMonitor.startMonitoring();
			
			expect(result).toBe(false);
			expect(onErrorMock).toHaveBeenCalledWith(
				'Failed to access microphone: Permission denied'
			);
		});

		test('should configure analyser correctly', async () => {
			await audioMonitor.startMonitoring();
			
			expect(audioMonitor.analyser.fftSize).toBe(512);
			expect(audioMonitor.analyser.smoothingTimeConstant).toBe(0.8);
			expect(audioMonitor.bufferLength).toBe(256);
			expect(audioMonitor.dataArray).toBeInstanceOf(Uint8Array);
		});
	});

	describe('Level Updates', () => {
		beforeEach(async () => {
			await audioMonitor.startMonitoring();
		});

		test('should call level update callback', (done) => {
			// Wait for at least one update cycle
			setTimeout(() => {
				expect(onLevelUpdateMock).toHaveBeenCalled();
				
				const lastCall = onLevelUpdateMock.mock.calls[onLevelUpdateMock.mock.calls.length - 1];
				const levelData = lastCall[0];
				
				expect(levelData).toHaveProperty('rms');
				expect(levelData).toHaveProperty('peak');
				expect(levelData).toHaveProperty('dbLevel');
				expect(levelData).toHaveProperty('dbPeak');
				expect(levelData).toHaveProperty('frequencyData');
				expect(levelData).toHaveProperty('isClipping');
				
				expect(typeof levelData.rms).toBe('number');
				expect(typeof levelData.peak).toBe('number');
				expect(typeof levelData.dbLevel).toBe('number');
				expect(typeof levelData.dbPeak).toBe('number');
				expect(levelData.frequencyData).toBeInstanceOf(Uint8Array);
				expect(typeof levelData.isClipping).toBe('boolean');
				
				done();
			}, 50);
		});

		test('should detect clipping', async () => {
			// Mock high level data
			mockAudioContext.createAnalyser.mockReturnValueOnce({
				fftSize: 512,
				smoothingTimeConstant: 0.8,
				frequencyBinCount: 256,
				getByteFrequencyData: jest.fn((array) => {
					// Fill with high values to simulate clipping
					for (let i = 0; i < array.length; i++) {
						array[i] = 250; // High level
					}
				}),
				disconnect: jest.fn()
			});
			
			const clippingMonitor = new AudioMonitor(mockAudioContext);
			const clippingCallback = jest.fn();
			clippingMonitor.setCallback(clippingCallback);
			
			await clippingMonitor.startMonitoring();
			
			setTimeout(() => {
				expect(clippingCallback).toHaveBeenCalled();
				const levelData = clippingCallback.mock.calls[0][0];
				expect(levelData.isClipping).toBe(true);
				
				clippingMonitor.stopMonitoring();
			}, 50);
		});
	});

	describe('Stop Monitoring', () => {
		test('should stop monitoring correctly', async () => {
			await audioMonitor.startMonitoring();
			
			expect(audioMonitor.isMonitoring).toBe(true);
			
			audioMonitor.stopMonitoring();
			
			expect(audioMonitor.isMonitoring).toBe(false);
			expect(audioMonitor.analyser).toBeNull();
			expect(audioMonitor.microphone).toBeNull();
			expect(audioMonitor.dataArray).toBeNull();
			expect(audioMonitor.peakLevel).toBe(0);
		});

		test('should stop media tracks', async () => {
			const mockTrack = { stop: jest.fn() };
			const mockStream = { getTracks: () => [mockTrack] };
			
			navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockStream);
			
			await audioMonitor.startMonitoring();
			audioMonitor.stopMonitoring();
			
			expect(mockTrack.stop).toHaveBeenCalled();
		});

		test('should cancel animation frame', async () => {
			await audioMonitor.startMonitoring();
			audioMonitor.stopMonitoring();
			
			expect(global.cancelAnimationFrame).toHaveBeenCalled();
		});
	});

	describe('Device Management', () => {
		test('should get input devices', async () => {
			const devices = await audioMonitor.getInputDevices();
			
			expect(devices).toBeInstanceOf(Array);
			expect(devices).toHaveLength(2); // Only audio input devices
			expect(devices[0]).toHaveProperty('deviceId');
			expect(devices[0]).toHaveProperty('label');
			expect(devices[0]).toHaveProperty('kind');
		});

		test('should switch input device', async () => {
			await audioMonitor.startMonitoring();
			
			const result = await audioMonitor.switchInputDevice('input2');
			
			expect(result).toBe(true);
			expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
				audio: {
					deviceId: { exact: 'input2' },
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false
				}
			});
		});

		test('should handle device switch failure', async () => {
			await audioMonitor.startMonitoring();
			
			navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(
				new Error('Device not found')
			);
			
			const result = await audioMonitor.switchInputDevice('invalid-device');
			
			expect(result).toBe(false);
			expect(onErrorMock).toHaveBeenCalledWith(
				'Failed to switch input device: Device not found'
			);
		});
	});

	describe('Level Meter Creation', () => {
		test('should create level meter component', () => {
			const container = document.createElement('div');
			
			const meter = audioMonitor.createLevelMeter(container);
			
			expect(meter).toHaveProperty('update');
			expect(meter).toHaveProperty('destroy');
			expect(typeof meter.update).toBe('function');
			expect(typeof meter.destroy).toBe('function');
			
			const canvas = container.querySelector('canvas');
			expect(canvas).toBeTruthy();
			expect(canvas.width).toBe(20);
			expect(canvas.height).toBe(200);
		});

		test('should create level meter with custom options', () => {
			const container = document.createElement('div');
			const options = {
				width: 30,
				height: 300,
				backgroundColor: '#333',
				foregroundColor: '#ff0000',
				orientation: 'horizontal'
			};
			
			audioMonitor.createLevelMeter(container, options);
			
			const canvas = container.querySelector('canvas');
			expect(canvas.width).toBe(30);
			expect(canvas.height).toBe(300);
		});

		test('should destroy level meter correctly', () => {
			const container = document.createElement('div');
			const meter = audioMonitor.createLevelMeter(container);
			
			const canvas = container.querySelector('canvas');
			expect(canvas).toBeTruthy();
			
			meter.destroy();
			
			const canvasAfter = container.querySelector('canvas');
			expect(canvasAfter).toBeFalsy();
		});
	});

	describe('Error Handling', () => {
		test('should handle getUserMedia not supported', async () => {
			const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
			navigator.mediaDevices.getUserMedia = undefined;
			
			const result = await audioMonitor.startMonitoring();
			
			expect(result).toBe(false);
			
			// Restore
			navigator.mediaDevices.getUserMedia = originalGetUserMedia;
		});

		test('should handle stopping when not monitoring', () => {
			expect(() => {
				audioMonitor.stopMonitoring();
			}).not.toThrow();
		});
	});
});
