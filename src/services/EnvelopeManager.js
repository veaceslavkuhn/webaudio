/**
 * Envelope and Automation Manager for WebAudacity
 * Manages volume automation curves and parameter automation over time
 */

export class EnvelopeManager {
	constructor() {
		this.envelopes = new Map(); // Map of parameter path to envelope data
		this.automationPoints = new Map(); // Map of automation point ID to point data
		this.nextPointId = 1;
		this.isPlaying = false;
		this.currentTime = 0;
		this.onEnvelopeChanged = null;
		this.snapToGrid = true;
		this.gridSize = 0.1; // seconds
	}

	/**
	 * Create a new envelope for a parameter
	 * @param {string} parameterPath - Parameter path (e.g., "track1.volume", "effect1.frequency")
	 * @param {Object} options - Envelope options
	 * @returns {string} - Envelope ID
	 */
	createEnvelope(parameterPath, options = {}) {
		const envelope = {
			id: parameterPath,
			parameterPath,
			points: new Map(),
			defaultValue: options.defaultValue || 0,
			minValue: options.minValue || 0,
			maxValue: options.maxValue || 1,
			interpolation: options.interpolation || "linear", // linear, exponential, logarithmic
			color: options.color || this.getDefaultEnvelopeColor(),
			visible: options.visible !== false,
			locked: options.locked || false,
			created: Date.now(),
		};

		this.envelopes.set(parameterPath, envelope);
		this.notifyEnvelopeChanged();
		return parameterPath;
	}

	/**
	 * Remove an envelope
	 * @param {string} parameterPath - Parameter path
	 * @returns {boolean} - Success status
	 */
	removeEnvelope(parameterPath) {
		const envelope = this.envelopes.get(parameterPath);
		if (!envelope) return false;

		// Remove all points for this envelope
		for (const pointId of envelope.points.keys()) {
			this.automationPoints.delete(pointId);
		}

		this.envelopes.delete(parameterPath);
		this.notifyEnvelopeChanged();
		return true;
	}

	/**
	 * Add an automation point to an envelope
	 * @param {string} parameterPath - Parameter path
	 * @param {number} time - Time in seconds
	 * @param {number} value - Parameter value
	 * @param {Object} options - Point options
	 * @returns {string|null} - Point ID or null if failed
	 */
	addAutomationPoint(parameterPath, time, value, options = {}) {
		const envelope = this.envelopes.get(parameterPath);
		if (!envelope || envelope.locked) return null;

		// Snap to grid if enabled
		if (this.snapToGrid) {
			time = Math.round(time / this.gridSize) * this.gridSize;
		}

		// Clamp value to envelope bounds
		value = Math.max(envelope.minValue, Math.min(envelope.maxValue, value));

		const pointId = `point_${this.nextPointId++}`;
		const point = {
			id: pointId,
			parameterPath,
			time,
			value,
			interpolation: options.interpolation || envelope.interpolation,
			selected: options.selected || false,
			locked: options.locked || false,
			created: Date.now(),
		};

		this.automationPoints.set(pointId, point);
		envelope.points.set(pointId, point);
		this.notifyEnvelopeChanged();
		return pointId;
	}

	/**
	 * Remove an automation point
	 * @param {string} pointId - Point ID
	 * @returns {boolean} - Success status
	 */
	removeAutomationPoint(pointId) {
		const point = this.automationPoints.get(pointId);
		if (!point) return false;

		const envelope = this.envelopes.get(point.parameterPath);
		if (envelope?.locked) return false;

		this.automationPoints.delete(pointId);
		if (envelope) {
			envelope.points.delete(pointId);
		}

		this.notifyEnvelopeChanged();
		return true;
	}

	/**
	 * Update automation point
	 * @param {string} pointId - Point ID
	 * @param {Object} updates - Updates to apply
	 * @returns {boolean} - Success status
	 */
	updateAutomationPoint(pointId, updates) {
		const point = this.automationPoints.get(pointId);
		if (!point || point.locked) return false;

		const envelope = this.envelopes.get(point.parameterPath);
		if (!envelope || envelope.locked) return false;

		// Validate updates
		if (updates.time !== undefined) {
			if (this.snapToGrid) {
				updates.time = Math.round(updates.time / this.gridSize) * this.gridSize;
			}
			if (updates.time < 0) return false;
		}

		if (updates.value !== undefined) {
			updates.value = Math.max(
				envelope.minValue,
				Math.min(envelope.maxValue, updates.value),
			);
		}

		// Apply updates
		Object.assign(point, updates);
		this.notifyEnvelopeChanged();
		return true;
	}

