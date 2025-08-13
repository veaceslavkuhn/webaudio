/**
 * Undo/Redo Manager Service
 * Implements the Command Pattern for audio editing operations
 */

export class UndoRedoManager {
	constructor() {
		this.undoStack = [];
		this.redoStack = [];
		this.maxHistorySize = 50; // Limit history to prevent memory issues
		this.isExecuting = false; // Prevent recursive operations
	}

	/**
	 * Execute a command and add it to the undo stack
	 * @param {Command} command - Command object with execute() and undo() methods
	 */
	executeCommand(command) {
		if (this.isExecuting) return;

		try {
			this.isExecuting = true;
			
			// Execute the command
			const result = command.execute();
			
			// Add to undo stack
			this.undoStack.push(command);
			
			// Clear redo stack when new command is executed
			this.redoStack = [];
			
			// Limit stack size
			if (this.undoStack.length > this.maxHistorySize) {
				this.undoStack.shift();
			}
			
			return result;
		} finally {
			this.isExecuting = false;
		}
	}

	/**
	 * Undo the last command
	 * @returns {boolean} True if undo was successful
	 */
	undo() {
		if (this.undoStack.length === 0 || this.isExecuting) {
			return false;
		}

		try {
			this.isExecuting = true;
			
			const command = this.undoStack.pop();
			const result = command.undo();
			
			// Add to redo stack
			this.redoStack.push(command);
			
			// Limit redo stack size
			if (this.redoStack.length > this.maxHistorySize) {
				this.redoStack.shift();
			}
			
			return result !== false;
		} finally {
			this.isExecuting = false;
		}
	}

	/**
	 * Redo the last undone command
	 * @returns {boolean} True if redo was successful
	 */
	redo() {
		if (this.redoStack.length === 0 || this.isExecuting) {
			return false;
		}

		try {
			this.isExecuting = true;
			
			const command = this.redoStack.pop();
			const result = command.execute();
			
			// Add back to undo stack
			this.undoStack.push(command);
			
			return result !== false;
		} finally {
			this.isExecuting = false;
		}
	}

	/**
	 * Check if undo is available
	 * @returns {boolean}
	 */
	canUndo() {
		return this.undoStack.length > 0 && !this.isExecuting;
	}

	/**
	 * Check if redo is available
	 * @returns {boolean}
	 */
	canRedo() {
		return this.redoStack.length > 0 && !this.isExecuting;
	}

	/**
	 * Get the description of the next undo operation
	 * @returns {string|null}
	 */
	getUndoDescription() {
		if (this.undoStack.length === 0) return null;
		return this.undoStack[this.undoStack.length - 1].description || "Unknown operation";
	}

	/**
	 * Get the description of the next redo operation
	 * @returns {string|null}
	 */
	getRedoDescription() {
		if (this.redoStack.length === 0) return null;
		return this.redoStack[this.redoStack.length - 1].description || "Unknown operation";
	}

	/**
	 * Clear all history
	 */
	clear() {
		this.undoStack = [];
		this.redoStack = [];
	}

	/**
	 * Get current state info
	 * @returns {Object}
	 */
	getState() {
		return {
			canUndo: this.canUndo(),
			canRedo: this.canRedo(),
			undoDescription: this.getUndoDescription(),
			redoDescription: this.getRedoDescription(),
			undoStackSize: this.undoStack.length,
			redoStackSize: this.redoStack.length,
		};
	}
}

/**
 * Base Command class
 */
export class Command {
	constructor(description = "Unknown operation") {
		this.description = description;
		this.timestamp = Date.now();
	}

	/**
	 * Execute the command
	 * @returns {any} Result of the operation
	 */
	execute() {
		throw new Error("Command.execute() must be implemented");
	}

	/**
	 * Undo the command
	 * @returns {any} Result of the undo operation
	 */
	undo() {
		throw new Error("Command.undo() must be implemented");
	}
}

/**
 * Macro Command - combines multiple commands into one
 */
export class MacroCommand extends Command {
	constructor(commands, description = "Multiple operations") {
		super(description);
		this.commands = commands || [];
	}

	execute() {
		const results = [];
		for (const command of this.commands) {
			results.push(command.execute());
		}
		return results;
	}

	undo() {
		const results = [];
		// Undo in reverse order
		for (let i = this.commands.length - 1; i >= 0; i--) {
			results.push(this.commands[i].undo());
		}
		return results;
	}
}
