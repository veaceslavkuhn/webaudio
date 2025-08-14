export class MIDIService {
	constructor() {
		this.midiAccess = null;
		this.inputDevices = new Map();
		this.outputDevices = new Map();
		this.isConnected = false;
		this.onNoteOn = null;
		this.onNoteOff = null;
		this.onControlChange = null;
		this.onError = null;
		
		// MIDI file support
		this.currentFile = null;
		this.tracks = [];
		this.ticksPerQuarter = 480;
		this.tempo = 120; // BPM
	}

	async initialize() {
		try {
			if (!navigator.requestMIDIAccess) {
				throw new Error('Web MIDI API not supported in this browser');
			}

		this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
		this.isConnected = true;
		
		// Set up device listeners
		this.midiAccess.onstatechange = this.handleDeviceStateChange;			// Initialize existing devices
			this.updateDevices();
			
			return true;
		} catch (error) {
			this.onError?.('Failed to initialize MIDI: ' + error.message);
			return false;
		}
	}

	updateDevices() {
		if (!this.midiAccess) return;

		// Clear existing devices
		this.inputDevices.clear();
		this.outputDevices.clear();

		// Add input devices
		for (const input of this.midiAccess.inputs.values()) {
			this.inputDevices.set(input.id, input);
			input.onmidimessage = this.handleMIDIMessage;
		}

		// Add output devices
		for (const output of this.midiAccess.outputs.values()) {
			this.outputDevices.set(output.id, output);
		}
	}

	handleDeviceStateChange(event) {
		console.log('MIDI device state changed:', event.port.name, event.port.state);
		this.updateDevices();
	}

	handleMIDIMessage(event) {
		const [status, data1, data2] = event.data;
		const command = status & 0xF0;
		const channel = status & 0x0F;

		switch (command) {
			case 0x90: // Note On
				if (data2 > 0) { // Velocity > 0
					this.onNoteOn?.({
						channel,
						note: data1,
						velocity: data2,
						timestamp: event.timeStamp
					});
				} else {
					// Note on with velocity 0 is note off
					this.onNoteOff?.({
						channel,
						note: data1,
						velocity: 0,
						timestamp: event.timeStamp
					});
				}
				break;
			
			case 0x80: // Note Off
				this.onNoteOff?.({
					channel,
					note: data1,
					velocity: data2,
					timestamp: event.timeStamp
				});
				break;
			
			case 0xB0: // Control Change
				this.onControlChange?.({
					channel,
					controller: data1,
					value: data2,
					timestamp: event.timeStamp
				});
				break;
		}
	}

	sendNoteOn(channel, note, velocity, deviceId = null) {
		const message = [0x90 | channel, note, velocity];
		this.sendMessage(message, deviceId);
	}

	sendNoteOff(channel, note, velocity = 64, deviceId = null) {
		const message = [0x80 | channel, note, velocity];
		this.sendMessage(message, deviceId);
	}

	sendControlChange(channel, controller, value, deviceId = null) {
		const message = [0xB0 | channel, controller, value];
		this.sendMessage(message, deviceId);
	}

	sendMessage(message, deviceId = null) {
		if (!this.midiAccess) return;

		if (deviceId) {
			const device = this.outputDevices.get(deviceId);
			if (device) {
				device.send(message);
			}
		} else {
			// Send to all output devices
			for (const device of this.outputDevices.values()) {
				device.send(message);
			}
		}
	}

	getInputDevices() {
		return Array.from(this.inputDevices.values()).map(device => ({
			id: device.id,
			name: device.name,
			manufacturer: device.manufacturer,
			state: device.state
		}));
	}

	getOutputDevices() {
		return Array.from(this.outputDevices.values()).map(device => ({
			id: device.id,
			name: device.name,
			manufacturer: device.manufacturer,
			state: device.state
		}));
	}

	// MIDI File Support
	async loadMIDIFile(file) {
		try {
			const arrayBuffer = await file.arrayBuffer();
			const dataView = new DataView(arrayBuffer);
			
			// Parse MIDI header
			const header = this.parseMIDIHeader(dataView);
			if (!header) {
				throw new Error('Invalid MIDI file format');
			}

			this.currentFile = {
				name: file.name,
				size: file.size,
				header
			};

			// Parse tracks
			this.tracks = this.parseMIDITracks(dataView, header);
			
			return {
				name: file.name,
				tracks: this.tracks.length,
				format: header.format,
				ticksPerQuarter: header.ticksPerQuarter,
				duration: this.calculateDuration()
			};
		} catch (error) {
			this.onError?.('Failed to load MIDI file: ' + error.message);
			return null;
		}
	}

	parseMIDIHeader(dataView) {
		// Check for "MThd" header
		const headerSignature = new TextDecoder().decode(new Uint8Array(dataView.buffer, 0, 4));
		if (headerSignature !== 'MThd') {
			return null;
		}

		const headerLength = dataView.getUint32(4);
		const format = dataView.getUint16(8);
		const trackCount = dataView.getUint16(10);
		const ticksPerQuarter = dataView.getUint16(12);

		return {
			headerLength,
			format,
			trackCount,
			ticksPerQuarter
		};
	}

	parseMIDITracks(dataView, header) {
		const tracks = [];
		let offset = 14; // Start after header

		for (let i = 0; i < header.trackCount; i++) {
			const track = this.parseMIDITrack(dataView, offset);
			if (track) {
				tracks.push(track);
				offset = track.nextOffset;
			}
		}

		return tracks;
	}

	parseMIDITrack(dataView, offset) {
		// Check for "MTrk" signature
		const trackSignature = new TextDecoder().decode(
			new Uint8Array(dataView.buffer, offset, 4)
		);
		if (trackSignature !== 'MTrk') {
			return null;
		}

		const trackLength = dataView.getUint32(offset + 4);
		const trackData = new Uint8Array(dataView.buffer, offset + 8, trackLength);
		
		const events = this.parseTrackEvents(trackData);
		
		return {
			length: trackLength,
			events,
			nextOffset: offset + 8 + trackLength
		};
	}

	parseTrackEvents(trackData) {
		const events = [];
		let position = 0;
		let currentTime = 0;
		let runningStatus = 0;

		while (position < trackData.length) {
			// Read variable-length delta time
			const deltaTime = this.readVariableLength(trackData, position);
			position += deltaTime.bytesRead;
			currentTime += deltaTime.value;

			// Read event
			const event = this.readMIDIEvent(trackData, position, runningStatus);
			if (event) {
				events.push({
					time: currentTime,
					...event
				});
				position += event.bytesRead;
				if (event.status) {
					runningStatus = event.status;
				}
			} else {
				break;
			}
		}

		return events;
	}

	readVariableLength(data, offset) {
		let value = 0;
		let bytesRead = 0;
		
		while (bytesRead < 4) {
			const byte = data[offset + bytesRead];
			value = (value << 7) | (byte & 0x7F);
			bytesRead++;
			
			if ((byte & 0x80) === 0) {
				break;
			}
		}
		
		return { value, bytesRead };
	}

	readMIDIEvent(data, offset, runningStatus) {
		if (offset >= data.length) return null;

		let status = data[offset];
		let dataOffset = offset + 1;
		let bytesRead = 1;

		// Handle running status
		if (status < 0x80) {
			status = runningStatus;
			dataOffset = offset;
			bytesRead = 0;
		}

		const eventType = status & 0xF0;
		const channel = status & 0x0F;

		switch (eventType) {
			case 0x80: // Note Off
			case 0x90: // Note On
			case 0xA0: // Aftertouch
			case 0xB0: // Control Change
			case 0xE0: // Pitch Bend
				return {
					status,
					type: this.getEventTypeName(eventType),
					channel,
					data1: data[dataOffset],
					data2: data[dataOffset + 1],
					bytesRead: bytesRead + 2
				};
			
			case 0xC0: // Program Change
			case 0xD0: // Channel Pressure
				return {
					status,
					type: this.getEventTypeName(eventType),
					channel,
					data1: data[dataOffset],
					bytesRead: bytesRead + 1
				};
			
			case 0xF0: // System messages
				if (status === 0xFF) {
					// Meta event
					const metaType = data[dataOffset];
					const length = this.readVariableLength(data, dataOffset + 1);
					return {
						type: 'meta',
						metaType,
						data: Array.from(data.slice(
							dataOffset + 1 + length.bytesRead,
							dataOffset + 1 + length.bytesRead + length.value
						)),
						bytesRead: bytesRead + 1 + length.bytesRead + length.value
					};
				}
				break;
		}

		return { bytesRead: 1 };
	}

	getEventTypeName(eventType) {
		const types = {
			[0x80]: 'noteOff',
			[0x90]: 'noteOn',
			[0xA0]: 'aftertouch',
			[0xB0]: 'controlChange',
			[0xC0]: 'programChange',
			[0xD0]: 'channelPressure',
			[0xE0]: 'pitchBend'
		};
		return types[eventType] || 'unknown';
	}

	calculateDuration() {
		if (!this.tracks.length) return 0;

		let maxTime = 0;
		for (const track of this.tracks) {
			const lastEvent = track.events[track.events.length - 1];
			if (lastEvent && lastEvent.time > maxTime) {
				maxTime = lastEvent.time;
			}
		}

		// Convert ticks to seconds
		const ticksPerSecond = (this.tempo / 60) * this.ticksPerQuarter;
		return maxTime / ticksPerSecond;
	}

	exportMIDIFile() {
		if (!this.tracks.length) return null;

		// Create MIDI file buffer
		const tracks = this.tracks.map(track => this.encodeTrack(track));
		const header = this.encodeMIDIHeader(tracks.length);
		
		// Combine header and tracks
		const totalSize = header.length + tracks.reduce((sum, track) => sum + track.length, 0);
		const buffer = new ArrayBuffer(totalSize);
		const view = new Uint8Array(buffer);
		
		let offset = 0;
		view.set(header, offset);
		offset += header.length;
		
		for (const track of tracks) {
			view.set(track, offset);
			offset += track.length;
		}
		
		return new Blob([buffer], { type: 'audio/midi' });
	}

	encodeMIDIHeader(trackCount) {
		const buffer = new ArrayBuffer(14);
		const view = new DataView(buffer);
		
		// "MThd"
		view.setUint8(0, 0x4D);
		view.setUint8(1, 0x54);
		view.setUint8(2, 0x68);
		view.setUint8(3, 0x64);
		
		// Header length (6)
		view.setUint32(4, 6);
		
		// Format (1)
		view.setUint16(8, 1);
		
		// Track count
		view.setUint16(10, trackCount);
		
		// Ticks per quarter note
		view.setUint16(12, this.ticksPerQuarter);
		
		return new Uint8Array(buffer);
	}

	encodeTrack() {
		// Simplified track encoding
		const events = [];
		
		// Add end of track meta event
		events.push(0x00, 0xFF, 0x2F, 0x00);
		
		const buffer = new ArrayBuffer(8 + events.length);
		const view = new DataView(buffer);
		const data = new Uint8Array(buffer);
		
		// "MTrk"
		view.setUint8(0, 0x4D);
		view.setUint8(1, 0x54);
		view.setUint8(2, 0x72);
		view.setUint8(3, 0x6B);
		
		// Track length
		view.setUint32(4, events.length);
		
		// Track data
		data.set(events, 8);
		
		return data;
	}

	destroy() {
		if (this.midiAccess) {
			// Close all connections
			for (const input of this.inputDevices.values()) {
				input.onmidimessage = null;
			}
			
			this.inputDevices.clear();
			this.outputDevices.clear();
			this.midiAccess = null;
		}
		
		this.isConnected = false;
		this.currentFile = null;
		this.tracks = [];
	}
}
