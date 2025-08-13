/**
 * Audio Commands for Undo/Redo System
 * Specific command implementations for audio editing operations
 */

import { Command } from './UndoRedoManager.js';

/**
 * Add Track Command
 */
export class AddTrackCommand extends Command {
	constructor(audioContext, trackData) {
		super(`Add track "${trackData?.name || 'Untitled'}"`);
		this.audioContext = audioContext;
		this.trackData = trackData;
		this.addedTrackId = null;
	}

	execute() {
		const result = this.audioContext.addTrack(this.trackData);
		if (result?.track) {
			this.addedTrackId = result.track.id;
		}
		return result;
	}

	undo() {
		if (this.addedTrackId) {
			return this.audioContext.removeTrack(this.addedTrackId);
		}
		return false;
	}
}

/**
 * Remove Track Command
 */
export class RemoveTrackCommand extends Command {
	constructor(audioContext, trackId) {
		super(`Remove track`);
		this.audioContext = audioContext;
		this.trackId = trackId;
		this.removedTrack = null;
		this.trackIndex = -1;
	}

	execute() {
		// Save track data before removing
		const track = this.audioContext.state.tracks.find(t => t.id === this.trackId);
		if (track) {
			this.removedTrack = { ...track };
			this.trackIndex = this.audioContext.state.tracks.findIndex(t => t.id === this.trackId);
			this.description = `Remove track "${track.name}"`;
		}
		
		return this.audioContext.removeTrack(this.trackId);
	}

	undo() {
		if (this.removedTrack) {
			// Re-add the track at its original position
			const result = this.audioContext.addTrack(this.removedTrack);
			if (result && this.trackIndex >= 0) {
				// Move to original position if needed
				this.audioContext.reorderTrack(result.track.id, this.trackIndex);
			}
			return result;
		}
		return false;
	}
}

/**
 * Update Track Command (for name, volume, pan, etc.)
 */
export class UpdateTrackCommand extends Command {
	constructor(audioContext, trackId, updates) {
		super(`Update track`);
		this.audioContext = audioContext;
		this.trackId = trackId;
		this.updates = updates;
		this.previousState = null;
		
		// Get current track for description
		const track = audioContext.state.tracks.find(t => t.id === trackId);
		if (track) {
			this.description = `Update track "${track.name}"`;
		}
	}

	execute() {
		// Save previous state
		const track = this.audioContext.state.tracks.find(t => t.id === this.trackId);
		if (track) {
			this.previousState = {};
			Object.keys(this.updates).forEach(key => {
				this.previousState[key] = track[key];
			});
		}
		
		return this.audioContext.updateTrack(this.trackId, this.updates);
	}

	undo() {
		if (this.previousState) {
			return this.audioContext.updateTrack(this.trackId, this.previousState);
		}
		return false;
	}
}

/**
 * Move/Reorder Track Command
 */
export class ReorderTrackCommand extends Command {
	constructor(audioContext, trackId, newIndex) {
		super(`Move track`);
		this.audioContext = audioContext;
		this.trackId = trackId;
		this.newIndex = newIndex;
		this.oldIndex = -1;
		
		// Get current track for description
		const track = audioContext.state.tracks.find(t => t.id === trackId);
		if (track) {
			this.description = `Move track "${track.name}"`;
			this.oldIndex = audioContext.state.tracks.findIndex(t => t.id === trackId);
		}
	}

	execute() {
		if (this.oldIndex === -1) {
			this.oldIndex = this.audioContext.state.tracks.findIndex(t => t.id === this.trackId);
		}
		return this.audioContext.reorderTrack(this.trackId, this.newIndex);
	}

	undo() {
		if (this.oldIndex >= 0) {
			return this.audioContext.reorderTrack(this.trackId, this.oldIndex);
		}
		return false;
	}
}

/**
 * Set Selection Command
 */
export class SetSelectionCommand extends Command {
	constructor(audioContext, selection) {
		super("Change selection");
		this.audioContext = audioContext;
		this.newSelection = selection;
		this.previousSelection = null;
	}

	execute() {
		// Save previous selection
		this.previousSelection = { ...this.audioContext.state.selection };
		return this.audioContext.setSelection(this.newSelection);
	}

