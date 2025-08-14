/**
 * Label Track Manager for WebAudacity
 * Manages text annotations and markers on the timeline
 */

export class LabelTrackManager {
	constructor() {
		this.labels = new Map(); // Map of label ID to label data
		this.nextId = 1;
		this.onLabelsChanged = null;
	}

	/**
	 * Add a new label at a specific time
	 * @param {number} time - Time position in seconds
	 * @param {string} text - Label text
	 * @param {number} [endTime] - End time for region labels (optional)
	 * @returns {string} - Label ID
	 */
	addLabel(time, text = "", endTime = null) {
		const id = `label_${this.nextId++}`;
		const label = {
			id,
			time,
			endTime,
			text,
			type: endTime !== null ? "region" : "point",
			created: Date.now(),
			color: this.getDefaultColor(this.labels.size),
		};

		this.labels.set(id, label);
		this.notifyLabelsChanged();
		return id;
	}

	/**
	 * Remove a label by ID
	 * @param {string} labelId - Label ID to remove
	 * @returns {boolean} - Success status
	 */
	removeLabel(labelId) {
		const success = this.labels.delete(labelId);
		if (success) {
			this.notifyLabelsChanged();
		}
		return success;
	}

	/**
	 * Update label properties
	 * @param {string} labelId - Label ID
	 * @param {Object} updates - Properties to update
	 * @returns {boolean} - Success status
	 */
	updateLabel(labelId, updates) {
		const label = this.labels.get(labelId);
		if (!label) return false;

		// Validate updates
		if (updates.time !== undefined && updates.time < 0) {
			throw new Error("Label time cannot be negative");
		}

		if (updates.endTime !== undefined && updates.time !== undefined && updates.endTime <= updates.time) {
			throw new Error("End time must be greater than start time");
		}

		// Apply updates
		Object.assign(label, updates);

		// Update type based on endTime
		if (updates.endTime !== undefined) {
			label.type = updates.endTime !== null ? "region" : "point";
		}

		this.notifyLabelsChanged();
		return true;
	}

	/**
	 * Get label by ID
	 * @param {string} labelId - Label ID
	 * @returns {Object|null} - Label object or null
	 */
	getLabel(labelId) {
		return this.labels.get(labelId) || null;
	}

	/**
	 * Get all labels sorted by time
	 * @returns {Array} - Array of label objects
	 */
	getAllLabels() {
		return Array.from(this.labels.values()).sort((a, b) => a.time - b.time);
	}

	/**
	 * Get labels in a time range
	 * @param {number} startTime - Start time in seconds
	 * @param {number} endTime - End time in seconds
	 * @returns {Array} - Array of labels in range
	 */
	getLabelsInRange(startTime, endTime) {
		return this.getAllLabels().filter(label => {
			// Point labels
			if (label.type === "point") {
				return label.time >= startTime && label.time <= endTime;
			}
			// Region labels (check for overlap)
			else {
				const labelEnd = label.endTime || label.time;
				return !(labelEnd < startTime || label.time > endTime);
			}
		});
	}

	/**
	 * Find label at specific time with tolerance
	 * @param {number} time - Time to search
	 * @param {number} tolerance - Time tolerance in seconds
	 * @returns {Object|null} - Found label or null
	 */
	findLabelAtTime(time, tolerance = 0.1) {
		for (const label of this.labels.values()) {
			if (label.type === "point") {
				if (Math.abs(label.time - time) <= tolerance) {
					return label;
				}
			} else {
				// Region label
				if (time >= label.time && time <= (label.endTime || label.time)) {
					return label;
				}
			}
		}
		return null;
	}

