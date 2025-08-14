import React, { useCallback, useEffect, useRef } from "react";
import { useAudioState } from "../context/AudioContext";

const Timeline = () => {
	const canvasRef = useRef(null);
	const state = useAudioState();

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

		// Set styles
		ctx.fillStyle = "#333";
		ctx.strokeStyle = "#666";
		ctx.font = "10px Arial";
		ctx.lineWidth = 1;

		// Calculate time range
		const pixelsPerSecond = 100 * state.zoomLevel;
		const startTime = state.scrollPosition / pixelsPerSecond;
		const endTime = startTime + width / pixelsPerSecond;

		// Calculate time intervals
		const duration = endTime - startTime;
		let interval = 1; // 1 second default

		if (duration > 3600)
			interval = 600; // 10 minutes
		else if (duration > 1800)
			interval = 300; // 5 minutes
		else if (duration > 600)
			interval = 60; // 1 minute
		else if (duration > 60)
			interval = 10; // 10 seconds
		else if (duration > 10)
			interval = 1; // 1 second
		else if (duration > 1)
			interval = 0.1; // 100ms
		else interval = 0.01; // 10ms

		// Draw time markers
		const startMark = Math.ceil(startTime / interval) * interval;

		for (let time = startMark; time <= endTime; time += interval) {
			const x = time * pixelsPerSecond - state.scrollPosition;

			if (x >= 0 && x <= width) {
				// Draw tick mark
				ctx.beginPath();
				ctx.moveTo(x, height - 10);
				ctx.lineTo(x, height);
				ctx.stroke();

				// Draw time label
				const timeStr = formatTime(time);
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
			if (time % interval !== 0) {
				// Skip major ticks
				const x = time * pixelsPerSecond - state.scrollPosition;

				if (x >= 0 && x <= width) {
					ctx.beginPath();
					ctx.moveTo(x, height - 5);
					ctx.lineTo(x, height);
					ctx.stroke();
				}
			}
		}
	}, [state.zoomLevel, state.scrollPosition, formatTime]);

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
		<div className="timeline" data-testid="timeline">
			<canvas
				ref={canvasRef}
				className="timeline-canvas"
				data-testid="timeline-canvas"
			/>
		</div>
	);
};

export default Timeline;
