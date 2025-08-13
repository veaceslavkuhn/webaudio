import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useReducer,
	useRef,
} from "react";
import { AudioEngineService } from "../services/AudioEngine";
import { EffectsProcessorService } from "../services/EffectsProcessor";

// Initial state
const initialState = {
	isInitialized: false,
	isPlaying: false,
	isRecording: false,
	isPaused: false,
	currentTime: 0,
	totalDuration: 0,
	tracks: new Map(),
	selection: { start: null, end: null },
	zoomLevel: 1.0,
	scrollPosition: 0,
	currentTool: "selection",
	status: "Initializing...",
	projectSettings: {
		sampleRate: 44100,
		bitDepth: 16,
		format: "WAV",
	},
	playbackVolume: 80,
	recordingVolume: 50,
	clipboard: null,
	loading: false,
	error: null,
};

// Action types
const ActionTypes = {
	INITIALIZE_SUCCESS: "INITIALIZE_SUCCESS",
	INITIALIZE_ERROR: "INITIALIZE_ERROR",
	SET_PLAYING: "SET_PLAYING",
	SET_RECORDING: "SET_RECORDING",
	SET_PAUSED: "SET_PAUSED",
	SET_CURRENT_TIME: "SET_CURRENT_TIME",
	SET_TOTAL_DURATION: "SET_TOTAL_DURATION",
	ADD_TRACK: "ADD_TRACK",
	REMOVE_TRACK: "REMOVE_TRACK",
	UPDATE_TRACK: "UPDATE_TRACK",
	SET_SELECTION: "SET_SELECTION",
	CLEAR_SELECTION: "CLEAR_SELECTION",
	SET_ZOOM_LEVEL: "SET_ZOOM_LEVEL",
	SET_SCROLL_POSITION: "SET_SCROLL_POSITION",
	SET_TOOL: "SET_TOOL",
	SET_STATUS: "SET_STATUS",
	SET_PLAYBACK_VOLUME: "SET_PLAYBACK_VOLUME",
	SET_RECORDING_VOLUME: "SET_RECORDING_VOLUME",
	SET_CLIPBOARD: "SET_CLIPBOARD",
	SET_LOADING: "SET_LOADING",
	SET_ERROR: "SET_ERROR",
	CLEAR_ERROR: "CLEAR_ERROR",
};