	/**
	 * Export labels to file format
	 * @param {string} format - Export format ("audacity", "csv", "json")
	 * @returns {string} - Exported data
	 */
	exportLabels(format = "audacity") {
		const labels = this.getAllLabels();

		switch (format.toLowerCase()) {
			case "audacity":
				return labels.map(label => {
					if (label.type === "point") {
						return `${label.time.toFixed(6)}\t${label.time.toFixed(6)}\t${label.text}`;
					} else {
						return `${label.time.toFixed(6)}\t${label.endTime.toFixed(6)}\t${label.text}`;
					}
				}).join('\n');

			case "csv": {
				const csvHeader = "Time,EndTime,Text,Type\n";
				const csvRows = labels.map(label => {
					const endTime = label.endTime || label.time;
					return `${label.time},${endTime},"${label.text}",${label.type}`;
				}).join('\n');
				return csvHeader + csvRows;
			}

			case "json":
				return JSON.stringify(labels, null, 2);

			default:
				throw new Error(`Unsupported export format: ${format}`);
		}
	}

	/**
	 * Import labels from file data
	 * @param {string} data - File data
	 * @param {string} format - Import format
	 * @returns {number} - Number of labels imported
	 */
	importLabels(data, format = "audacity") {
		let importedCount = 0;

		switch (format.toLowerCase()) {
			case "audacity": {
				const lines = data.trim().split('\n');
				for (const line of lines) {
					if (line.trim()) {
						const parts = line.split('\t');
						if (parts.length >= 3) {
							const startTime = parseFloat(parts[0]);
							const endTime = parseFloat(parts[1]);
							const text = parts[2] || "";

							// If start and end are the same, it's a point label
							if (Math.abs(startTime - endTime) < 0.001) {
								this.addLabel(startTime, text);
							} else {
								this.addLabel(startTime, text, endTime);
							}
							importedCount++;
						}
					}
				}
				break;
			}

			case "json": {
				const labelData = JSON.parse(data);
				if (Array.isArray(labelData)) {
					for (const label of labelData) {
						if (label.time !== undefined) {
							this.addLabel(label.time, label.text || "", label.endTime);
							importedCount++;
						}
					}
				}
				break;
			}

			default:
				throw new Error(`Unsupported import format: ${format}`);
		}

		return importedCount;
	}

	/**
	 * Clear all labels
	 */
	clearAllLabels() {
		this.labels.clear();
		this.notifyLabelsChanged();
	}

	/**
	 * Get label statistics
	 * @returns {Object} - Statistics object
	 */
	getStatistics() {
		const labels = this.getAllLabels();
		return {
			total: labels.length,
			pointLabels: labels.filter(l => l.type === "point").length,
			regionLabels: labels.filter(l => l.type === "region").length,
			totalDuration: labels.length > 0 ? 
				Math.max(...labels.map(l => l.endTime || l.time)) - 
				Math.min(...labels.map(l => l.time)) : 0,
		};
	}

	/**
	 * Get default color for new labels
	 * @param {number} index - Label index
	 * @returns {string} - CSS color
	 */
	getDefaultColor(index) {
		const colors = [
			"#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", 
			"#FECA57", "#FF9FF3", "#54A0FF", "#5F27CD"
		];
		return colors[index % colors.length];
	}

	/**
	 * Set callback for label changes
	 * @param {Function} callback - Callback function
	 */
	setOnLabelsChanged(callback) {
		this.onLabelsChanged = callback;
	}

	/**
	 * Notify listeners of label changes
	 */
	notifyLabelsChanged() {
		if (this.onLabelsChanged) {
			this.onLabelsChanged(this.getAllLabels());
		}
	}

	/**
	 * Snap time to nearest label
	 * @param {number} time - Input time
	 * @param {number} snapTolerance - Snap tolerance in seconds
	 * @returns {number} - Snapped time
	 */
	snapToLabel(time, snapTolerance = 0.1) {
		let closestTime = time;
		let minDistance = snapTolerance;

		for (const label of this.labels.values()) {
			// Check start time
			const startDistance = Math.abs(label.time - time);
			if (startDistance < minDistance) {
				minDistance = startDistance;
				closestTime = label.time;
			}

			// Check end time for region labels
			if (label.endTime !== null) {
				const endDistance = Math.abs(label.endTime - time);
				if (endDistance < minDistance) {
					minDistance = endDistance;
					closestTime = label.endTime;
				}
			}
		}

		return closestTime;
	}
}

export default LabelTrackManager;
