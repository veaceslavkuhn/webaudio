/**
 * Waveform Renderer - Handles visual representation of audio data
 * Renders waveforms, timelines, and handles selection visualization
 */

class WaveformRenderer {
    constructor(canvasContainer, timelineCanvas) {
        this.container = canvasContainer;
        this.timelineCanvas = timelineCanvas;
        this.timelineCtx = timelineCanvas.getContext('2d');
        this.trackCanvases = new Map();
        this.trackData = new Map();
        this.zoomLevel = 1.0;
        this.scrollPosition = 0;
        this.pixelsPerSecond = 100;
        this.selection = { start: null, end: null };
        this.playheadPosition = 0;
        this.isSelecting = false;
        this.selectionStart = null;
        
        this.setupEventListeners();
        this.resizeCanvases();
        this.drawTimeline();
    }

    setupEventListeners() {
        // Handle container resize
        window.addEventListener('resize', () => {
            this.resizeCanvases();
            this.redrawAll();
        });

        // Mouse events for selection
        this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.container.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.container.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

        // Timeline click for seeking
        this.timelineCanvas.addEventListener('click', this.handleTimelineClick.bind(this));
    }

    resizeCanvases() {
        const containerRect = this.container.getBoundingClientRect();
        const timelineRect = this.timelineCanvas.getBoundingClientRect();
        
        // Resize timeline canvas
        this.timelineCanvas.width = timelineRect.width * window.devicePixelRatio;
        this.timelineCanvas.height = timelineRect.height * window.devicePixelRatio;
        this.timelineCanvas.style.width = timelineRect.width + 'px';
        this.timelineCanvas.style.height = timelineRect.height + 'px';
        
        this.timelineCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Resize track canvases
        for (const [trackId, canvas] of this.trackCanvases) {
            const trackElement = canvas.parentElement;
            const rect = trackElement.getBoundingClientRect();
            
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            
            const ctx = canvas.getContext('2d');
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
    }

    addTrack(trackId, audioBuffer, trackName) {
        // Create track container
        const trackElement = document.createElement('div');
        trackElement.className = 'waveform-track';
        trackElement.dataset.trackId = trackId;

        // Create canvas for waveform
        const canvas = document.createElement('canvas');
        canvas.className = 'waveform-canvas';
        trackElement.appendChild(canvas);

        // Add to container
        this.container.appendChild(trackElement);

        // Store references
        this.trackCanvases.set(trackId, canvas);
        this.trackData.set(trackId, {
            buffer: audioBuffer,
            name: trackName,
            peaks: this.generatePeaks(audioBuffer),
            visible: true,
            muted: false,
            solo: false
        });

        // Setup canvas
        this.resizeCanvas(canvas);
        this.drawWaveform(trackId);

        return trackElement;
    }

    removeTrack(trackId) {
        const canvas = this.trackCanvases.get(trackId);
        if (canvas && canvas.parentElement) {
            canvas.parentElement.remove();
        }
        
        this.trackCanvases.delete(trackId);
        this.trackData.delete(trackId);
    }

    resizeCanvas(canvas) {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        const ctx = canvas.getContext('2d');
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    generatePeaks(audioBuffer, samplesPerPixel = 512) {
        const numberOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        const peaks = [];

        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            const channelPeaks = [];

            for (let i = 0; i < length; i += samplesPerPixel) {
                let min = 0;
                let max = 0;

                for (let j = 0; j < samplesPerPixel && i + j < length; j++) {
                    const sample = channelData[i + j];
                    if (sample > max) max = sample;
                    if (sample < min) min = sample;
                }

                channelPeaks.push({ min, max });
            }

            peaks.push(channelPeaks);
        }

        return peaks;
    }

    drawWaveform(trackId) {
        const canvas = this.trackCanvases.get(trackId);
        const trackData = this.trackData.get(trackId);
        
        if (!canvas || !trackData) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (!trackData.visible) return;

        const peaks = trackData.peaks;
        const buffer = trackData.buffer;
        const duration = buffer.duration;
        const numberOfChannels = buffer.numberOfChannels;

        // Calculate visible range
        const startTime = this.scrollPosition / this.pixelsPerSecond;
        const endTime = startTime + (width / this.pixelsPerSecond);
        const startSample = Math.floor(startTime * buffer.sampleRate);
        const endSample = Math.floor(endTime * buffer.sampleRate);

        // Set colors
        const waveformColor = trackData.muted ? '#ccc' : '#4a90e2';
        const centerLineColor = '#999';

        ctx.strokeStyle = centerLineColor;
        ctx.lineWidth = 1;

        // Draw center lines for each channel
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelHeight = height / numberOfChannels;
            const centerY = (channel + 0.5) * channelHeight;
            
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            ctx.lineTo(width, centerY);
            ctx.stroke();
        }

        // Draw waveform
        ctx.strokeStyle = waveformColor;
        ctx.fillStyle = waveformColor + '40'; // Semi-transparent fill
        ctx.lineWidth = 1;

        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelHeight = height / numberOfChannels;
            const centerY = (channel + 0.5) * channelHeight;
            const amplitude = channelHeight * 0.4; // Use 80% of channel height
            
            const channelPeaks = peaks[channel];
            if (!channelPeaks) continue;

            ctx.beginPath();
            
            for (let x = 0; x < width; x += 2) {
                const time = startTime + (x / this.pixelsPerSecond);
                const sampleIndex = Math.floor((time / duration) * channelPeaks.length);
                
                if (sampleIndex >= 0 && sampleIndex < channelPeaks.length) {
                    const peak = channelPeaks[sampleIndex];
                    const minY = centerY - (peak.min * amplitude);
                    const maxY = centerY - (peak.max * amplitude);
                    
                    ctx.moveTo(x, minY);
                    ctx.lineTo(x, maxY);
                }
            }
            
            ctx.stroke();
        }

