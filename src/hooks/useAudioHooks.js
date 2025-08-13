import { useCallback, useEffect, useRef } from "react";
import { useAudioActions, useAudioState } from "../context/AudioContext";

// Hook for waveform rendering
export const useWaveformRenderer = (canvasRef, timelineCanvasRef) => {
	const state = useAudioState();
	const actions = useAudioActions();
	const rendererRef = useRef(null);

	const initRenderer = useCallback(() => {
		if (!canvasRef.current || !timelineCanvasRef.current) return;

		// Initialize waveform renderer
		rendererRef.current = {
			canvasContainer: canvasRef.current,
			timelineCanvas: timelineCanvasRef.current,
			zoomLevel: state.zoomLevel,
			scrollPosition: state.scrollPosition,
			pixelsPerSecond: 100 * state.zoomLevel,
			tracks: new Map(),
		};

		// Setup event listeners
		setupEventListeners();
	}, [canvasRef, timelineCanvasRef, state.zoomLevel, state.scrollPosition]);

	const setupEventListeners = useCallback(() => {
		if (!canvasRef.current) return;

		const container = canvasRef.current;
		let isSelecting = false;
		let selectionStart = null;

		const handleMouseDown = (e) => {
			if (e.target.tagName === "CANVAS") {
				isSelecting = true;
				const time = getTimeFromMouseEvent(e);
				selectionStart = time;
				actions.setSelection(time, time);
				e.preventDefault();
			}
		};

		const handleMouseMove = (e) => {
			if (isSelecting && e.target.tagName === "CANVAS") {
				const time = getTimeFromMouseEvent(e);
				actions.setSelection(selectionStart, time);
			}
		};

		const handleMouseUp = () => {
			if (isSelecting) {
				isSelecting = false;
				if (state.selection.start !== null && state.selection.end !== null) {
					const duration = Math.abs(
						state.selection.end - state.selection.start,
					);
					if (duration < 0.01) {
						actions.clearSelection();
					}
				}
			}
		};

		const handleWheel = (e) => {
			e.preventDefault();

			if (e.ctrlKey || e.metaKey) {
				const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
				actions.setZoomLevel(state.zoomLevel * zoomFactor);
			} else {
				const scrollAmount = e.deltaY * 2;
				actions.setScrollPosition(state.scrollPosition + scrollAmount);
			}
		};

		const getTimeFromMouseEvent = (event) => {
			const rect = event.target.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const time = (state.scrollPosition + x) / (100 * state.zoomLevel);
			return Math.max(0, time);
		};

		container.addEventListener("mousedown", handleMouseDown);
		container.addEventListener("mousemove", handleMouseMove);
		container.addEventListener("mouseup", handleMouseUp);
		container.addEventListener("wheel", handleWheel, { passive: false });

		return () => {
			container.removeEventListener("mousedown", handleMouseDown);
			container.removeEventListener("mousemove", handleMouseMove);
			container.removeEventListener("mouseup", handleMouseUp);
			container.removeEventListener("wheel", handleWheel);
		};
	}, [actions, state.zoomLevel, state.scrollPosition, state.selection]);

	const addTrack = useCallback((trackId, audioBuffer, trackName) => {
		if (!rendererRef.current) return;

		// Store track data
		rendererRef.current.tracks.set(trackId, {
			buffer: audioBuffer,
			name: trackName,
			peaks: generatePeaks(audioBuffer),
			visible: true,
		});
	}, []);

	const removeTrack = useCallback((trackId) => {
		if (!rendererRef.current) return;

		rendererRef.current.tracks.delete(trackId);
	}, []);

	const generatePeaks = useCallback((audioBuffer, samplesPerPixel = 512) => {
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
	}, []);

	const formatTime = useCallback((seconds) => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toFixed(3).padStart(6, "0")}`;
		} else {
			return `${minutes}:${secs.toFixed(3).padStart(6, "0")}`;
		}
	}, []);

	useEffect(() => {
		initRenderer();
	}, [initRenderer]);

	return {
		addTrack,
		removeTrack,
		formatTime,
		renderer: rendererRef.current,
	};
};

// Hook for keyboard shortcuts
export const useKeyboardShortcuts = () => {
	const state = useAudioState();
	const actions = useAudioActions();

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.ctrlKey || e.metaKey) {
				switch (e.key) {
					case "n":
						e.preventDefault();
						// New project
						break;
					case "o":
						e.preventDefault();
						// Open file
						break;
					case "s":
						e.preventDefault();
						// Save project
						break;
					case "z":
						e.preventDefault();
						if (e.shiftKey) {
							// Redo
							actions.redo();
						} else {
							// Undo
							actions.undo();
						}
						break;
					case "x":
						e.preventDefault();
						actions.cut();
						break;
					case "c":
						e.preventDefault();
						actions.copy();
						break;
					case "v":
						e.preventDefault();
						// Paste
						break;
					case "a":
						e.preventDefault();
						actions.selectAll();
						break;
					default:
						break;
				}
			}

			if (e.key === " ") {
				e.preventDefault();
				if (state.isPlaying) {
					actions.pause();
				} else {
					actions.play();
				}
			}

			if (e.key === "Delete" || e.key === "Backspace") {
				e.preventDefault();
				actions.delete();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [state.isPlaying, actions]);
};

// Hook for file drag and drop
export const useFileDrop = (onFileDrop) => {
	const handleDragOver = useCallback((e) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
	}, []);

	const handleDrop = useCallback(
		(e) => {
			e.preventDefault();
			const files = Array.from(e.dataTransfer.files);
			const audioFiles = files.filter((file) => file.type.startsWith("audio/"));

			if (audioFiles.length > 0) {
				onFileDrop(audioFiles);
			}
		},
		[onFileDrop],
	);

	return {
		handleDragOver,
		handleDrop,
	};
};