	/**
	 * Get automation value at specific time
	 * @param {string} parameterPath - Parameter path
	 * @param {number} time - Time in seconds
	 * @returns {number} - Interpolated value
	 */
	getValueAtTime(parameterPath, time) {
		const envelope = this.envelopes.get(parameterPath);
		if (!envelope) return 0;

		const points = Array.from(envelope.points.values()).sort(
			(a, b) => a.time - b.time,
		);

		if (points.length === 0) {
			return envelope.defaultValue;
		}

		// Before first point
		if (time <= points[0].time) {
			return points[0].value;
		}

		// After last point
		if (time >= points[points.length - 1].time) {
			return points[points.length - 1].value;
		}

		// Find surrounding points
		for (let i = 0; i < points.length - 1; i++) {
			const p1 = points[i];
			const p2 = points[i + 1];

			if (time >= p1.time && time <= p2.time) {
				return this.interpolateValue(p1, p2, time);
			}
		}

		return envelope.defaultValue;
	}

	/**
	 * Interpolate between two automation points
	 * @param {Object} point1 - First point
	 * @param {Object} point2 - Second point
	 * @param {number} time - Time to interpolate
	 * @returns {number} - Interpolated value
	 */
	interpolateValue(point1, point2, time) {
		const duration = point2.time - point1.time;
		if (duration === 0) return point1.value;

		const progress = (time - point1.time) / duration;
		const interpolation = point2.interpolation || "linear";

		switch (interpolation) {
			case "linear":
				return point1.value + (point2.value - point1.value) * progress;

			case "exponential": {
				const curve = 2; // Exponential curve factor
				const curvedProgress = progress ** curve;
				return point1.value + (point2.value - point1.value) * curvedProgress;
			}

			case "logarithmic": {
				const curve = 0.5; // Logarithmic curve factor
				const curvedProgress = progress ** curve;
				return point1.value + (point2.value - point1.value) * curvedProgress;
			}

			case "cubic": {
				// Smooth cubic interpolation
				const smooth = progress * progress * (3 - 2 * progress);
				return point1.value + (point2.value - point1.value) * smooth;
			}

			case "step":
				return progress < 1 ? point1.value : point2.value;

			default:
				return point1.value + (point2.value - point1.value) * progress;
		}
	}

	/**
	 * Get all automation points for an envelope
	 * @param {string} parameterPath - Parameter path
	 * @returns {Array} - Array of points sorted by time
	 */
	getEnvelopePoints(parameterPath) {
		const envelope = this.envelopes.get(parameterPath);
		if (!envelope) return [];

		return Array.from(envelope.points.values()).sort((a, b) => a.time - b.time);
	}

	/**
	 * Select automation points in a time range
	 * @param {string} parameterPath - Parameter path
	 * @param {number} startTime - Start time
	 * @param {number} endTime - End time
	 * @returns {Array} - Array of selected point IDs
	 */
	selectPointsInRange(parameterPath, startTime, endTime) {
		const points = this.getEnvelopePoints(parameterPath);
		const selectedIds = [];

		for (const point of points) {
			if (point.time >= startTime && point.time <= endTime) {
				point.selected = true;
				selectedIds.push(point.id);
			}
		}

		this.notifyEnvelopeChanged();
		return selectedIds;
	}

	/**
	 * Clear selection for an envelope
	 * @param {string} parameterPath - Parameter path
	 */
	clearSelection(parameterPath) {
		const envelope = this.envelopes.get(parameterPath);
		if (!envelope) return;

		for (const point of envelope.points.values()) {
			point.selected = false;
		}

		this.notifyEnvelopeChanged();
	}

	/**
	 * Delete selected points
	 * @param {string} parameterPath - Parameter path
	 * @returns {number} - Number of points deleted
	 */
	deleteSelectedPoints(parameterPath) {
		const envelope = this.envelopes.get(parameterPath);
		if (!envelope || envelope.locked) return 0;

		let deletedCount = 0;
		const pointsToDelete = [];

		for (const point of envelope.points.values()) {
			if (point.selected && !point.locked) {
				pointsToDelete.push(point.id);
			}
		}

		for (const pointId of pointsToDelete) {
			if (this.removeAutomationPoint(pointId)) {
				deletedCount++;
			}
		}

		return deletedCount;
	}

