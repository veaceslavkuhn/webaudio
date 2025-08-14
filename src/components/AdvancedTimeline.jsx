import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAudioActions, useAudioState } from "../context/AudioContext";

const AdvancedTimeline = () => {
	const canvasRef = useRef(null);
	const state = useAudioState();
	const actions = useAudioActions();

	// Advanced timeline state
	const [snapToGrid, setSnapToGrid] = useState(true);
	const [gridSize, setGridSize] = useState(1); // seconds
	const [loopRegion, setLoopRegion] = useState({ start: null, end: null });
	const [timeSignature, setTimeSignature] = useState({
		numerator: 4,
		denominator: 4,
	});
	const [bpm, setBpm] = useState(120);
	const [showBeats, setShowBeats] = useState(true);

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

	const formatBeatTime = useCallback(
		(seconds) => {
			const { numerator } = timeSignature;
			const beatDuration = 60 / bpm; // seconds per beat
			const measureDuration = beatDuration * numerator; // seconds per measure

			const measures = Math.floor(seconds / measureDuration);
			const remainingSeconds = seconds % measureDuration;
			const beats = Math.floor(remainingSeconds / beatDuration);
			const subBeats = Math.floor(
				(remainingSeconds % beatDuration) / (beatDuration / 4),
			);

			return `${measures + 1}.${beats + 1}.${subBeats + 1}`;
		},
		[bpm, timeSignature],
	);

	const snapToGridValue = useCallback(
		(time) => {
			if (!snapToGrid) return time;

			if (showBeats) {
				const beatDuration = 60 / bpm;
				return Math.round(time / beatDuration) * beatDuration;
			} else {
				return Math.round(time / gridSize) * gridSize;
			}
		},
		[snapToGrid, gridSize, bpm, showBeats],
	);

	const resizeCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width * window.devicePixelRatio;
		canvas.height = rect.height * window.devicePixelRatio;
		canvas.style.width = rect.width + "px";
		canvas.style.height = rect.height + "px";

		const ctx = canvas.getContext("2d");
		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
	}, []);

	const drawTimeline = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		const rect = canvas.getBoundingClientRect();
		const width = rect.width;
		const height = rect.height;

		// Clear timeline
		ctx.clearRect(0, 0, width, height);

		// Background
		ctx.fillStyle = "#2a2a2a";
		ctx.fillRect(0, 0, width, height);

		// Set styles
		ctx.strokeStyle = "#666";
		ctx.font = "10px Arial";
		ctx.lineWidth = 1;

		// Calculate time range
		const pixelsPerSecond = 100 * state.zoomLevel;
		const startTime = state.scrollPosition / pixelsPerSecond;
		const endTime = startTime + width / pixelsPerSecond;

		// Draw loop region background
		if (loopRegion.start !== null && loopRegion.end !== null) {
			const loopStartX = (loopRegion.start - startTime) * pixelsPerSecond;
			const loopEndX = (loopRegion.end - startTime) * pixelsPerSecond;

			if (loopEndX > 0 && loopStartX < width) {
				ctx.fillStyle = "rgba(0, 255, 136, 0.1)";
				ctx.fillRect(
					Math.max(0, loopStartX),
					0,
					Math.min(width, loopEndX) - Math.max(0, loopStartX),
					height,
				);

				// Loop region borders
				ctx.strokeStyle = "#00ff88";
				ctx.lineWidth = 2;
				if (loopStartX >= 0 && loopStartX <= width) {
					ctx.beginPath();
					ctx.moveTo(loopStartX, 0);
					ctx.lineTo(loopStartX, height);
					ctx.stroke();
				}
				if (loopEndX >= 0 && loopEndX <= width) {
					ctx.beginPath();
					ctx.moveTo(loopEndX, 0);
					ctx.lineTo(loopEndX, height);
					ctx.stroke();
				}
			}
		}

		// Draw time markings
		let interval;
		if (showBeats) {
			interval = 60 / bpm; // Beat interval in seconds
		} else {
			// Dynamic interval based on zoom
			if (pixelsPerSecond > 200) interval = 0.1;
			else if (pixelsPerSecond > 100) interval = 0.5;
			else if (pixelsPerSecond > 50) interval = 1;
			else if (pixelsPerSecond > 20) interval = 5;
			else if (pixelsPerSecond > 10) interval = 10;
			else interval = 30;
		}

		const startMark = Math.floor(startTime / interval) * interval;

		ctx.strokeStyle = "#666";
		ctx.fillStyle = "#ccc";
		ctx.lineWidth = 1;

		for (let time = startMark; time <= endTime; time += interval) {
			const x = (time - startTime) * pixelsPerSecond;

			if (x >= 0 && x <= width) {
				// Draw tick mark
				const isMainTick = showBeats
					? Math.round(time / ((60 / bpm) * timeSignature.numerator)) *
							((60 / bpm) * timeSignature.numerator) ===
						time
					: time % (interval * 5) === 0;

				const tickHeight = isMainTick ? height * 0.4 : height * 0.2;

				ctx.beginPath();
				ctx.moveTo(x, height);
				ctx.lineTo(x, height - tickHeight);
				ctx.stroke();

				// Draw time label
				if (isMainTick) {
					const label = showBeats ? formatBeatTime(time) : formatTime(time);
					const metrics = ctx.measureText(label);
					ctx.fillText(label, x - metrics.width / 2, height - tickHeight - 5);
				}
			}
		}

		// Draw grid lines if snap is enabled
		if (snapToGrid) {
			ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
			ctx.lineWidth = 1;

			const gridInterval = showBeats ? 60 / bpm : gridSize;
			const startGrid = Math.floor(startTime / gridInterval) * gridInterval;

			for (let time = startGrid; time <= endTime; time += gridInterval) {
				const x = (time - startTime) * pixelsPerSecond;

				if (x >= 0 && x <= width) {
					ctx.beginPath();
					ctx.moveTo(x, 0);
					ctx.lineTo(x, height);
					ctx.stroke();
				}
			}
		}

		// Draw playhead
		if (state.playheadPosition >= 0) {
			const playheadX = (state.playheadPosition - startTime) * pixelsPerSecond;
			if (playheadX >= 0 && playheadX <= width) {
				ctx.strokeStyle = "#ff4444";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(playheadX, 0);
				ctx.lineTo(playheadX, height);
				ctx.stroke();
			}
		}

		// Draw border
		ctx.strokeStyle = "#444";
		ctx.lineWidth = 1;
		ctx.strokeRect(0, 0, width, height);
	}, [
		state,
		loopRegion,
		snapToGrid,
		gridSize,
		timeSignature,
		bpm,
		showBeats,
		formatTime,
		formatBeatTime,
	]);

	const handleCanvasClick = useCallback(
		(e) => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const pixelsPerSecond = 100 * state.zoomLevel;
			const startTime = state.scrollPosition / pixelsPerSecond;
			const clickTime = startTime + x / pixelsPerSecond;

			const snappedTime = snapToGridValue(clickTime);
			actions.setPlayheadPosition(snappedTime);
		},
		[state.zoomLevel, state.scrollPosition, snapToGridValue, actions],
	);

	const handleLoopRegionSet = useCallback(
		(startTime, endTime) => {
			setLoopRegion({
				start: snapToGridValue(startTime),
				end: snapToGridValue(endTime),
			});
		},
		[snapToGridValue],
	);

	const clearLoopRegion = useCallback(() => {
		setLoopRegion({ start: null, end: null });
	}, []);

	useEffect(() => {
		resizeCanvas();
		drawTimeline();
	}, [resizeCanvas, drawTimeline]);

	useEffect(() => {
		const handleResize = () => {
			resizeCanvas();
			drawTimeline();
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [resizeCanvas, drawTimeline]);

	return (
		<div className="advanced-timeline" data-testid="advanced-timeline">
			<div className="timeline-controls" data-testid="timeline-controls">
				<div
					className="timeline-control-group"
					data-testid="timeline-general-controls"
				>
					<label>
						<input
							type="checkbox"
							checked={snapToGrid}
							onChange={(e) => setSnapToGrid(e.target.checked)}
							data-testid="snap-to-grid-checkbox"
						/>
						Snap to Grid
					</label>

					<label>
						<input
							type="checkbox"
							checked={showBeats}
							onChange={(e) => setShowBeats(e.target.checked)}
							data-testid="show-beats-checkbox"
						/>
						Show Beats
					</label>
				</div>

				{!showBeats && (
					<div
						className="timeline-control-group"
						data-testid="timeline-grid-controls"
					>
						<label>
							Grid Size:
							<select
								value={gridSize}
								onChange={(e) => setGridSize(parseFloat(e.target.value))}
								data-testid="grid-size-select"
							>
								<option value={0.1}>0.1s</option>
								<option value={0.5}>0.5s</option>
								<option value={1}>1s</option>
								<option value={5}>5s</option>
							</select>
						</label>
					</div>
				)}

				{showBeats && (
					<div
						className="timeline-control-group"
						data-testid="timeline-beat-controls"
					>
						<label>
							BPM:
							<input
								type="number"
								value={bpm}
								onChange={(e) => setBpm(parseInt(e.target.value))}
								min="60"
								max="200"
								style={{ width: "60px" }}
								data-testid="bpm-input"
							/>
						</label>

						<label>
							Time Sig:
							<select
								value={`${timeSignature.numerator}/${timeSignature.denominator}`}
								onChange={(e) => {
									const [num, den] = e.target.value.split("/").map(Number);
									setTimeSignature({ numerator: num, denominator: den });
								}}
								data-testid="time-signature-select"
							>
								<option value="4/4">4/4</option>
								<option value="3/4">3/4</option>
								<option value="2/4">2/4</option>
								<option value="6/8">6/8</option>
							</select>
						</label>
					</div>
				)}

				<div
					className="timeline-control-group"
					data-testid="timeline-loop-controls"
				>
					<button
						type="button"
						className="button small"
						onClick={() => {
							const start = state.selection?.start || 0;
							const end = state.selection?.end || state.totalDuration || 10;
							handleLoopRegionSet(start, end);
						}}
						disabled={!state.selection?.start || !state.selection?.end}
						data-testid="set-loop-button"
					>
						Set Loop
					</button>

					<button
						type="button"
						className="button small"
						onClick={clearLoopRegion}
						disabled={!loopRegion.start && !loopRegion.end}
						data-testid="clear-loop-button"
					>
						Clear Loop
					</button>
				</div>
			</div>

			<canvas
				ref={canvasRef}
				className="timeline-canvas"
				onClick={handleCanvasClick}
				style={{
					width: "100%",
					height: "60px",
					cursor: "crosshair",
					display: "block",
				}}
				data-testid="advanced-timeline-canvas"
			/>
		</div>
	);
};

export default AdvancedTimeline;
