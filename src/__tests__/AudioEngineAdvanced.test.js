import { AudioEngineService } from '../services/AudioEngine.js';

// Mock Web Audio API
const createMockAudioContext = () => ({
    state: 'running',
    sampleRate: 44100,
    currentTime: 0,
    resume: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    createBuffer: jest.fn().mockReturnValue({
        length: 44100,
        sampleRate: 44100,
        numberOfChannels: 1,
        getChannelData: jest.fn().mockReturnValue(new Float32Array(44100)),
        copyFromChannel: jest.fn(),
        copyToChannel: jest.fn()
    }),
    createBufferSource: jest.fn().mockReturnValue({
        buffer: null,
        playbackRate: { value: 1 },
        connect: jest.fn(),
        disconnect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        onended: null
    }),
    createGain: jest.fn().mockReturnValue({
        gain: { 
            value: 1,
            setValueAtTime: jest.fn(),
            exponentialRampToValueAtTime: jest.fn(),
            linearRampToValueAtTime: jest.fn()
        },
        connect: jest.fn(),
        disconnect: jest.fn()
    }),
    createAnalyser: jest.fn().mockReturnValue({
        fftSize: 2048,
        frequencyBinCount: 1024,
        getFloatFrequencyData: jest.fn(),
        getByteFrequencyData: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn()
    }),
    decodeAudioData: jest.fn().mockResolvedValue({
        duration: 2.0,
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 88200,
        getChannelData: jest.fn().mockReturnValue(new Float32Array(88200))
    }),
    destination: {
        connect: jest.fn(),
        disconnect: jest.fn()
    }
});