// Reducer
function audioReducer(state, action) {
	switch (action.type) {
		case ActionTypes.INITIALIZE_SUCCESS:
			return {
				...state,
				isInitialized: true,
				status: "Ready",
				error: null,
			};

		case ActionTypes.INITIALIZE_ERROR:
			return {
				...state,
				isInitialized: false,
				status: "Initialization failed",
				error: action.payload,
			};

		case ActionTypes.SET_PLAYING:
			return {
				...state,
				isPlaying: action.payload,
				isPaused: action.payload ? false : state.isPaused,
			};

		case ActionTypes.SET_RECORDING:
			return {
				...state,
				isRecording: action.payload,
			};

		case ActionTypes.SET_PAUSED:
			return {
				...state,
				isPaused: action.payload,
				isPlaying: action.payload ? false : state.isPlaying,
			};

		case ActionTypes.SET_CURRENT_TIME:
			return {
				...state,
				currentTime: action.payload,
			};

		case ActionTypes.SET_TOTAL_DURATION:
			return {
				...state,
				totalDuration: action.payload,
			};

		case ActionTypes.ADD_TRACK: {
			const newTracks = new Map(state.tracks);
			newTracks.set(action.payload.id, action.payload.track);
			return {
				...state,
				tracks: newTracks,
			};
		}

		case ActionTypes.REMOVE_TRACK: {
			const updatedTracks = new Map(state.tracks);
			updatedTracks.delete(action.payload);
			return {
				...state,
				tracks: updatedTracks,
			};
		}

		case ActionTypes.UPDATE_TRACK: {
			const modifiedTracks = new Map(state.tracks);
			if (modifiedTracks.has(action.payload.id)) {
				modifiedTracks.set(action.payload.id, {
					...modifiedTracks.get(action.payload.id),
					...action.payload.updates,
				});
			}
			return {
				...state,
				tracks: modifiedTracks,
			};
		}

		case ActionTypes.SET_SELECTION:
			return {
				...state,
				selection: action.payload,
			};

		case ActionTypes.CLEAR_SELECTION:
			return {
				...state,
				selection: { start: null, end: null },
			};

		case ActionTypes.SET_ZOOM_LEVEL:
			return {
				...state,
				zoomLevel: action.payload,
			};

		case ActionTypes.SET_SCROLL_POSITION:
			return {
				...state,
				scrollPosition: action.payload,
			};

		case ActionTypes.SET_TOOL:
			return {
				...state,
				currentTool: action.payload,
			};

		case ActionTypes.SET_STATUS:
			return {
				...state,
				status: action.payload,
			};

		case ActionTypes.SET_PLAYBACK_VOLUME:
			return {
				...state,
				playbackVolume: action.payload,
			};

		case ActionTypes.SET_RECORDING_VOLUME:
			return {
				...state,
				recordingVolume: action.payload,
			};

		case ActionTypes.SET_CLIPBOARD:
			return {
				...state,
				clipboard: action.payload,
			};

		case ActionTypes.SET_LOADING:
			return {
				...state,
				loading: action.payload,
			};

		case ActionTypes.SET_ERROR:
			return {
				...state,
				error: action.payload,
			};

		case ActionTypes.CLEAR_ERROR:
			return {
				...state,
				error: null,
			};

		default:
			return state;
	}
}

// Create contexts
const AudioStateContext = createContext();
const AudioActionsContext = createContext();

// Custom hooks
export const useAudioState = () => {
	const context = useContext(AudioStateContext);
	if (!context) {
		throw new Error("useAudioState must be used within AudioProvider");
	}
	return context;
};

export const useAudioActions = () => {
	const context = useContext(AudioActionsContext);
	if (!context) {
		throw new Error("useAudioActions must be used within AudioProvider");
	}
	return context;
};

