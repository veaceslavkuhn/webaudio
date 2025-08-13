/**
 * Main Application Controller
 * Coordinates all components and handles user interactions
 */

class WebAudacityApp {
    constructor() {
        this.audioEngine = new AudioEngine();
        this.waveformRenderer = null;
        this.effectsProcessor = null;
        this.tracks = new Map();
        this.currentTool = 'selection';
        this.isInitialized = false;
        this.projectSettings = {
            sampleRate: 44100,
            bitDepth: 16,
            format: 'WAV'
        };

        this.init();
    }

    async init() {
        try {
            // Initialize audio context
            await this.audioEngine.initializeAudioContext();
            
            // Initialize effects processor
            this.effectsProcessor = new EffectsProcessor(this.audioEngine.audioContext);

            // Initialize waveform renderer
            const waveformArea = document.getElementById('waveform-area');
            const timelineCanvas = document.getElementById('timeline-canvas');
            this.waveformRenderer = new WaveformRenderer(waveformArea, timelineCanvas);

            // Set up callbacks
            this.setupCallbacks();

            // Set up UI event listeners
            this.setupEventListeners();

            // Initialize UI state
            this.updateUI();

            this.isInitialized = true;
            this.setStatus('Ready');

            console.log('WebAudacity initialized successfully');
        } catch (error) {
            console.error('Failed to initialize WebAudacity:', error);
            this.setStatus('Initialization failed: ' + error.message);
        }
    }

    setupCallbacks() {
        // Audio engine callbacks
        this.audioEngine.onPlaybackFinished = () => {
            this.updatePlaybackControls(false);
            this.setStatus('Playback finished');
        };

        // Waveform renderer callbacks
        this.waveformRenderer.onSeek = (time) => {
            this.seekToTime(time);
        };
    }

    setupEventListeners() {
        // Transport controls
        document.getElementById('record-btn').addEventListener('click', () => this.toggleRecording());
        document.getElementById('play-btn').addEventListener('click', () => this.play());
        document.getElementById('pause-btn').addEventListener('click', () => this.pause());
        document.getElementById('stop-btn').addEventListener('click', () => this.stop());
        document.getElementById('skip-start').addEventListener('click', () => this.skipToStart());
        document.getElementById('skip-end').addEventListener('click', () => this.skipToEnd());

        // Tool selection
        document.getElementById('selection-tool').addEventListener('click', () => this.setTool('selection'));
        document.getElementById('envelope-tool').addEventListener('click', () => this.setTool('envelope'));
        document.getElementById('zoom-tool').addEventListener('click', () => this.setTool('zoom'));
        document.getElementById('time-shift-tool').addEventListener('click', () => this.setTool('timeshift'));

        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.waveformRenderer.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.waveformRenderer.zoomOut());
        document.getElementById('zoom-fit').addEventListener('click', () => this.waveformRenderer.zoomToFit());

        // Volume controls
        document.getElementById('record-volume').addEventListener('input', (e) => {
            document.getElementById('record-volume-display').textContent = e.target.value + '%';
        });

        document.getElementById('playback-volume').addEventListener('input', (e) => {
            const volume = parseInt(e.target.value) / 100;
            this.audioEngine.setMasterVolume(volume);
            document.getElementById('playback-volume-display').textContent = e.target.value + '%';
        });

        // Menu items
        document.getElementById('new-project').addEventListener('click', () => this.newProject());
        document.getElementById('open-file').addEventListener('click', () => this.openFileDialog());
        document.getElementById('save-project').addEventListener('click', () => this.saveProject());
        document.getElementById('export-audio').addEventListener('click', () => this.exportAudio());
        document.getElementById('import-audio').addEventListener('click', () => this.openFileDialog());

        // Edit menu
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('redo').addEventListener('click', () => this.redo());
        document.getElementById('cut').addEventListener('click', () => this.cut());
        document.getElementById('copy').addEventListener('click', () => this.copy());
        document.getElementById('paste').addEventListener('click', () => this.paste());
        document.getElementById('delete').addEventListener('click', () => this.delete());
        document.getElementById('select-all').addEventListener('click', () => this.selectAll());

