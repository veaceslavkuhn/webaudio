import { MIDIService } from '../services/MIDIService';

// Mock Web MIDI API
global.navigator.requestMIDIAccess = jest.fn();

const mockMIDIAccess = {
	inputs: new Map(),
	outputs: new Map(),
	onstatechange: null
};

const mockMIDIInput = {
	id: 'input1',
	name: 'Test Input',
	manufacturer: 'Test Corp',
	state: 'connected',
	onmidimessage: null
};

const mockMIDIOutput = {
	id: 'output1',
	name: 'Test Output',
	manufacturer: 'Test Corp',
	state: 'connected',
	send: jest.fn()
};

describe('MIDI Service', () => {
	let midiService;
	let onNoteOnMock;
	let onNoteOffMock;
	let onControlChangeMock;
	let onErrorMock;

	beforeEach(() => {
		midiService = new MIDIService();
		onNoteOnMock = jest.fn();
		onNoteOffMock = jest.fn();
		onControlChangeMock = jest.fn();
		onErrorMock = jest.fn();
		
		midiService.onNoteOn = onNoteOnMock;
		midiService.onNoteOff = onNoteOffMock;
		midiService.onControlChange = onControlChangeMock;
		midiService.onError = onErrorMock;
		
		// Reset mocks
		jest.clearAllMocks();
		mockMIDIAccess.inputs.clear();
		mockMIDIAccess.outputs.clear();
	});

	afterEach(() => {
		midiService.destroy();
	});

	describe('Initialization', () => {
		test('should initialize successfully when MIDI API is available', async () => {
			global.navigator.requestMIDIAccess.mockResolvedValueOnce(mockMIDIAccess);
			
			const result = await midiService.initialize();
			
			expect(result).toBe(true);
			expect(midiService.isConnected).toBe(true);
			expect(midiService.midiAccess).toBe(mockMIDIAccess);
		});

		test('should fail when MIDI API is not available', async () => {
			global.navigator.requestMIDIAccess = undefined;
			
			const result = await midiService.initialize();
			
			expect(result).toBe(false);
			expect(onErrorMock).toHaveBeenCalledWith(
				'Failed to initialize MIDI: Web MIDI API not supported in this browser'
			);
		});

		test('should handle initialization error', async () => {
			global.navigator.requestMIDIAccess.mockRejectedValueOnce(
				new Error('Access denied')
			);
			
			const result = await midiService.initialize();
			
			expect(result).toBe(false);
			expect(onErrorMock).toHaveBeenCalledWith(
				'Failed to initialize MIDI: Access denied'
			);
		});

		test('should set up state change listener', async () => {
			global.navigator.requestMIDIAccess.mockResolvedValueOnce(mockMIDIAccess);
			
			await midiService.initialize();
			
			expect(mockMIDIAccess.onstatechange).toBe(midiService.handleDeviceStateChange);
		});
	});

	describe('Device Management', () => {
		beforeEach(async () => {
			mockMIDIAccess.inputs.set('input1', mockMIDIInput);
			mockMIDIAccess.outputs.set('output1', mockMIDIOutput);
			global.navigator.requestMIDIAccess.mockResolvedValueOnce(mockMIDIAccess);
			await midiService.initialize();
		});

		test('should update devices on initialization', () => {
			expect(midiService.inputDevices.size).toBe(1);
			expect(midiService.outputDevices.size).toBe(1);
			expect(midiService.inputDevices.get('input1')).toBe(mockMIDIInput);
			expect(midiService.outputDevices.get('output1')).toBe(mockMIDIOutput);
		});

		test('should get input devices list', () => {
			const devices = midiService.getInputDevices();
			
			expect(devices).toHaveLength(1);
			expect(devices[0]).toEqual({
				id: 'input1',
				name: 'Test Input',
				manufacturer: 'Test Corp',
				state: 'connected'
			});
		});

		test('should get output devices list', () => {
			const devices = midiService.getOutputDevices();
			
			expect(devices).toHaveLength(1);
			expect(devices[0]).toEqual({
				id: 'output1',
				name: 'Test Output',
				manufacturer: 'Test Corp',
				state: 'connected'
			});
		});

		test('should handle device state change', () => {
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
			
			const mockEvent = {
				port: {
					name: 'Test Device',
					state: 'connected'
				}
			};
			
			midiService.handleDeviceStateChange(mockEvent);
			
			expect(consoleSpy).toHaveBeenCalledWith(
				'MIDI device state changed:',
				'Test Device',
				'connected'
			);
			
			consoleSpy.mockRestore();
		});
	});

	describe('MIDI Message Handling', () => {
		beforeEach(async () => {
			mockMIDIAccess.inputs.set('input1', mockMIDIInput);
			global.navigator.requestMIDIAccess.mockResolvedValueOnce(mockMIDIAccess);
			await midiService.initialize();
		});

		test('should handle note on message', () => {
			const mockEvent = {
				data: [0x90, 60, 100], // Note on, middle C, velocity 100
				timeStamp: 1000
			};
			
			midiService.handleMIDIMessage(mockEvent);
			
			expect(onNoteOnMock).toHaveBeenCalledWith({
				channel: 0,
				note: 60,
				velocity: 100,
				timestamp: 1000
			});
		});

		test('should handle note off message', () => {
			const mockEvent = {
				data: [0x80, 60, 64], // Note off, middle C, velocity 64
				timeStamp: 1500
			};
			
			midiService.handleMIDIMessage(mockEvent);
			
			expect(onNoteOffMock).toHaveBeenCalledWith({
				channel: 0,
				note: 60,
				velocity: 64,
				timestamp: 1500
			});
		});

		test('should handle note on with zero velocity as note off', () => {
			const mockEvent = {
				data: [0x90, 60, 0], // Note on with velocity 0
				timeStamp: 1200
			};
			
			midiService.handleMIDIMessage(mockEvent);
			
			expect(onNoteOffMock).toHaveBeenCalledWith({
				channel: 0,
				note: 60,
				velocity: 0,
				timestamp: 1200
			});
		});

		test('should handle control change message', () => {
			const mockEvent = {
				data: [0xB0, 7, 127], // Control change, volume, max value
				timeStamp: 2000
			};
			
			midiService.handleMIDIMessage(mockEvent);
			
			expect(onControlChangeMock).toHaveBeenCalledWith({
				channel: 0,
				controller: 7,
				value: 127,
				timestamp: 2000
			});
		});

		test('should handle different channels', () => {
			const mockEvent = {
				data: [0x95, 60, 100], // Note on, channel 5, middle C
				timeStamp: 1000
			};
			
			midiService.handleMIDIMessage(mockEvent);
			
			expect(onNoteOnMock).toHaveBeenCalledWith({
				channel: 5,
				note: 60,
				velocity: 100,
				timestamp: 1000
			});
		});
	});

	describe('MIDI Message Sending', () => {
		beforeEach(async () => {
			mockMIDIAccess.outputs.set('output1', mockMIDIOutput);
			global.navigator.requestMIDIAccess.mockResolvedValueOnce(mockMIDIAccess);
			await midiService.initialize();
		});

		test('should send note on message', () => {
			midiService.sendNoteOn(0, 60, 100);
			
			expect(mockMIDIOutput.send).toHaveBeenCalledWith([0x90, 60, 100]);
		});

		test('should send note off message', () => {
			midiService.sendNoteOff(0, 60, 64);
			
			expect(mockMIDIOutput.send).toHaveBeenCalledWith([0x80, 60, 64]);
		});

		test('should send note off with default velocity', () => {
			midiService.sendNoteOff(0, 60);
			
			expect(mockMIDIOutput.send).toHaveBeenCalledWith([0x80, 60, 64]);
		});

		test('should send control change message', () => {
			midiService.sendControlChange(0, 7, 127);
			
			expect(mockMIDIOutput.send).toHaveBeenCalledWith([0xB0, 7, 127]);
		});

		test('should send to specific device', () => {
			midiService.sendNoteOn(0, 60, 100, 'output1');
			
			expect(mockMIDIOutput.send).toHaveBeenCalledWith([0x90, 60, 100]);
		});

		test('should handle non-existent device gracefully', () => {
			expect(() => {
				midiService.sendNoteOn(0, 60, 100, 'nonexistent');
			}).not.toThrow();
		});
	});

	describe('MIDI File Loading', () => {
		test('should load valid MIDI file', async () => {
			// Create minimal MIDI file data
			const midiData = new ArrayBuffer(22);
			const view = new DataView(midiData);
			
			// "MThd" header
			view.setUint8(0, 0x4D);
			view.setUint8(1, 0x54);
			view.setUint8(2, 0x68);
			view.setUint8(3, 0x64);
			
			// Header length (6)
			view.setUint32(4, 6);
			
			// Format (0), Track count (1), Ticks per quarter (480)
			view.setUint16(8, 0);
			view.setUint16(10, 1);
			view.setUint16(12, 480);
			
			// "MTrk" + length (4) + end of track
			view.setUint8(14, 0x4D);
			view.setUint8(15, 0x54);
			view.setUint8(16, 0x72);
			view.setUint8(17, 0x6B);
			view.setUint32(18, 4);
			
			const mockFile = {
				name: 'test.mid',
				size: 22,
				arrayBuffer: () => Promise.resolve(midiData)
			};
			
			const result = await midiService.loadMIDIFile(mockFile);
			
			expect(result).toEqual({
				name: 'test.mid',
				tracks: 1,
				format: 0,
				ticksPerQuarter: 480,
				duration: expect.any(Number)
			});
		});

		test('should handle invalid MIDI file', async () => {
			const invalidData = new ArrayBuffer(10);
			const mockFile = {
				name: 'invalid.mid',
				size: 10,
				arrayBuffer: () => Promise.resolve(invalidData)
			};
			
			const result = await midiService.loadMIDIFile(mockFile);
			
			expect(result).toBeNull();
			expect(onErrorMock).toHaveBeenCalledWith(
				expect.stringContaining('Failed to load MIDI file')
			);
		});

		test('should handle file read error', async () => {
			const mockFile = {
				name: 'error.mid',
				size: 100,
				arrayBuffer: () => Promise.reject(new Error('Read error'))
			};
			
			const result = await midiService.loadMIDIFile(mockFile);
			
			expect(result).toBeNull();
			expect(onErrorMock).toHaveBeenCalledWith(
				'Failed to load MIDI file: Read error'
			);
		});
	});

	describe('MIDI File Export', () => {
		test('should export MIDI file when tracks exist', () => {
			// Add a test track
			midiService.tracks = [
				{
					events: [
						{ time: 0, type: 'noteOn', channel: 0, data1: 60, data2: 100 }
					]
				}
			];
			
			const result = midiService.exportMIDIFile();
			
			expect(result).toBeInstanceOf(Blob);
			expect(result.type).toBe('audio/midi');
		});

		test('should return null when no tracks', () => {
			const result = midiService.exportMIDIFile();
			
			expect(result).toBeNull();
		});

		test('should create valid MIDI header', () => {
			const header = midiService.encodeMIDIHeader(2);
			
			expect(header).toBeInstanceOf(Uint8Array);
			expect(header.length).toBe(14);
			
			// Check "MThd" signature
			expect(header[0]).toBe(0x4D);
			expect(header[1]).toBe(0x54);
			expect(header[2]).toBe(0x68);
			expect(header[3]).toBe(0x64);
		});
	});

	describe('Cleanup', () => {
		test('should destroy service properly', async () => {
			mockMIDIAccess.inputs.set('input1', mockMIDIInput);
			mockMIDIAccess.outputs.set('output1', mockMIDIOutput);
			global.navigator.requestMIDIAccess.mockResolvedValueOnce(mockMIDIAccess);
			
			await midiService.initialize();
			
			expect(midiService.isConnected).toBe(true);
			
			midiService.destroy();
			
			expect(midiService.isConnected).toBe(false);
			expect(midiService.midiAccess).toBeNull();
			expect(midiService.inputDevices.size).toBe(0);
			expect(midiService.outputDevices.size).toBe(0);
			expect(midiService.currentFile).toBeNull();
			expect(midiService.tracks).toEqual([]);
		});

		test('should handle destroy when not initialized', () => {
			expect(() => {
				midiService.destroy();
			}).not.toThrow();
		});

		test('should clear input callbacks', async () => {
			mockMIDIInput.onmidimessage = jest.fn();
			mockMIDIAccess.inputs.set('input1', mockMIDIInput);
			global.navigator.requestMIDIAccess.mockResolvedValueOnce(mockMIDIAccess);
			
			await midiService.initialize();
			
			expect(mockMIDIInput.onmidimessage).toBe(midiService.handleMIDIMessage);
			
			midiService.destroy();
			
			expect(mockMIDIInput.onmidimessage).toBeNull();
		});
	});
});