// Provider component
export const AudioProvider = ({ children }) => {
	const [state, dispatch] = useReducer(audioReducer, initialState);
	const audioEngineRef = useRef(null);
	const effectsProcessorRef = useRef(null);

	// Initialize audio services
	useEffect(() => {
		const initializeAudio = async () => {
			try {
				dispatch({ type: ActionTypes.SET_LOADING, payload: true });

				// Create audio engine
				audioEngineRef.current = new AudioEngineService();

				// Set up callbacks
				audioEngineRef.current.onPlaybackFinished = () => {
					dispatch({ type: ActionTypes.SET_PLAYING, payload: false });
					dispatch({
						type: ActionTypes.SET_STATUS,
						payload: "Playback finished",
					});
				};

				audioEngineRef.current.onRecordingFinished = (trackId) => {
					const trackInfo = audioEngineRef.current.getTrackInfo(trackId);
					if (trackInfo) {
						actions.addTrack(trackId, trackInfo);
						actions.updateTotalDuration();
					}
				};

				audioEngineRef.current.onError = (error) => {
					dispatch({ type: ActionTypes.SET_ERROR, payload: error });
				};

				audioEngineRef.current.onStatusChange = (status) => {
					dispatch({ type: ActionTypes.SET_STATUS, payload: status });
				};

				// Initialize audio context
				const success = await audioEngineRef.current.initializeAudioContext();

				if (success) {
					// Create effects processor
					effectsProcessorRef.current = new EffectsProcessorService(
						audioEngineRef.current.audioContext,
					);

					dispatch({ type: ActionTypes.INITIALIZE_SUCCESS });
				} else {
					dispatch({
						type: ActionTypes.INITIALIZE_ERROR,
						payload: "Failed to initialize audio context",
					});
				}
			} catch (error) {
				dispatch({
					type: ActionTypes.INITIALIZE_ERROR,
					payload: error.message,
				});
			} finally {
				dispatch({ type: ActionTypes.SET_LOADING, payload: false });
			}
		};

		initializeAudio();

		// Cleanup
		return () => {
			if (audioEngineRef.current) {
				audioEngineRef.current.destroy();
			}
		};
	}, []);

	// Actions
	const actions = {
		// Transport controls
		play: useCallback(
			(startTime, duration) => {
				if (!audioEngineRef.current || !state.isInitialized) return;

				audioEngineRef.current.play(null, startTime, duration);
				dispatch({ type: ActionTypes.SET_PLAYING, payload: true });
			},
			[state.isInitialized],
		),

		pause: useCallback(() => {
			if (!audioEngineRef.current) return;

			audioEngineRef.current.pause();
			dispatch({ type: ActionTypes.SET_PAUSED, payload: true });
		}, []),

		stop: useCallback(() => {
			if (!audioEngineRef.current) return;

			audioEngineRef.current.stop();
			dispatch({ type: ActionTypes.SET_PLAYING, payload: false });
			dispatch({ type: ActionTypes.SET_PAUSED, payload: false });
			dispatch({ type: ActionTypes.SET_CURRENT_TIME, payload: 0 });
		}, []),

		startRecording: useCallback(async () => {
			if (!audioEngineRef.current) return;

			try {
				await audioEngineRef.current.startRecording();
				dispatch({ type: ActionTypes.SET_RECORDING, payload: true });
			} catch (error) {
				dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
			}
		}, []),

		stopRecording: useCallback(() => {
			if (!audioEngineRef.current) return;

			audioEngineRef.current.stopRecording();
			dispatch({ type: ActionTypes.SET_RECORDING, payload: false });
		}, []),

		seekToTime: useCallback((time) => {
			if (!audioEngineRef.current) return;

			audioEngineRef.current.currentTime = time;
			dispatch({ type: ActionTypes.SET_CURRENT_TIME, payload: time });
		}, []),

		// File operations
		loadAudioFile: useCallback(async (file) => {
			if (!audioEngineRef.current) return null;

			try {
				dispatch({ type: ActionTypes.SET_LOADING, payload: true });
				const trackId = await audioEngineRef.current.loadAudioFromFile(file);
				const trackInfo = audioEngineRef.current.getTrackInfo(trackId);

				if (trackInfo) {
					actions.addTrack(trackId, trackInfo);
					actions.updateTotalDuration();
					dispatch({
						type: ActionTypes.SET_STATUS,
						payload: `Loaded: ${file.name}`,
					});
				}

				return trackId;
			} catch (error) {
				dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
				return null;
			} finally {
				dispatch({ type: ActionTypes.SET_LOADING, payload: false });
			}
		}, []),

		exportAudio: useCallback(async (trackId, format = "wav") => {
			if (!audioEngineRef.current) return null;

			try {
				const blob = await audioEngineRef.current.exportAudio(trackId, format);
				return blob;
			} catch (error) {
				dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
				return null;
			}
		}, []),

		// Track management
		addTrack: useCallback((trackId, trackInfo) => {
			dispatch({
				type: ActionTypes.ADD_TRACK,
				payload: {
					id: trackId,
					track: {
						info: trackInfo,
						muted: false,
						solo: false,
						volume: 0.8,
						pan: 0,
						visible: true,
					},
				},
			});
		}, []),

		removeTrack: useCallback((trackId) => {
			if (audioEngineRef.current) {
				audioEngineRef.current.removeTrack(trackId);
			}
			dispatch({ type: ActionTypes.REMOVE_TRACK, payload: trackId });
			actions.updateTotalDuration();
		}, []),

		updateTrack: useCallback((trackId, updates) => {
			dispatch({
				type: ActionTypes.UPDATE_TRACK,
				payload: { id: trackId, updates },
			});
		}, []),

		// Selection
		setSelection: useCallback((start, end) => {
			dispatch({
				type: ActionTypes.SET_SELECTION,
				payload: { start, end },
			});
		}, []),

		clearSelection: useCallback(() => {
			dispatch({ type: ActionTypes.CLEAR_SELECTION });
		}, []),

		selectAll: useCallback(() => {
			if (audioEngineRef.current) {
				const duration = audioEngineRef.current.getTotalDuration();
				actions.setSelection(0, duration);
			}
		}, []),

		// Edit operations
		cut: useCallback(() => {
			if (!state.selection.start || !state.selection.end) {
				dispatch({
					type: ActionTypes.SET_STATUS,
					payload: "No selection to cut",
				});
				return;
			}

			// Copy first
			actions.copy();

			// Then delete
			actions.delete();
		}, [state.selection]),

		copy: useCallback(() => {
			if (
				!state.selection.start ||
				!state.selection.end ||
				!audioEngineRef.current
			) {
				dispatch({
					type: ActionTypes.SET_STATUS,
					payload: "No selection to copy",
				});
				return;
			}

			const clipboard = {
				selection: state.selection,
				tracks: new Map(),
			};

			for (const [trackId] of state.tracks) {
				const buffer = audioEngineRef.current.copyAudio(
					trackId,
					state.selection.start,
					state.selection.end,
				);
				if (buffer) {
					clipboard.tracks.set(trackId, buffer);
				}
			}

			dispatch({ type: ActionTypes.SET_CLIPBOARD, payload: clipboard });
			dispatch({ type: ActionTypes.SET_STATUS, payload: "Copied selection" });
		}, [state.selection, state.tracks]),

		delete: useCallback(() => {
			if (
				!state.selection.start ||
				!state.selection.end ||
				!audioEngineRef.current
			) {
				dispatch({
					type: ActionTypes.SET_STATUS,
					payload: "No selection to delete",
				});
				return;
			}

			for (const [trackId] of state.tracks) {
				audioEngineRef.current.cutAudio(
					trackId,
					state.selection.start,
					state.selection.end,
				);
			}

			actions.clearSelection();
			actions.updateTotalDuration();
			dispatch({ type: ActionTypes.SET_STATUS, payload: "Deleted selection" });
		}, [state.selection, state.tracks]),

		paste: useCallback(() => {
			if (!state.clipboard || !audioEngineRef.current) {
				dispatch({
					type: ActionTypes.SET_STATUS,
					payload: "Nothing to paste",
				});
				return;
			}

			try {
				// If we have a selection, paste at the selection start
				// Otherwise, paste at the current playhead position
				const pastePosition =
					state.selection.start || state.playheadPosition || 0;

				for (const [trackId, buffer] of state.clipboard.tracks) {
					// Check if the track still exists
					if (state.tracks.has(trackId)) {
						audioEngineRef.current.pasteAudio(trackId, buffer, pastePosition);
					}
				}

				actions.updateTotalDuration();
				dispatch({ type: ActionTypes.SET_STATUS, payload: "Pasted audio" });
			} catch (error) {
				dispatch({
					type: ActionTypes.SET_ERROR,
					payload: "Failed to paste audio",
				});
			}
		}, [
			state.clipboard,
			state.selection,
			state.playheadPosition,
			state.tracks,
		]),

		// Effects
		applyEffect: useCallback(
			(effectName, parameters) => {
				if (!effectsProcessorRef.current || !audioEngineRef.current) return;

				if (!state.selection.start || !state.selection.end) {
					dispatch({
						type: ActionTypes.SET_STATUS,
						payload: "No selection for effect",
					});
					return;
				}

				dispatch({ type: ActionTypes.SET_LOADING, payload: true });

				setTimeout(() => {
					try {
						for (const [trackId] of state.tracks) {
							const trackInfo = audioEngineRef.current.getTrackInfo(trackId);
							if (trackInfo) {
								const newBuffer = effectsProcessorRef.current.applyEffect(
									effectName,
									trackInfo.buffer,
									parameters,
								);

								audioEngineRef.current.audioBuffers.set(trackId, {
									...trackInfo,
									buffer: newBuffer,
									duration: newBuffer.duration,
								});
							}
						}

						actions.updateTotalDuration();
						dispatch({
							type: ActionTypes.SET_STATUS,
							payload: `Applied ${effectName}`,
						});
					} catch (error) {
						dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
					} finally {
						dispatch({ type: ActionTypes.SET_LOADING, payload: false });
					}
				}, 100);
			},
			[state.selection, state.tracks],
		),

		// Generate audio
		generateTone: useCallback((frequency, duration, amplitude, waveform) => {
			if (!audioEngineRef.current) return;

			const trackId = audioEngineRef.current.generateTone(
				frequency,
				duration,
				amplitude,
				waveform,
			);
			const trackInfo = audioEngineRef.current.getTrackInfo(trackId);

			if (trackInfo) {
				actions.addTrack(trackId, trackInfo);
				actions.updateTotalDuration();
			}
		}, []),

		generateNoise: useCallback((duration, amplitude, type) => {
			if (!audioEngineRef.current) return;

			const trackId = audioEngineRef.current.generateNoise(
				duration,
				amplitude,
				type,
			);
			const trackInfo = audioEngineRef.current.getTrackInfo(trackId);

			if (trackInfo) {
				actions.addTrack(trackId, trackInfo);
				actions.updateTotalDuration();
			}
		}, []),

		generateSilence: useCallback((duration) => {
			if (!audioEngineRef.current) return;

			const trackId = audioEngineRef.current.generateSilence(duration);
			const trackInfo = audioEngineRef.current.getTrackInfo(trackId);

			if (trackInfo) {
				actions.addTrack(trackId, trackInfo);
				actions.updateTotalDuration();
			}
		}, []),

		// UI controls
		setTool: useCallback((tool) => {
			dispatch({ type: ActionTypes.SET_TOOL, payload: tool });
		}, []),

		setZoomLevel: useCallback((level) => {
			dispatch({ type: ActionTypes.SET_ZOOM_LEVEL, payload: level });
		}, []),

		setScrollPosition: useCallback((position) => {
			dispatch({ type: ActionTypes.SET_SCROLL_POSITION, payload: position });
		}, []),

		setPlaybackVolume: useCallback((volume) => {
			if (audioEngineRef.current) {
				audioEngineRef.current.setMasterVolume(volume / 100);
			}
			dispatch({ type: ActionTypes.SET_PLAYBACK_VOLUME, payload: volume });
		}, []),

		setRecordingVolume: useCallback((volume) => {
			dispatch({ type: ActionTypes.SET_RECORDING_VOLUME, payload: volume });
		}, []),

		setStatus: useCallback((status) => {
			dispatch({ type: ActionTypes.SET_STATUS, payload: status });
		}, []),

		clearError: useCallback(() => {
			dispatch({ type: ActionTypes.CLEAR_ERROR });
		}, []),

		// Utility
		updateTotalDuration: useCallback(() => {
			if (audioEngineRef.current) {
				const duration = audioEngineRef.current.getTotalDuration();
				dispatch({ type: ActionTypes.SET_TOTAL_DURATION, payload: duration });
			}
		}, []),

		getEffectParameters: useCallback((effectName) => {
			if (effectsProcessorRef.current) {
				return effectsProcessorRef.current.getEffectParameters(effectName);
			}
			return [];
		}, []),
	};

	return (
		<AudioStateContext.Provider value={state}>
			<AudioActionsContext.Provider value={actions}>
				{children}
			</AudioActionsContext.Provider>
		</AudioStateContext.Provider>
	);
};