        // Draw selection if active
        this.drawSelection(ctx, width, height);
    }

    drawSelection(ctx, width, height) {
        if (this.selection.start === null || this.selection.end === null) return;

        const startX = (this.selection.start * this.pixelsPerSecond) - this.scrollPosition;
        const endX = (this.selection.end * this.pixelsPerSecond) - this.scrollPosition;

        if (endX < 0 || startX > width) return; // Selection not visible

        const clampedStartX = Math.max(0, startX);
        const clampedEndX = Math.min(width, endX);

        ctx.fillStyle = 'rgba(74, 144, 226, 0.3)';
        ctx.fillRect(clampedStartX, 0, clampedEndX - clampedStartX, height);

        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 2;
        ctx.strokeRect(clampedStartX, 0, clampedEndX - clampedStartX, height);
    }

    drawTimeline() {
        const ctx = this.timelineCtx;
        const rect = this.timelineCanvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Clear timeline
        ctx.clearRect(0, 0, width, height);

        // Set styles
        ctx.fillStyle = '#333';
        ctx.strokeStyle = '#666';
        ctx.font = '10px Arial';
        ctx.lineWidth = 1;

        // Calculate time range
        const startTime = this.scrollPosition / this.pixelsPerSecond;
        const endTime = startTime + (width / this.pixelsPerSecond);

        // Calculate time intervals
        const duration = endTime - startTime;
        let interval = 1; // 1 second default

        if (duration > 3600) interval = 600; // 10 minutes
        else if (duration > 1800) interval = 300; // 5 minutes
        else if (duration > 600) interval = 60; // 1 minute
        else if (duration > 60) interval = 10; // 10 seconds
        else if (duration > 10) interval = 1; // 1 second
        else if (duration > 1) interval = 0.1; // 100ms
        else interval = 0.01; // 10ms

        // Draw time markers
        const startMark = Math.ceil(startTime / interval) * interval;
        
        for (let time = startMark; time <= endTime; time += interval) {
            const x = (time * this.pixelsPerSecond) - this.scrollPosition;
            
            if (x >= 0 && x <= width) {
                // Draw tick mark
                ctx.beginPath();
                ctx.moveTo(x, height - 10);
                ctx.lineTo(x, height);
                ctx.stroke();

                // Draw time label
                const timeStr = this.formatTime(time);
                const textWidth = ctx.measureText(timeStr).width;
                
                if (x - textWidth / 2 > 0 && x + textWidth / 2 < width) {
                    ctx.fillText(timeStr, x - textWidth / 2, height - 12);
                }
            }
        }

        // Draw minor ticks
        const minorInterval = interval / 5;
        const startMinor = Math.ceil(startTime / minorInterval) * minorInterval;
        
        for (let time = startMinor; time <= endTime; time += minorInterval) {
            if (time % interval !== 0) { // Skip major ticks
                const x = (time * this.pixelsPerSecond) - this.scrollPosition;
                
                if (x >= 0 && x <= width) {
                    ctx.beginPath();
                    ctx.moveTo(x, height - 5);
                    ctx.lineTo(x, height);
                    ctx.stroke();
                }
            }
        }
    }

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

    updatePlayhead(time) {
        this.playheadPosition = time;
        const playhead = document.getElementById('playhead');
        if (playhead) {
            const x = (time * this.pixelsPerSecond) - this.scrollPosition;
            playhead.style.left = x + 'px';
        }
    }

    setZoom(zoomLevel) {
        this.zoomLevel = Math.max(0.1, Math.min(10, zoomLevel));
        this.pixelsPerSecond = 100 * this.zoomLevel;
        this.redrawAll();
    }

    setSelection(start, end) {
        this.selection.start = start;
        this.selection.end = end;
        this.redrawWaveforms();
        
        // Update UI
        if (start !== null && end !== null) {
            const duration = Math.abs(end - start);
            const selectionDisplay = document.getElementById('selection-time');
            if (selectionDisplay) {
                selectionDisplay.textContent = 
                    `${this.formatTime(Math.min(start, end))} - ${this.formatTime(Math.max(start, end))} (${this.formatTime(duration)})`;
            }
        }
    }

    clearSelection() {
        this.setSelection(null, null);
    }

    scroll(position) {
        this.scrollPosition = Math.max(0, position);
        this.redrawAll();
    }

    redrawAll() {
        this.drawTimeline();
        this.redrawWaveforms();
    }

    redrawWaveforms() {
        for (const trackId of this.trackCanvases.keys()) {
            this.drawWaveform(trackId);
        }
    }

    // Mouse event handlers
    handleMouseDown(event) {
        if (event.target.classList.contains('waveform-canvas')) {
            this.isSelecting = true;
            const time = this.getTimeFromMouseEvent(event);
            this.selectionStart = time;
            this.setSelection(time, time);
            
            event.preventDefault();
        }
    }

    handleMouseMove(event) {
        if (this.isSelecting && event.target.classList.contains('waveform-canvas')) {
            const time = this.getTimeFromMouseEvent(event);
            this.setSelection(this.selectionStart, time);
        }
    }

    handleMouseUp(event) {
        if (this.isSelecting) {
            this.isSelecting = false;
            
            // If selection is too small, clear it
            if (this.selection.start !== null && this.selection.end !== null) {
                const duration = Math.abs(this.selection.end - this.selection.start);
                if (duration < 0.01) { // Less than 10ms
                    this.clearSelection();
                }
            }
        }
    }

    handleWheel(event) {
        event.preventDefault();
        
        if (event.ctrlKey || event.metaKey) {
            // Zoom
            const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
            this.setZoom(this.zoomLevel * zoomFactor);
        } else {
            // Scroll
            const scrollAmount = event.deltaY * 2;
            this.scroll(this.scrollPosition + scrollAmount);
        }
    }

    handleTimelineClick(event) {
        const time = this.getTimeFromMouseEvent(event, this.timelineCanvas);
        this.updatePlayhead(time);
        
        // Notify app of seek request
        if (this.onSeek) {
            this.onSeek(time);
        }
    }

    getTimeFromMouseEvent(event, canvas = null) {
        const targetCanvas = canvas || event.target;
        const rect = targetCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const time = (this.scrollPosition + x) / this.pixelsPerSecond;
        return Math.max(0, time);
    }

    // Public API
    zoomIn() {
        this.setZoom(this.zoomLevel * 1.2);
    }

    zoomOut() {
        this.setZoom(this.zoomLevel / 1.2);
    }

    zoomToFit() {
        let maxDuration = 0;
        for (const [trackId, data] of this.trackData) {
            maxDuration = Math.max(maxDuration, data.buffer.duration);
        }
        
        if (maxDuration > 0) {
            const containerWidth = this.container.getBoundingClientRect().width;
            const newPixelsPerSecond = containerWidth / maxDuration;
            this.pixelsPerSecond = newPixelsPerSecond;
            this.zoomLevel = newPixelsPerSecond / 100;
            this.scrollPosition = 0;
            this.redrawAll();
        }
    }

    getSelection() {
        if (this.selection.start !== null && this.selection.end !== null) {
            return {
                start: Math.min(this.selection.start, this.selection.end),
                end: Math.max(this.selection.start, this.selection.end)
            };
        }
        return null;
    }

    selectAll() {
        let maxDuration = 0;
        for (const [trackId, data] of this.trackData) {
            maxDuration = Math.max(maxDuration, data.buffer.duration);
        }
        
        if (maxDuration > 0) {
            this.setSelection(0, maxDuration);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WaveformRenderer;
} else {
    window.WaveformRenderer = WaveformRenderer;
}
