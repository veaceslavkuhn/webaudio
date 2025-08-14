import { Volume2, ZoomIn, ZoomOut } from "lucide-react";
import React from "react";
import { useAudioActions, useAudioState } from "../context/AudioContext";

const StatusBar = () => {
	const state = useAudioState();
	const actions = useAudioActions();

	const formatTime = (seconds) => {
		if (seconds < 0) return "0:00.000";

		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toFixed(3).padStart(6, "0")}`;
		} else {
			return `${minutes}:${secs.toFixed(3).padStart(6, "0")}`;
		}
	};

	const formatFileSize = (bytes) => {
		if (!bytes) return "0 B";

		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return Math.round((bytes / 1024 ** i) * 10) / 10 + " " + sizes[i];
	};

	const getSelectionInfo = () => {
		if (!state.selection.start || !state.selection.end) {
			return null;
		}

		const duration = Math.abs(state.selection.end - state.selection.start);
		const start = Math.min(state.selection.start, state.selection.end);
		const end = Math.max(state.selection.start, state.selection.end);

		return { start, end, duration };
	};

	const selectionInfo = getSelectionInfo();

	return (
		<div className="status-bar" data-testid="status-bar">
			<div className="status-section" data-testid="project-info">
				<div className="status-item">
					<span className="status-label">Project Rate:</span>
					<span className="status-value">{state.sampleRate} Hz</span>
				</div>
			</div>

			<div className="status-section">
				<div className="status-item">
					<span className="status-label">Snap-To:</span>
					<select
						value={state.snapTo}
						onChange={(e) => actions.setSnapTo(e.target.value)}
						className="snap-selector"
					>
						<option value="off">Off</option>
						<option value="seconds">Seconds</option>
						<option value="samples">Samples</option>
						<option value="beats">Beats</option>
					</select>
				</div>
			</div>

			<div className="status-section">
				<div className="status-item audio-info">
					<Volume2 size={14} />
					<span className="status-value">
						Level: {state.isRecording ? "●" : "○"}
						{state.audioLevel ? `${Math.round(state.audioLevel * 100)}%` : "0%"}
					</span>
				</div>
			</div>

			{selectionInfo && (
				<div className="status-section selection-info">
					<div className="status-item">
						<span className="status-label">Selection:</span>
						<span className="status-value">
							{formatTime(selectionInfo.start)} -{" "}
							{formatTime(selectionInfo.end)}
						</span>
					</div>
					<div className="status-item">
						<span className="status-label">Length:</span>
						<span className="status-value">
							{formatTime(selectionInfo.duration)}
						</span>
					</div>
				</div>
			)}

			<div className="status-section">
				<div className="status-item">
					<span className="status-label">Cursor:</span>
					<span className="status-value">
						{formatTime(state.playheadPosition || 0)}
					</span>
				</div>
			</div>

			<div className="status-section">
				<div className="status-item">
					<span className="status-label">Tracks:</span>
					<span className="status-value">{state.tracks.length}</span>
				</div>
			</div>

			<div className="status-section zoom-controls">
				<button
					type="button"
					className="zoom-button"
					onClick={() =>
						actions.setZoomLevel(Math.max(0.1, state.zoomLevel / 1.5))
					}
					disabled={state.zoomLevel <= 0.1}
					title="Zoom Out"
				>
					<ZoomOut size={14} />
				</button>
				<span className="zoom-level">{Math.round(state.zoomLevel * 100)}%</span>
				<button
					type="button"
					className="zoom-button"
					onClick={() =>
						actions.setZoomLevel(Math.min(10, state.zoomLevel * 1.5))
					}
					disabled={state.zoomLevel >= 10}
					title="Zoom In"
				>
					<ZoomIn size={14} />
				</button>
			</div>

			<div className="status-section">
				<div className="status-item">
					<span className="status-label">Disk:</span>
					<span className="status-value">
						{formatFileSize(state.totalFileSize)} free
					</span>
				</div>
			</div>

			{state.isProcessing && (
				<div className="status-section processing-indicator">
					<div className="spinner" />
					<span className="status-value">Processing...</span>
				</div>
			)}

			{state.error && (
				<div className="status-section error-indicator">
					<span className="status-error">Error: {state.error}</span>
				</div>
			)}
		</div>
	);
};

export default StatusBar;
