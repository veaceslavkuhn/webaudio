/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { UndoRedoManager } from "../services/UndoRedoManager";

describe("Undo/Redo Integration", () => {
	let undoRedoManager;

	beforeEach(() => {
		undoRedoManager = new UndoRedoManager();
	});

	describe("Basic Undo/Redo State", () => {
		test("should initialize with correct undo/redo state", () => {
			const state = undoRedoManager.getState();
			expect(state.canUndo).toBe(false);
			expect(state.canRedo).toBe(false);
		});

		test("should execute and undo commands", () => {
			// Create mock command
			const mockCommand = {
				execute: jest.fn(),
				undo: jest.fn(),
				description: "Test Command",
			};

			// Execute command
			undoRedoManager.executeCommand(mockCommand);
			expect(mockCommand.execute).toHaveBeenCalled();
			expect(undoRedoManager.getState().canUndo).toBe(true);

			// Undo command
			undoRedoManager.undo();
			expect(mockCommand.undo).toHaveBeenCalled();
			expect(undoRedoManager.getState().canRedo).toBe(true);
		});

		test("should handle command execution correctly", () => {
			// Create a simple mock command instead of using AddTrackCommand
			const tracks = new Map();
			const mockTrack = { id: "test-track", name: "Test Track" };

			const mockCommand = {
				execute: jest.fn(() => {
					tracks.set("test-track", mockTrack);
				}),
				undo: jest.fn(() => {
					tracks.delete("test-track");
				}),
				description: "Add Track",
			};

			// Execute command
			undoRedoManager.executeCommand(mockCommand);
			expect(mockCommand.execute).toHaveBeenCalled();
			expect(tracks.has("test-track")).toBe(true);

			// Undo command
			undoRedoManager.undo();
			expect(mockCommand.undo).toHaveBeenCalled();
			expect(tracks.has("test-track")).toBe(false);
		});
	});
});
