import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAudioActions, useAudioState } from "../context/AudioContext";

const TrackPanel = ({ track }) => {
	const canvasRef = useRef(null);
	const containerRef = useRef(null);
	const state = useAudioState();
	const actions = useAudioActions();
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState(null);

	const resizeCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) return;

		const rect = container.getBoundingClientRect();
		canvas.width = rect.width * window.devicePixelRatio;
		canvas.height = rect.height * window.devicePixelRatio;
		canvas.style.width = rect.width + "px";
		canvas.style.height = rect.height + "px";

		const ctx = canvas.getContext("2d");
		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
	}, []);

	const handleMouseDown = useCallback(
		(e) => {
			const rect = canvasRef.current.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const pixelsPerSecond = 100 * state.zoomLevel;
			const time = (x + state.scrollPosition) / pixelsPerSecond;

			setIsDragging(true);
			setDragStart(time);

			// Select this track
			actions.selectTrack(track.id);

			// Start selection
			actions.setSelection({ start: time, end: time });
		},
		[state.zoomLevel, state.scrollPosition, actions, track.id],
	);

	const handleMouseMove = useCallback(
		(e) => {
			if (!isDragging || !dragStart) return;

			const rect = canvasRef.current.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const pixelsPerSecond = 100 * state.zoomLevel;
			const time = (x + state.scrollPosition) / pixelsPerSecond;

			// Update selection
			const start = Math.min(dragStart, time);
			const end = Math.max(dragStart, time);
			actions.setSelection({ start, end });
		},
		[isDragging, dragStart, state.zoomLevel, state.scrollPosition, actions],
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
		setDragStart(null);
	}, []);

	const handleDoubleClick = useCallback(
		(e) => {
			const rect = canvasRef.current.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const pixelsPerSecond = 100 * state.zoomLevel;
			const time = (x + state.scrollPosition) / pixelsPerSecond;

			// Move playhead to clicked position
			actions.setPlayheadPosition(time);
		},
		[state.zoomLevel, state.scrollPosition, actions],
	);

	useEffect(() => {
		const handleMouseMoveGlobal = (e) => handleMouseMove(e);
		const handleMouseUpGlobal = () => handleMouseUp();

		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMoveGlobal);
			document.addEventListener("mouseup", handleMouseUpGlobal);
		}

		return () => {
			document.removeEventListener("mousemove", handleMouseMoveGlobal);
			document.removeEventListener("mouseup", handleMouseUpGlobal);
		};
	}, [isDragging, handleMouseMove, handleMouseUp]);

	useEffect(() => {
		resizeCanvas();
	}, [resizeCanvas]);

	useEffect(() => {
		const handleResize = () => resizeCanvas();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [resizeCanvas]);

	return (
		<div
			className={`track-panel ${state.selectedTrackId === track.id ? "selected" : ""}`}
			data-testid={`track-panel-${track.id}`}
		>
			<div className="track-header" data-testid={`track-header-${track.id}`}>
				<div
					className="track-controls"
					data-testid={`track-controls-${track.id}`}
				>
					<button
						type="button"
						className="track-solo"
						onClick={() => actions.toggleTrackSolo(track.id)}
						disabled={!track.audioBuffer}
						aria-label={`${track.solo ? "Unsolo" : "Solo"} track ${track.name}`}
						data-testid={`track-solo-${track.id}`}
					>
						S
					</button>
					<button
						type="button"
						className="track-mute"
						onClick={() => actions.toggleTrackMute(track.id)}
						disabled={!track.audioBuffer}
						aria-label={`${track.mute ? "Unmute" : "Mute"} track ${track.name}`}
						data-testid={`track-mute-${track.id}`}
					>
						M
					</button>
				</div>
				<div className="track-info" data-testid={`track-info-${track.id}`}>
					<div className="track-name">{track.name}</div>
					<div className="track-format">
						{track.audioBuffer
							? `${track.audioBuffer.sampleRate}Hz, ${track.audioBuffer.numberOfChannels} channel${track.audioBuffer.numberOfChannels > 1 ? "s" : ""}`
							: "No audio"}
					</div>
				</div>
				<div className="track-volume" data-testid={`track-volume-${track.id}`}>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={track.gain}
						onChange={(e) =>
							actions.setTrackGain(track.id, parseFloat(e.target.value))
						}
						className="volume-slider"
						aria-label={`Volume for track ${track.name}`}
						data-testid={`track-volume-slider-${track.id}`}
					/>
					<span className="volume-value">{Math.round(track.gain * 100)}%</span>
				</div>
			</div>
			<div
				ref={containerRef}
				className="track-waveform-container"
				data-testid={`track-waveform-container-${track.id}`}
			>
				<canvas
					ref={canvasRef}
					className="track-waveform"
					onMouseDown={handleMouseDown}
					onDoubleClick={handleDoubleClick}
					style={{ cursor: isDragging ? "text" : "crosshair" }}
					data-testid={`track-waveform-${track.id}`}
				/>
				{/* Playhead indicator */}
				{state.playheadPosition >= 0 && (
					<div
						className="playhead"
						style={{
							left: `${state.playheadPosition * 100 * state.zoomLevel - state.scrollPosition}px`,
						}}
					/>
				)}
				{/* Selection overlay */}
				{state.selection.start !== null && state.selection.end !== null && (
					<div
						className="selection-overlay"
						style={{
							left: `${state.selection.start * 100 * state.zoomLevel - state.scrollPosition}px`,
							width: `${(state.selection.end - state.selection.start) * 100 * state.zoomLevel}px`,
						}}
					/>
				)}
			</div>
		</div>
	);
};

export default TrackPanel;