	/**
	 * Scale envelope values
	 * @param {string} parameterPath - Parameter path
	 * @param {number} factor - Scale factor
	 * @param {boolean} selectedOnly - Scale only selected points
	 * @returns {boolean} - Success status
	 */
	scaleEnvelope(parameterPath, factor, selectedOnly = false) {
		const envelope = this.envelopes.get(parameterPath);
		if (!envelope || envelope.locked) return false;

		for (const point of envelope.points.values()) {
			if (!selectedOnly || point.selected) {
				if (!point.locked) {
					const newValue = point.value * factor;
					point.value = Math.max(
						envelope.minValue,
						Math.min(envelope.maxValue, newValue),
					);
				}
			}
		}

		this.notifyEnvelopeChanged();
		return true;
	}

	/**
	 * Smooth envelope using averaging
	 * @param {string} parameterPath - Parameter path
	 * @param {number} strength - Smoothing strength (0-1)
	 * @returns {boolean} - Success status
	 */
	smoothEnvelope(parameterPath, strength = 0.5) {
		const envelope = this.envelopes.get(parameterPath);
		if (!envelope || envelope.locked) return false;

		const points = this.getEnvelopePoints(parameterPath);
		if (points.length < 3) return false;

		// Apply smoothing to interior points
		for (let i = 1; i < points.length - 1; i++) {
			const point = points[i];
			if (point.locked) continue;

			const prevValue = points[i - 1].value;
			const nextValue = points[i + 1].value;
			const avgValue = (prevValue + nextValue) / 2;

			point.value = point.value + (avgValue - point.value) * strength;
			point.value = Math.max(
				envelope.minValue,
				Math.min(envelope.maxValue, point.value),
			);
		}

		this.notifyEnvelopeChanged();
		return true;
	}

	/**
	 * Copy envelope points to clipboard
	 * @param {string} parameterPath - Parameter path
	 * @param {boolean} selectedOnly - Copy only selected points
	 * @returns {Object} - Clipboard data
	 */
	copyEnvelopePoints(parameterPath, selectedOnly = false) {
		const points = this.getEnvelopePoints(parameterPath);
		const pointsToCopy = selectedOnly
			? points.filter((p) => p.selected)
			: points;

		return {
			type: "envelopePoints",
			parameterPath,
			points: pointsToCopy.map((p) => ({
				time: p.time,
				value: p.value,
				interpolation: p.interpolation,
			})),
			copied: Date.now(),
		};
	}

	/**
	 * Paste envelope points from clipboard
	 * @param {string} parameterPath - Parameter path
	 * @param {Object} clipboardData - Clipboard data
	 * @param {number} timeOffset - Time offset for pasted points
	 * @returns {number} - Number of points pasted
	 */
	pasteEnvelopePoints(parameterPath, clipboardData, timeOffset = 0) {
		if (!clipboardData || clipboardData.type !== "envelopePoints") return 0;

		const envelope = this.envelopes.get(parameterPath);
		if (!envelope || envelope.locked) return 0;

		let pastedCount = 0;

		for (const pointData of clipboardData.points) {
			const time = pointData.time + timeOffset;
			if (time >= 0) {
				this.addAutomationPoint(parameterPath, time, pointData.value, {
					interpolation: pointData.interpolation,
				});
				pastedCount++;
			}
		}

		return pastedCount;
	}

	/**
	 * Generate envelope from audio analysis
	 * @param {string} parameterPath - Parameter path
	 * @param {AudioBuffer} audioBuffer - Audio to analyze
	 * @param {Object} options - Generation options
	 * @returns {boolean} - Success status
	 */
	generateFromAudio(parameterPath, audioBuffer, options = {}) {
		const envelope = this.envelopes.get(parameterPath);
		if (!envelope || envelope.locked) return false;

		const analysisType = options.analysisType || "amplitude"; // amplitude, rms, spectral
		const resolution = options.resolution || 0.1; // seconds between points
		const channelData = audioBuffer.getChannelData(0);
		const sampleRate = audioBuffer.sampleRate;

		// Clear existing points
		for (const pointId of envelope.points.keys()) {
			this.removeAutomationPoint(pointId);
		}

		const samplesPerPoint = Math.floor(resolution * sampleRate);
		const numPoints = Math.floor(channelData.length / samplesPerPoint);

		for (let i = 0; i < numPoints; i++) {
			const startSample = i * samplesPerPoint;
			const endSample = Math.min(
				startSample + samplesPerPoint,
				channelData.length,
			);
			const time = startSample / sampleRate;

			let value = 0;

			switch (analysisType) {
				case "amplitude": {
					// Peak amplitude in this window
					for (let j = startSample; j < endSample; j++) {
						value = Math.max(value, Math.abs(channelData[j]));
					}
					break;
				}

				case "rms": {
					// RMS value in this window
					let sum = 0;
					for (let j = startSample; j < endSample; j++) {
						sum += channelData[j] * channelData[j];
					}
					value = Math.sqrt(sum / (endSample - startSample));
					break;
				}

				default:
					value = envelope.defaultValue;
			}

			// Scale to envelope range
			value =
				envelope.minValue + (envelope.maxValue - envelope.minValue) * value;
			this.addAutomationPoint(parameterPath, time, value);
		}

		return true;
	}

