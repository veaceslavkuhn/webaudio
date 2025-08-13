export class AudioMonitor {
	constructor(audioContext) {
		this.audioContext = audioContext;
		this.analyser = null;
		this.microphone = null;
		this.isMonitoring = false;
		this.onLevelUpdate = null;
		this.onError = null;
		
		// Audio level detection
		this.dataArray = null;
		this.bufferLength = 0;
		this.animationId = null;
		
		// Peak detection
		this.peakLevel = 0;
		this.peakHoldTime = 1000; // ms
		this.lastPeakTime = 0;
		
		// RMS calculation for VU meters
		this.rmsHistory = [];
		this.rmsHistorySize = 10;
	}

	async startMonitoring() {
		try {
			// Get microphone access
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false
				}
			});

			// Create audio nodes
			this.microphone = this.audioContext.createMediaStreamSource(stream);
			this.analyser = this.audioContext.createAnalyser();
			
			// Configure analyser
			this.analyser.fftSize = 512;
			this.analyser.smoothingTimeConstant = 0.8;
			this.bufferLength = this.analyser.frequencyBinCount;
			this.dataArray = new Uint8Array(this.bufferLength);
			
			// Connect nodes
			this.microphone.connect(this.analyser);
			
			this.isMonitoring = true;
			this.updateLevels();
			
			return true;
		} catch (error) {
			this.onError?.('Failed to access microphone: ' + error.message);
			return false;
		}
	}

	updateLevels() {
		if (!this.isMonitoring || !this.analyser) return;

		// Get frequency data for spectrum display
		this.analyser.getByteFrequencyData(this.dataArray);
		
		// Calculate RMS level
		let sum = 0;
		for (let i = 0; i < this.dataArray.length; i++) {
			const normalizedValue = this.dataArray[i] / 255;
			sum += normalizedValue * normalizedValue;
		}
		const rms = Math.sqrt(sum / this.dataArray.length);
		
		// Update RMS history for smoothing
		this.rmsHistory.push(rms);
		if (this.rmsHistory.length > this.rmsHistorySize) {
			this.rmsHistory.shift();
		}
		
		// Calculate smoothed RMS
		const smoothedRMS = this.rmsHistory.reduce((a, b) => a + b, 0) / this.rmsHistory.length;
		
		// Calculate peak level
		const currentLevel = smoothedRMS;
		const now = Date.now();
		
		if (currentLevel > this.peakLevel || (now - this.lastPeakTime) > this.peakHoldTime) {
			this.peakLevel = currentLevel;
			this.lastPeakTime = now;
		}
		
		// Convert to dB
		const dbLevel = currentLevel > 0 ? 20 * Math.log10(currentLevel) : -Infinity;
		const dbPeak = this.peakLevel > 0 ? 20 * Math.log10(this.peakLevel) : -Infinity;
		
		// Call callback with level data
		this.onLevelUpdate?.({
			rms: smoothedRMS,
			peak: this.peakLevel,
			dbLevel: Math.max(-60, dbLevel), // Clamp to -60dB minimum
			dbPeak: Math.max(-60, dbPeak),
			frequencyData: new Uint8Array(this.dataArray),
			isClipping: currentLevel > 0.95
		});

		this.animationId = requestAnimationFrame(() => this.updateLevels());
	}

	stopMonitoring() {
		this.isMonitoring = false;
		
		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}
		
		if (this.microphone) {
			const tracks = this.microphone.mediaStream.getTracks();
			tracks.forEach(track => track.stop());
			this.microphone.disconnect();
			this.microphone = null;
		}
		
		if (this.analyser) {
			this.analyser.disconnect();
			this.analyser = null;
		}
		
		this.dataArray = null;
		this.rmsHistory = [];
		this.peakLevel = 0;
	}

	setCallback(callback) {
		this.onLevelUpdate = callback;
	}

	setErrorCallback(callback) {
		this.onError = callback;
	}

	getInputDevices() {
		return navigator.mediaDevices.enumerateDevices()
			.then(devices => devices.filter(device => device.kind === 'audioinput'));
	}

	async switchInputDevice(deviceId) {
		if (this.isMonitoring) {
			this.stopMonitoring();
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					deviceId: deviceId ? { exact: deviceId } : undefined,
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false
				}
			});

			this.microphone = this.audioContext.createMediaStreamSource(stream);
			this.microphone.connect(this.analyser);
			
			this.isMonitoring = true;
			this.updateLevels();
			
			return true;
		} catch (error) {
			this.onError?.('Failed to switch input device: ' + error.message);
			return false;
		}
	}

	// Create a visual level meter component
	createLevelMeter(container, options = {}) {
		const {
			width = 20,
			height = 200,
			backgroundColor = '#222',
			foregroundColor = '#00ff00',
			peakColor = '#ff0000',
			orientation = 'vertical'
		} = options;

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		canvas.style.backgroundColor = backgroundColor;
		container.appendChild(canvas);

		const ctx = canvas.getContext('2d');

		const drawMeter = (levelData) => {
			ctx.clearRect(0, 0, width, height);
			
			// Background
			ctx.fillStyle = backgroundColor;
			ctx.fillRect(0, 0, width, height);
			
			if (!levelData) return;

			const { rms, peak, isClipping } = levelData;
			
			// Convert to visual scale (0-1)
			const levelHeight = Math.max(0, Math.min(1, (rms + 60) / 60)) * height;
			const peakHeight = Math.max(0, Math.min(1, (peak + 60) / 60)) * height;
			
			// Draw level bar
			ctx.fillStyle = isClipping ? peakColor : foregroundColor;
			if (orientation === 'vertical') {
				ctx.fillRect(0, height - levelHeight, width, levelHeight);
				
				// Draw peak indicator
				if (peakHeight > 0) {
					ctx.fillStyle = peakColor;
					ctx.fillRect(0, height - peakHeight - 2, width, 2);
				}
			} else {
				ctx.fillRect(0, 0, levelHeight, height);
				
				// Draw peak indicator
				if (peakHeight > 0) {
					ctx.fillStyle = peakColor;
					ctx.fillRect(peakHeight - 2, 0, 2, height);
				}
			}
			
			// Draw scale markings
			ctx.fillStyle = '#666';
			for (let i = 0; i <= 6; i++) {
				const y = (i / 6) * height;
				ctx.fillRect(0, height - y, width / 4, 1);
			}
		};

		// Return update function
		return {
			update: drawMeter,
			destroy: () => {
				if (container.contains(canvas)) {
					container.removeChild(canvas);
				}
			}
		};
	}
}
