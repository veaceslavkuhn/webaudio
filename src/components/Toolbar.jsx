import {
	Circle,
	Maximize2,
	MousePointer,
	Move,
	Pause,
	Play,
	SkipBack,
	SkipForward,
	Square,
	TrendingUp,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import React from "react";
import { useAudioActions, useAudioState } from "../context/AudioContext";

const Toolbar = () => {
	const state = useAudioState();
	const actions = useAudioActions();

	const handleRecordClick = () => {
		if (state.isRecording) {
			actions.stopRecording();
		} else {
			actions.startRecording();
		}
	};

	const handlePlayClick = () => {
		if (state.selection.start !== null && state.selection.end !== null) {
			actions.play(
				state.selection.start,
				state.selection.end - state.selection.start,
			);
		} else {
			actions.play();
		}
	};

	const handleToolClick = (tool) => {
		actions.setTool(tool);
	};

	const handleVolumeChange = (type, value) => {
		if (type === "playback") {
			actions.setPlaybackVolume(value);
		} else {
			actions.setRecordingVolume(value);
		}
	};

	const handleZoomIn = () => {
		actions.setZoomLevel(state.zoomLevel * 1.2);
	};

	const handleZoomOut = () => {
		actions.setZoomLevel(state.zoomLevel / 1.2);
	};

	const handleZoomFit = () => {
		if (state.totalDuration > 0) {
			const containerWidth = 800; // Approximate container width
			const newZoomLevel = containerWidth / (100 * state.totalDuration);
			actions.setZoomLevel(newZoomLevel);
			actions.setScrollPosition(0);
		}
	};

	return (
		<div className="toolbar" data-testid="toolbar">
			{/* Transport Controls */}
			<div className="toolbar-section" data-testid="transport-controls">
				<button
					className={`tool-btn record ${state.isRecording ? "active" : ""}`}
					onClick={handleRecordClick}
					title="Record"
					disabled={!state.isInitialized}
					data-testid="record-button"
				>
					<Circle
						size={16}
						fill={state.isRecording ? "currentColor" : "none"}
					/>
				</button>

				<button
					className="tool-btn"
					onClick={actions.stop}
					title="Stop"
					disabled={!state.isInitialized}
					data-testid="stop-button"
				>
					<Square size={16} />
				</button>

				{state.isPlaying ? (
					<button
						className="tool-btn"
						onClick={actions.pause}
						title="Pause"
						disabled={!state.isInitialized}
						data-testid="pause-button"
					>
						<Pause size={16} />
					</button>
				) : (
					<button
						className="tool-btn"
						onClick={handlePlayClick}
						title="Play"
						disabled={!state.isInitialized}
						data-testid="play-button"
					>
						<Play size={16} />
					</button>
				)}
			</div>

			{/* Skip Controls */}
			<div className="toolbar-section" data-testid="skip-controls">
				<button
					className="tool-btn"
					onClick={() => actions.seekToTime(0)}
					title="Skip to Start"
					disabled={!state.isInitialized}
					data-testid="skip-to-start-button"
				>
					<SkipBack size={16} />
				</button>

				<button
					className="tool-btn"
					onClick={() => actions.seekToTime(state.totalDuration)}
					title="Skip to End"
					disabled={!state.isInitialized}
					data-testid="skip-to-end-button"
				>
					<SkipForward size={16} />
				</button>
			</div>

			{/* Tool Selection */}
			<div className="toolbar-section" data-testid="tool-selection">
				<button
					className={`tool-btn ${state.currentTool === "selection" ? "active" : ""}`}
					onClick={() => handleToolClick("selection")}
					title="Selection Tool"
					data-testid="selection-tool-button"
				>
					<MousePointer size={16} />
				</button>

				<button
					className={`tool-btn ${state.currentTool === "envelope" ? "active" : ""}`}
					onClick={() => handleToolClick("envelope")}
					title="Envelope Tool"
					data-testid="envelope-tool-button"
				>
					<TrendingUp size={16} />
				</button>

				<button
					className={`tool-btn ${state.currentTool === "zoom" ? "active" : ""}`}
					onClick={() => handleToolClick("zoom")}
					title="Zoom Tool"
					data-testid="zoom-tool-button"
				>
					<ZoomIn size={16} />
				</button>

				<button
					className={`tool-btn ${state.currentTool === "timeshift" ? "active" : ""}`}
					onClick={() => handleToolClick("timeshift")}
					title="Time Shift Tool"
					data-testid="timeshift-tool-button"
				>
					<Move size={16} />
				</button>
			</div>

			{/* Zoom Controls */}
			<div className="toolbar-section" data-testid="zoom-controls">
				<button
					className="tool-btn"
					onClick={handleZoomIn}
					title="Zoom In"
					data-testid="zoom-in-button"
				>
					<ZoomIn size={16} />
				</button>

				<button
					className="tool-btn"
					onClick={handleZoomOut}
					title="Zoom Out"
					data-testid="zoom-out-button"
				>
					<ZoomOut size={16} />
				</button>

				<button
					className="tool-btn"
					onClick={handleZoomFit}
					title="Fit to Width"
					data-testid="zoom-fit-button"
				>
					<Maximize2 size={16} />
				</button>
			</div>

			{/* Volume Controls */}
			<div
				className="toolbar-section volume-section"
				data-testid="volume-controls"
			>
				<label>Recording Volume:</label>
				<input
					type="range"
					min="0"
					max="100"
					value={state.recordingVolume}
					onChange={(e) =>
						handleVolumeChange("recording", parseInt(e.target.value))
					}
					className="volume-slider"
				/>
				<span>{state.recordingVolume}%</span>
			</div>

			<div className="toolbar-section volume-section">
				<label>Playback Volume:</label>
				<input
					type="range"
					min="0"
					max="100"
					value={state.playbackVolume}
					onChange={(e) =>
						handleVolumeChange("playback", parseInt(e.target.value))
					}
					className="volume-slider"
				/>
				<span>{state.playbackVolume}%</span>
			</div>
		</div>
	);
};

export default Toolbar;