	undo() {
		if (this.previousSelection) {
			return this.audioContext.setSelection(this.previousSelection);
		}
		return false;
	}
}

/**
 * Add Effect Command
 */
export class AddEffectCommand extends Command {
	constructor(audioContext, trackId, effectType, effectParams) {
		super(`Add ${effectType} effect`);
		this.audioContext = audioContext;
		this.trackId = trackId;
		this.effectType = effectType;
		this.effectParams = effectParams;
		this.addedEffectId = null;
	}

	execute() {
		const result = this.audioContext.addEffect(this.trackId, this.effectType, this.effectParams);
		if (result?.effect) {
			this.addedEffectId = result.effect.id;
		}
		return result;
	}

	undo() {
		if (this.addedEffectId) {
			return this.audioContext.removeEffect(this.trackId, this.addedEffectId);
		}
		return false;
	}
}

/**
 * Remove Effect Command
 */
export class RemoveEffectCommand extends Command {
	constructor(audioContext, trackId, effectId) {
		super("Remove effect");
		this.audioContext = audioContext;
		this.trackId = trackId;
		this.effectId = effectId;
		this.removedEffect = null;
		this.effectIndex = -1;
	}

	execute() {
		// Save effect data before removing
		const track = this.audioContext.state.tracks.find(t => t.id === this.trackId);
		if (track?.effects) {
			const effectIndex = track.effects.findIndex(e => e.id === this.effectId);
			if (effectIndex >= 0) {
				this.removedEffect = { ...track.effects[effectIndex] };
				this.effectIndex = effectIndex;
				this.description = `Remove ${this.removedEffect.type} effect`;
			}
		}
		
		return this.audioContext.removeEffect(this.trackId, this.effectId);
	}

	undo() {
		if (this.removedEffect) {
			return this.audioContext.addEffect(this.trackId, this.removedEffect.type, this.removedEffect.params);
		}
		return false;
	}
}

/**
 * Update Effect Command
 */
export class UpdateEffectCommand extends Command {
	constructor(audioContext, trackId, effectId, updates) {
		super("Update effect");
		this.audioContext = audioContext;
		this.trackId = trackId;
		this.effectId = effectId;
		this.updates = updates;
		this.previousState = null;
	}

	execute() {
		// Save previous state
		const track = this.audioContext.state.tracks.find(t => t.id === this.trackId);
		if (track?.effects) {
			const effect = track.effects.find(e => e.id === this.effectId);
			if (effect) {
				this.previousState = {};
				Object.keys(this.updates).forEach(key => {
					this.previousState[key] = effect[key];
				});
				this.description = `Update ${effect.type} effect`;
			}
		}
		
		return this.audioContext.updateEffect(this.trackId, this.effectId, this.updates);
	}

	undo() {
		if (this.previousState) {
			return this.audioContext.updateEffect(this.trackId, this.effectId, this.previousState);
		}
		return false;
	}
}

/**
 * Bulk Delete Command (for deleting selected items)
 */
export class BulkDeleteCommand extends Command {
	constructor(audioContext, selections) {
		super(`Delete ${selections?.length || 0} items`);
		this.audioContext = audioContext;
		this.selections = selections;
		this.deletedItems = [];
	}

	execute() {
		this.deletedItems = [];
		const results = [];
		
		// Sort selections by type and execute deletions
		for (const selection of this.selections) {
			if (selection.type === 'track') {
				const track = this.audioContext.state.tracks.find(t => t.id === selection.id);
				if (track) {
					this.deletedItems.push({
						type: 'track',
						data: { ...track },
						index: this.audioContext.state.tracks.findIndex(t => t.id === selection.id)
					});
					results.push(this.audioContext.removeTrack(selection.id));
				}
			}
			// Add more selection types as needed
		}
		
		return results;
	}

	undo() {
		const results = [];
		
		// Restore items in reverse order
		for (let i = this.deletedItems.length - 1; i >= 0; i--) {
			const item = this.deletedItems[i];
			if (item.type === 'track') {
				const result = this.audioContext.addTrack(item.data);
				if (result && item.index >= 0) {
					this.audioContext.reorderTrack(result.track.id, item.index);
				}
				results.push(result);
			}
		}
		
		return results;
	}
}