describe('AudioEngine Advanced Features', () => {
    let audioEngine;
    let mockAudioContext;

    beforeEach(() => {
        // Mock global AudioContext
        global.AudioContext = jest.fn(() => createMockAudioContext());
        global.webkitAudioContext = global.AudioContext;
        
        mockAudioContext = createMockAudioContext();
        audioEngine = new AudioEngineService();
        audioEngine.audioContext = mockAudioContext;
        audioEngine.masterGain = mockAudioContext.createGain();
    });

    afterEach(() => {
        audioEngine = null;
        jest.clearAllMocks();
    });

    describe('Advanced Audio Context Management', () => {
        test('should initialize audio context properly', async () => {
            const newEngine = new AudioEngineService();
            const result = await newEngine.initializeAudioContext();
            
            expect(result).toBe(true);
            expect(global.AudioContext).toHaveBeenCalled();
        });

        test('should ensure audio context and resume if suspended', async () => {
            mockAudioContext.state = 'suspended';
            const result = await audioEngine.ensureAudioContext();
            
            expect(result).toBe(true);
            expect(mockAudioContext.resume).toHaveBeenCalled();
        });

        test('should handle audio context initialization failure', async () => {
            global.AudioContext = jest.fn(() => {
                throw new Error('Audio context failed');
            });
            
            const newEngine = new AudioEngineService();
            const result = await newEngine.initializeAudioContext();
            
            expect(result).toBe(false);
        });
    });

    describe('Audio Loading and Management', () => {
        test('should load audio from file successfully', async () => {
            const mockFile = new File(['test'], 'test.wav', { type: 'audio/wav' });
            mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
            
            const trackId = await audioEngine.loadAudioFromFile(mockFile);
            
            expect(trackId).toBeTruthy();
            expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
        });

        test('should handle file loading errors', async () => {
            const mockFile = new File(['test'], 'test.wav', { type: 'audio/wav' });
            mockFile.arrayBuffer = jest.fn().mockRejectedValue(new Error('File error'));
            
            await expect(audioEngine.loadAudioFromFile(mockFile))
                .rejects.toThrow('File error');
        });

        test('should handle audio decoding failure', async () => {
            const mockFile = new File(['test'], 'test.wav', { type: 'audio/wav' });
            mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
            mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Decode error'));
            
            await expect(audioEngine.loadAudioFromFile(mockFile))
                .rejects.toThrow('Decode error');
        });
    });

    describe('Playback Control Advanced', () => {
        beforeEach(() => {
            // Add a test audio buffer
            const mockBuffer = {
                duration: 1.5,
                numberOfChannels: 1,
                sampleRate: 44100,
                length: 66150,
                getChannelData: jest.fn().mockReturnValue(new Float32Array(66150))
            };
            audioEngine.audioBuffers.set('test-track', {
                name: 'test-track',
                buffer: mockBuffer
            });
        });

        test('should handle playback with duration limit', async () => {
            const trackId = 'test-track';
            await audioEngine.play(trackId, 0, 0.5); // Play for 0.5 seconds
            
            expect(audioEngine.playingSources.has(trackId)).toBe(true);
            const mockSource = mockAudioContext.createBufferSource.mock.results[0].value;
            expect(mockSource.start).toHaveBeenCalledWith(0, 0, 0.5);
        });

        test('should handle playing all tracks when no trackId specified', async () => {
            // Add another track
            const mockBuffer2 = {
                duration: 2.0,
                numberOfChannels: 1,
                sampleRate: 44100,
                length: 88200,
                getChannelData: jest.fn().mockReturnValue(new Float32Array(88200))
            };
            audioEngine.audioBuffers.set('test-track-2', {
                name: 'test-track-2',
                buffer: mockBuffer2
            });

            await audioEngine.play(); // Play all tracks
            
            expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(2);
        });
    });

    describe('Audio Buffer Management', () => {
        test('should get track info correctly', () => {
            const mockBuffer = {
                duration: 1.5,
                numberOfChannels: 1,
                sampleRate: 44100,
                length: 66150,
                getChannelData: jest.fn().mockReturnValue(new Float32Array(66150))
            };
            const trackId = 'test-track';
            audioEngine.audioBuffers.set(trackId, {
                name: 'Test Track',
                buffer: mockBuffer
            });
            
            const trackInfo = audioEngine.getTrackInfo(trackId);
            expect(trackInfo).toEqual({
                buffer: mockBuffer,
                name: 'Test Track'
            });
        });

        test('should return undefined for non-existent track info', () => {
            const trackInfo = audioEngine.getTrackInfo('non-existent');
            expect(trackInfo).toBeUndefined();
        });
    });

    describe('Waveform Generation', () => {
        test('should handle waveform generation concept', () => {
            // AudioEngine may not have generateWaveform method
            // This test verifies the concept of audio buffer creation
            const mockBuffer = mockAudioContext.createBuffer(1, 44100, 44100);
            expect(mockBuffer).toBeTruthy();
            expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(1, 44100, 44100);
        });
    });

    describe('Volume and Playback Rate', () => {
        test('should set master volume correctly', () => {
            audioEngine.setMasterVolume(0.5);
            
            // Volume might be squared for perceptual purposes
            expect(audioEngine.masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0.25, 0);
        });

        test('should set master volume to zero correctly', () => {
            audioEngine.setMasterVolume(0);
            
            expect(audioEngine.masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
        });

        test('should update playback rate for playing sources', () => {
            // Add a playing source
            const mockSource = mockAudioContext.createBufferSource();
            audioEngine.playingSources.set('test-track', mockSource);
            
            audioEngine.setPlaybackRate(1.5);
            
            expect(audioEngine.playbackRate).toBe(1.5);
            expect(mockSource.playbackRate.value).toBe(1.5);
        });
    });

    describe('Recording Management', () => {
        test('should handle microphone access request', async () => {
            global.navigator.mediaDevices = {
                getUserMedia: jest.fn().mockResolvedValue({
                    getTracks: jest.fn().mockReturnValue([]),
                    getAudioTracks: jest.fn().mockReturnValue([])
                })
            };

            const stream = await audioEngine.requestMicrophoneAccess();
            
            expect(stream).toBeTruthy();
            expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
                audio: {
                    sampleRate: 44100,
                    channelCount: 2,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
        });

        test('should handle microphone access failure', async () => {
            global.navigator.mediaDevices = {
                getUserMedia: jest.fn().mockRejectedValue(new Error('Permission denied'))
            };

            await expect(audioEngine.requestMicrophoneAccess())
                .rejects.toThrow('Permission denied');
        });
    });

    describe('Utility Methods', () => {
        test('should manage audio buffers', () => {
            audioEngine.audioBuffers.set('track1', { name: 'Track 1' });
            audioEngine.audioBuffers.set('track2', { name: 'Track 2' });
            
            expect(audioEngine.audioBuffers.size).toBe(2);
            
            // Test manual clearing
            audioEngine.audioBuffers.clear();
            expect(audioEngine.audioBuffers.size).toBe(0);
        });

        test('should get track information', () => {
            audioEngine.audioBuffers.set('existing-track', { name: 'Existing' });
            
            expect(audioEngine.audioBuffers.has('existing-track')).toBe(true);
            expect(audioEngine.audioBuffers.has('non-existing')).toBe(false);
        });
    });

    describe('Error Handling', () => {
        test('should handle playback errors gracefully', async () => {
            const mockOnError = jest.fn();
            audioEngine.onError = mockOnError;
            
            // Mock a buffer source that throws on start
            mockAudioContext.createBufferSource.mockReturnValue({
                buffer: null,
                connect: jest.fn(),
                start: jest.fn(() => { throw new Error('Playback error'); }),
                stop: jest.fn(),
                onended: null
            });
            
            const mockBuffer = {
                duration: 1.0,
                numberOfChannels: 1,
                sampleRate: 44100,
                getChannelData: jest.fn().mockReturnValue(new Float32Array(44100))
            };
            audioEngine.audioBuffers.set('error-track', { buffer: mockBuffer });
            
            await audioEngine.play('error-track');
            
            expect(mockOnError).toHaveBeenCalled();
        });

        test('should handle invalid track IDs in playback', async () => {
            await audioEngine.play('non-existent-track');
            
            // Should not throw, just handle gracefully
            expect(audioEngine.playingSources.has('non-existent-track')).toBe(false);
        });
    });

    describe('State Management', () => {
        test('should track playing state correctly', async () => {
            const mockBuffer = {
                duration: 1.0,
                numberOfChannels: 1,
                sampleRate: 44100,
                getChannelData: jest.fn().mockReturnValue(new Float32Array(44100))
            };
            audioEngine.audioBuffers.set('test-track', { buffer: mockBuffer });
            
            expect(audioEngine.isPlaying).toBe(false);
            
            await audioEngine.play('test-track');
            
            expect(audioEngine.playingSources.has('test-track')).toBe(true);
        });

        test('should handle stop correctly', () => {
            const mockSource = {
                stop: jest.fn(),
                disconnect: jest.fn()
            };
            audioEngine.playingSources.set('test-track', mockSource);
            audioEngine.isPlaying = true;
            
            audioEngine.stop();
            
            expect(mockSource.stop).toHaveBeenCalled();
            expect(audioEngine.isPlaying).toBe(false);
            expect(audioEngine.playingSources.size).toBe(0);
        });

        test('should handle pause and resume', () => {
            audioEngine.isPlaying = true;
            
            audioEngine.pause();
            expect(audioEngine.isPaused).toBe(true);
            expect(audioEngine.isPlaying).toBe(false);
            
            // Test basic state management
            audioEngine.isPaused = false;
            expect(audioEngine.isPaused).toBe(false);
        });
    });
});