        // Generate menu
        document.getElementById('generate-tone').addEventListener('click', () => this.showGenerateDialog('tone'));
        document.getElementById('generate-noise').addEventListener('click', () => this.showGenerateDialog('noise'));
        document.getElementById('generate-silence').addEventListener('click', () => this.showGenerateDialog('silence'));

        // Effects menu
        const effectButtons = [
            'amplify', 'normalize', 'fade-in', 'fade-out', 'echo', 'reverb',
            'noise-reduction', 'speed-change', 'pitch-change'
        ];
        effectButtons.forEach(effectId => {
            const element = document.getElementById(effectId);
            if (element) {
                element.addEventListener('click', () => this.showEffectDialog(effectId));
            }
        });

        // Analyze menu
        document.getElementById('plot-spectrum').addEventListener('click', () => this.showSpectrumAnalyzer());

        // Track management
        document.getElementById('add-track').addEventListener('click', () => this.addEmptyTrack());

        // File handling
        this.setupFileHandling();

        // Modal handling
        this.setupModalHandling();

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupFileHandling() {
        const fileInput = document.getElementById('audio-file-input');
        const dropZone = document.getElementById('file-drop-zone');

        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
        });

        // Drag and drop
        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFiles(Array.from(e.dataTransfer.files));
            this.closeModal('file-modal');
        });
    }

    setupModalHandling() {
        // Close modal when clicking close button or outside modal
        document.querySelectorAll('.modal').forEach(modal => {
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            }

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Effect modal buttons
        document.getElementById('effect-preview')?.addEventListener('click', () => this.previewEffect());
        document.getElementById('effect-apply')?.addEventListener('click', () => this.applyEffect());
        document.getElementById('effect-cancel')?.addEventListener('click', () => this.closeModal('effect-modal'));
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Prevent default for our shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.newProject();
                        break;
                    case 'o':
                        e.preventDefault();
                        this.openFileDialog();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveProject();
                        break;
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.redo();
                        } else {
                            this.undo();
                        }
                        break;
                    case 'x':
                        e.preventDefault();
                        this.cut();
                        break;
                    case 'c':
                        e.preventDefault();
                        this.copy();
                        break;
                    case 'v':
                        e.preventDefault();
                        this.paste();
                        break;
                    case 'a':
                        e.preventDefault();
                        this.selectAll();
                        break;
                }
            }

            // Spacebar for play/pause
            if (e.key === ' ') {
                e.preventDefault();
                if (this.audioEngine.isPlaying) {
                    this.pause();
                } else {
                    this.play();
                }
            }

            // Delete key
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                this.delete();
            }
        });
    }

    // File operations
    async handleFiles(files) {
        this.showLoading('Loading audio files...');

        try {
            for (const file of files) {
                if (file.type.startsWith('audio/')) {
                    await this.loadAudioFile(file);
                }
            }
        } catch (error) {
            console.error('Error loading files:', error);
            this.setStatus('Error loading files: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async loadAudioFile(file) {
        try {
            const trackId = await this.audioEngine.loadAudioFromFile(file);
            const trackInfo = this.audioEngine.getTrackInfo(trackId);
            
            // Add to waveform renderer
            const trackElement = this.waveformRenderer.addTrack(trackId, trackInfo.buffer, trackInfo.name);
            
            // Create track control
            this.createTrackControl(trackId, trackInfo, trackElement);
            
            // Update project duration
            this.updateProjectInfo();
            
            this.setStatus(`Loaded: ${file.name}`);
            console.log('Audio file loaded:', file.name);
        } catch (error) {
            console.error('Failed to load audio file:', error);
            this.setStatus('Failed to load: ' + file.name);
        }
    }

    createTrackControl(trackId, trackInfo, trackElement) {
        const trackControl = document.createElement('div');
        trackControl.className = 'track-control';
        trackControl.dataset.trackId = trackId;

        trackControl.innerHTML = `
            <div class="track-header">
                <span class="track-name">${trackInfo.name}</span>
                <button class="track-menu">▼</button>
            </div>
            <div class="track-controls">
                <div class="track-buttons">
                    <button class="track-btn mute-btn">Mute</button>
                    <button class="track-btn solo-btn">Solo</button>
                </div>
                <div class="track-volume">
                    <label>Vol:</label>
                    <input type="range" min="0" max="100" value="80" class="track-volume-slider">
                    <span class="volume-value">80%</span>
                </div>
                <div class="track-volume">
                    <label>Pan:</label>
                    <input type="range" min="-100" max="100" value="0" class="track-pan-slider">
                    <span class="pan-value">0</span>
                </div>
            </div>
        `;

        // Add event listeners
        const muteBtn = trackControl.querySelector('.mute-btn');
        const soloBtn = trackControl.querySelector('.solo-btn');
        const volumeSlider = trackControl.querySelector('.track-volume-slider');
        const panSlider = trackControl.querySelector('.track-pan-slider');
        const volumeValue = trackControl.querySelector('.volume-value');
        const panValue = trackControl.querySelector('.pan-value');

        muteBtn.addEventListener('click', () => this.toggleTrackMute(trackId));
        soloBtn.addEventListener('click', () => this.toggleTrackSolo(trackId));
        
        volumeSlider.addEventListener('input', (e) => {
            volumeValue.textContent = e.target.value + '%';
            this.setTrackVolume(trackId, parseInt(e.target.value) / 100);
        });

        panSlider.addEventListener('input', (e) => {
            panValue.textContent = e.target.value;
            this.setTrackPan(trackId, parseInt(e.target.value) / 100);
        });

        // Add to track panel
        const tracksContainer = document.getElementById('tracks-container');
        tracksContainer.appendChild(trackControl);

        // Store track data
        this.tracks.set(trackId, {
            info: trackInfo,
            element: trackElement,
            control: trackControl,
            muted: false,
            solo: false,
            volume: 0.8,
            pan: 0
        });
    }

    // Transport controls
    async toggleRecording() {
        if (!this.audioEngine.isRecording) {
            try {
                this.setStatus('Starting recording...');
                await this.audioEngine.startRecording();
                this.updateRecordingControls(true);
                this.setStatus('Recording...');
            } catch (error) {
                console.error('Failed to start recording:', error);
                this.setStatus('Recording failed: ' + error.message);
            }
        } else {
            this.audioEngine.stopRecording();
            this.updateRecordingControls(false);
            this.setStatus('Recording stopped');
        }
    }

    play() {
        if (!this.audioEngine.isPlaying) {
            const selection = this.waveformRenderer.getSelection();
            if (selection) {
                this.audioEngine.play(null, selection.start, selection.end - selection.start);
            } else {
                this.audioEngine.play();
            }
            this.updatePlaybackControls(true);
            this.setStatus('Playing...');
        }
    }

    pause() {
        this.audioEngine.pause();
        this.updatePlaybackControls(false);
        this.setStatus('Paused');
    }

    stop() {
        this.audioEngine.stop();
        this.updatePlaybackControls(false);
        this.waveformRenderer.updatePlayhead(0);
        this.setStatus('Stopped');
    }

    skipToStart() {
        this.seekToTime(0);
    }

    skipToEnd() {
        const duration = this.audioEngine.getTotalDuration();
        this.seekToTime(duration);
    }

    seekToTime(time) {
        this.audioEngine.currentTime = time;
        this.waveformRenderer.updatePlayhead(time);
        this.setStatus(`Seek to ${this.formatTime(time)}`);
    }

    // Edit operations
    cut() {
        const selection = this.waveformRenderer.getSelection();
        if (!selection) {
            this.setStatus('No selection to cut');
            return;
        }

        // Copy to clipboard first
        this.copy();

        // Then delete the selection
        this.delete();
        this.setStatus('Cut selection');
    }

    copy() {
        const selection = this.waveformRenderer.getSelection();
        if (!selection) {
            this.setStatus('No selection to copy');
            return;
        }

        // Store selection in clipboard (simplified)
        this.clipboard = {
            selection: selection,
            tracks: new Map()
        };

        // Copy audio data from each track
        for (const [trackId, trackData] of this.tracks) {
            const buffer = this.audioEngine.copyAudio(trackId, selection.start, selection.end);
            if (buffer) {
                this.clipboard.tracks.set(trackId, buffer);
            }
        }

        this.setStatus('Copied selection');
    }

    paste() {
        if (!this.clipboard) {
            this.setStatus('Nothing to paste');
            return;
        }

        // TODO: Implement paste functionality
        this.setStatus('Paste not implemented yet');
    }

    delete() {
        const selection = this.waveformRenderer.getSelection();
        if (!selection) {
            this.setStatus('No selection to delete');
            return;
        }

        // Delete from each track
        for (const [trackId] of this.tracks) {
            this.audioEngine.cutAudio(trackId, selection.start, selection.end);
        }

        // Clear selection and redraw
        this.waveformRenderer.clearSelection();
        this.waveformRenderer.redrawWaveforms();
        this.updateProjectInfo();
        this.setStatus('Deleted selection');
    }

    selectAll() {
        this.waveformRenderer.selectAll();
        this.setStatus('Selected all');
    }

    undo() {
        // TODO: Implement undo functionality
        this.setStatus('Undo not implemented yet');
    }

    redo() {
        // TODO: Implement redo functionality
        this.setStatus('Redo not implemented yet');
    }

    // Tool selection
    setTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(tool + '-tool').classList.add('active');
        
        this.setStatus(`Selected ${tool} tool`);
    }

    // Effects
    showEffectDialog(effectName) {
        const effectModal = document.getElementById('effect-modal');
        const effectTitle = document.getElementById('effect-title');
        const effectContent = document.getElementById('effect-content');

        // Set title
        effectTitle.textContent = effectName.charAt(0).toUpperCase() + effectName.slice(1).replace('-', ' ');

        // Get effect parameters
        const parameters = this.effectsProcessor.getEffectParameters(effectName);
        
        // Generate controls
        effectContent.innerHTML = '';
        parameters.forEach(param => {
            const control = this.createEffectControl(param);
            effectContent.appendChild(control);
        });

        // Store current effect
        effectModal.dataset.currentEffect = effectName;

        // Show modal
        effectModal.style.display = 'block';
    }

    createEffectControl(param) {
        const div = document.createElement('div');
        div.className = 'effect-control';

        div.innerHTML = `
            <label>${param.name}:</label>
            <input type="range" 
                   min="${param.min}" 
                   max="${param.max}" 
                   value="${param.default}" 
                   step="${param.step}"
                   data-param="${param.name}">
            <span class="value-display">${param.default}${param.unit}</span>
        `;

        const slider = div.querySelector('input[type="range"]');
        const display = div.querySelector('.value-display');

        slider.addEventListener('input', () => {
            display.textContent = slider.value + param.unit;
        });

        return div;
    }

    applyEffect() {
        const effectModal = document.getElementById('effect-modal');
        const effectName = effectModal.dataset.currentEffect;
        const selection = this.waveformRenderer.getSelection();

        if (!selection) {
            this.setStatus('No selection for effect');
            return;
        }

        // Get parameters
        const parameters = {};
        effectModal.querySelectorAll('input[data-param]').forEach(input => {
            const paramName = input.dataset.param;
            parameters[paramName] = parseFloat(input.value);
        });

        // Apply effect to each track
        this.showLoading('Applying effect...');
        
        setTimeout(() => {
            try {
                for (const [trackId] of this.tracks) {
                    const trackInfo = this.audioEngine.getTrackInfo(trackId);
                    if (trackInfo) {
                        const newBuffer = this.effectsProcessor.applyEffect(effectName, trackInfo.buffer, parameters);
                        
                        // Update track
                        this.audioEngine.audioBuffers.set(trackId, {
                            ...trackInfo,
                            buffer: newBuffer,
                            duration: newBuffer.duration
                        });
                    }
                }

                // Redraw waveforms
                this.waveformRenderer.redrawWaveforms();
                this.updateProjectInfo();
                
                this.setStatus(`Applied ${effectName}`);
            } catch (error) {
                console.error('Effect application failed:', error);
                this.setStatus('Effect failed: ' + error.message);
            } finally {
                this.hideLoading();
                this.closeModal('effect-modal');
            }
        }, 100);
    }

    previewEffect() {
        // TODO: Implement effect preview
        this.setStatus('Preview not implemented yet');
    }

    // Generate audio
    showGenerateDialog(type) {
        // TODO: Implement generate dialogs
        let params;
        
        switch (type) {
            case 'tone':
                params = prompt('Tone parameters (frequency,duration,amplitude):', '440,1.0,0.5');
                if (params) {
                    const [freq, dur, amp] = params.split(',').map(Number);
                    this.generateTone(freq || 440, dur || 1.0, amp || 0.5);
                }
                break;
            case 'noise':
                params = prompt('Noise parameters (duration,amplitude,type):', '1.0,0.1,white');
                if (params) {
                    const [dur, amp, noiseType] = params.split(',');
                    this.generateNoise(Number(dur) || 1.0, Number(amp) || 0.1, noiseType || 'white');
                }
                break;
            case 'silence':
                params = prompt('Silence duration (seconds):', '1.0');
                if (params) {
                    this.generateSilence(Number(params) || 1.0);
                }
                break;
        }
    }

    generateTone(frequency, duration, amplitude) {
        const trackId = this.audioEngine.generateTone(frequency, duration, amplitude);
        const trackInfo = this.audioEngine.getTrackInfo(trackId);
        
        const trackElement = this.waveformRenderer.addTrack(trackId, trackInfo.buffer, trackInfo.name);
        this.createTrackControl(trackId, trackInfo, trackElement);
        
        this.updateProjectInfo();
        this.setStatus(`Generated tone: ${frequency}Hz`);
    }

    generateNoise(duration, amplitude, type) {
        const trackId = this.audioEngine.generateNoise(duration, amplitude, type);
        const trackInfo = this.audioEngine.getTrackInfo(trackId);
        
        const trackElement = this.waveformRenderer.addTrack(trackId, trackInfo.buffer, trackInfo.name);
        this.createTrackControl(trackId, trackInfo, trackElement);
        
        this.updateProjectInfo();
        this.setStatus(`Generated ${type} noise`);
    }

    generateSilence(duration) {
        const trackId = this.audioEngine.generateSilence(duration);
        const trackInfo = this.audioEngine.getTrackInfo(trackId);
        
        const trackElement = this.waveformRenderer.addTrack(trackId, trackInfo.buffer, trackInfo.name);
        this.createTrackControl(trackId, trackInfo, trackElement);
        
        this.updateProjectInfo();
        this.setStatus(`Generated silence: ${duration}s`);
    }

    // Spectrum analyzer
    showSpectrumAnalyzer() {
        const selection = this.waveformRenderer.getSelection();
        if (!selection) {
            this.setStatus('No selection for analysis');
            return;
        }

        // TODO: Implement spectrum analysis
        const spectrumModal = document.getElementById('spectrum-modal');
        spectrumModal.style.display = 'block';
        this.setStatus('Spectrum analyzer opened');
    }

    // Project management
    newProject() {
        if (confirm('Create new project? This will clear all tracks.')) {
            // Clear all tracks
            for (const [trackId] of this.tracks) {
                this.removeTrack(trackId);
            }
            
            this.tracks.clear();
            this.waveformRenderer.clearSelection();
            this.updateProjectInfo();
            this.setStatus('New project created');
        }
    }

    openFileDialog() {
        document.getElementById('file-modal').style.display = 'block';
    }

    saveProject() {
        // TODO: Implement project saving
        this.setStatus('Save project not implemented yet');
    }

    async exportAudio() {
        if (this.tracks.size === 0) {
            this.setStatus('No audio to export');
            return;
        }

        try {
            // Export first track as example
            const firstTrackId = this.tracks.keys().next().value;
            const blob = await this.audioEngine.exportAudio(firstTrackId, 'wav');
            
            // Download file
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'exported_audio.wav';
            a.click();
            URL.revokeObjectURL(url);
            
            this.setStatus('Audio exported');
        } catch (error) {
            console.error('Export failed:', error);
            this.setStatus('Export failed: ' + error.message);
        }
    }

    // Track management
    addEmptyTrack() {
        const trackId = this.audioEngine.generateSilence(10); // 10 seconds of silence
        const trackInfo = this.audioEngine.getTrackInfo(trackId);
        trackInfo.name = 'Empty Track';
        
        const trackElement = this.waveformRenderer.addTrack(trackId, trackInfo.buffer, trackInfo.name);
        this.createTrackControl(trackId, trackInfo, trackElement);
        
        this.updateProjectInfo();
        this.setStatus('Added empty track');
    }

    removeTrack(trackId) {
        const trackData = this.tracks.get(trackId);
        if (trackData) {
            // Remove from UI
            trackData.control.remove();
            this.waveformRenderer.removeTrack(trackId);
            
            // Remove from audio engine
            this.audioEngine.removeTrack(trackId);
            
            // Remove from tracks map
            this.tracks.delete(trackId);
            
            this.updateProjectInfo();
        }
    }

    toggleTrackMute(trackId) {
        const trackData = this.tracks.get(trackId);
        if (trackData) {
            trackData.muted = !trackData.muted;
            const muteBtn = trackData.control.querySelector('.mute-btn');
            muteBtn.classList.toggle('active', trackData.muted);
            this.setStatus(trackData.muted ? 'Track muted' : 'Track unmuted');
        }
    }

    toggleTrackSolo(trackId) {
        const trackData = this.tracks.get(trackId);
        if (trackData) {
            trackData.solo = !trackData.solo;
            const soloBtn = trackData.control.querySelector('.solo-btn');
            soloBtn.classList.toggle('active', trackData.solo);
            this.setStatus(trackData.solo ? 'Track soloed' : 'Track un-soloed');
        }
    }

    setTrackVolume(trackId, volume) {
        const trackData = this.tracks.get(trackId);
        if (trackData) {
            trackData.volume = volume;
        }
    }

    setTrackPan(trackId, pan) {
        const trackData = this.tracks.get(trackId);
        if (trackData) {
            trackData.pan = pan;
        }
    }

    // UI updates
    updatePlaybackControls(playing) {
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        
        if (playing) {
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'block';
        } else {
            playBtn.style.display = 'block';
            pauseBtn.style.display = 'none';
        }
    }

    updateRecordingControls(recording) {
        const recordBtn = document.getElementById('record-btn');
        recordBtn.classList.toggle('active', recording);
    }

    updateProjectInfo() {
        const duration = this.audioEngine.getTotalDuration();
        const trackLengthElement = document.getElementById('track-length');
        if (trackLengthElement) {
            trackLengthElement.textContent = this.formatTime(duration);
        }
    }

    updateUI() {
        // Update project settings display
        document.getElementById('project-rate').textContent = this.projectSettings.sampleRate + ' Hz';
        document.getElementById('sample-rate').textContent = this.projectSettings.sampleRate + ' Hz';
        document.getElementById('bit-depth').textContent = this.projectSettings.bitDepth + '-bit';
        document.getElementById('audio-format').textContent = this.projectSettings.format;
    }

    setStatus(message) {
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.textContent = message;
        }
        console.log('Status:', message);
    }

    // Utility methods
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
        } else {
            return `${minutes}:${secs.toFixed(3).padStart(6, '0')}`;
        }
    }

    showLoading(message = 'Loading...') {
        let overlay = document.querySelector('.loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    }

    hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WebAudacityApp();
});