	/**
	 * Get all envelopes
	 * @returns {Array} - Array of envelope objects
	 */
	getAllEnvelopes() {
		return Array.from(this.envelopes.values());
	}

	/**
	 * Get envelope by parameter path
	 * @param {string} parameterPath - Parameter path
	 * @returns {Object|null} - Envelope object or null
	 */
	getEnvelope(parameterPath) {
		return this.envelopes.get(parameterPath) || null;
	}

	/**
	 * Set grid snap settings
	 * @param {boolean} enabled - Enable grid snap
	 * @param {number} size - Grid size in seconds
	 */
	setGridSnap(enabled, size = 0.1) {
		this.snapToGrid = enabled;
		this.gridSize = Math.max(0.001, size); // Minimum 1ms grid
	}

	/**
	 * Get default envelope color
	 * @returns {string} - CSS color
	 */
	getDefaultEnvelopeColor() {
		const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FECA57"];
		return colors[this.envelopes.size % colors.length];
	}

	/**
	 * Set callback for envelope changes
	 * @param {Function} callback - Callback function
	 */
	setOnEnvelopeChanged(callback) {
		this.onEnvelopeChanged = callback;
	}

	/**
	 * Notify listeners of envelope changes
	 */
	notifyEnvelopeChanged() {
		if (this.onEnvelopeChanged) {
			this.onEnvelopeChanged(this.getAllEnvelopes());
		}
	}

	/**
	 * Export envelopes to JSON
	 * @returns {string} - JSON string
	 */
	exportEnvelopes() {
		const exportData = {
			version: "1.0",
			envelopes: [],
			exported: Date.now(),
		};

		for (const envelope of this.envelopes.values()) {
			const points = Array.from(envelope.points.values());
			exportData.envelopes.push({
				parameterPath: envelope.parameterPath,
				defaultValue: envelope.defaultValue,
				minValue: envelope.minValue,
				maxValue: envelope.maxValue,
				interpolation: envelope.interpolation,
				points: points.map((p) => ({
					time: p.time,
					value: p.value,
					interpolation: p.interpolation,
				})),
			});
		}

		return JSON.stringify(exportData, null, 2);
	}

	/**
	 * Import envelopes from JSON
	 * @param {string} jsonData - JSON string
	 * @returns {number} - Number of envelopes imported
	 */
	importEnvelopes(jsonData) {
		try {
			const data = JSON.parse(jsonData);
			let importedCount = 0;

			if (data.envelopes && Array.isArray(data.envelopes)) {
				for (const envelopeData of data.envelopes) {
					this.createEnvelope(envelopeData.parameterPath, {
						defaultValue: envelopeData.defaultValue,
						minValue: envelopeData.minValue,
						maxValue: envelopeData.maxValue,
						interpolation: envelopeData.interpolation,
					});

					if (envelopeData.points) {
						for (const pointData of envelopeData.points) {
							this.addAutomationPoint(
								envelopeData.parameterPath,
								pointData.time,
								pointData.value,
								{ interpolation: pointData.interpolation },
							);
						}
					}

					importedCount++;
				}
			}

			return importedCount;
		} catch (error) {
			console.error("Failed to import envelopes:", error);
			return 0;
		}
	}

	/**
	 * Clear all envelopes and automation points
	 */
	clearAll() {
		this.envelopes.clear();
		this.automationPoints.clear();
		this.nextPointId = 1;
		this.notifyEnvelopeChanged();
	}
}

export default EnvelopeManager;
