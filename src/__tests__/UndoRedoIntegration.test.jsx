/**
 * @jest-environment jsdom
 */

import { act, render } from "@testing-library/react";
import React from "react";
import "@testing-library/jest-dom";
import {
	AudioProvider,
	useAudioActions,
	useAudioState,
} from "../context/AudioContext";
import { AddTrackCommand, UpdateTrackCommand } from "../services/AudioCommands";

// Test component to access context
const TestComponent = ({ onStateChange, onActionsReady }) => {
	const state = useAudioState();
	const actions = useAudioActions();

	React.useEffect(() => {
		if (onStateChange) {
			onStateChange(state);
		}
	}, [state, onStateChange]);

	React.useEffect(() => {
		if (onActionsReady) {
			onActionsReady(actions);
		}
	}, [actions, onActionsReady]);

	return <div data-testid="test-component">Test Component</div>;
};

describe("Undo/Redo Integration", () => {
	let actions;
	let state;

	const renderWithProvider = () => {
		const mockStateChange = jest.fn((newState) => {
			state = newState;
		});
		const mockActionsReady = jest.fn((newActions) => {
			actions = newActions;
		});

		const result = render(
			<AudioProvider>
				<TestComponent
					onStateChange={mockStateChange}
					onActionsReady={mockActionsReady}
				/>
			</AudioProvider>,
		);

		return result;
	};

	beforeEach(() => {
		renderWithProvider();
	});

	describe("Basic Undo/Redo State", () => {
		test("should initialize with correct undo/redo state", () => {
			expect(state.undoRedo).toEqual({
				canUndo: false,
				canRedo: false,
				undoDescription: null,
				redoDescription: null,
			});
		});

		test("should have undo/redo actions available", () => {
			expect(actions).toHaveProperty("undo");
			expect(actions).toHaveProperty("redo");
			expect(actions).toHaveProperty("executeCommand");
			expect(actions).toHaveProperty("clearHistory");
			expect(typeof actions.undo).toBe("function");
			expect(typeof actions.redo).toBe("function");
			expect(typeof actions.executeCommand).toBe("function");
			expect(typeof actions.clearHistory).toBe("function");
		});
	});

	describe("Command Execution", () => {
		test("should execute command and update undo/redo state", async () => {
			const mockCommand = {
				execute: jest.fn(() => "executed"),
				undo: jest.fn(() => "undone"),
				description: "Test Command",
			};

			await act(async () => {
				const result = actions.executeCommand(mockCommand);
				expect(result).toBe("executed");
			});

			expect(mockCommand.execute).toHaveBeenCalledTimes(1);
			expect(state.undoRedo.canUndo).toBe(true);
			expect(state.undoRedo.canRedo).toBe(false);
			expect(state.undoRedo.undoDescription).toBe("Test Command");
		});

		test("should undo command and update state", async () => {
			const mockCommand = {
				execute: jest.fn(() => "executed"),
				undo: jest.fn(() => "undone"),
				description: "Undoable Command",
			};

			// Execute command first
			await act(async () => {
				actions.executeCommand(mockCommand);
			});

			// Then undo it
			await act(async () => {
				const undoResult = actions.undo();
				expect(undoResult).toBe(true);
			});

			expect(mockCommand.undo).toHaveBeenCalledTimes(1);
			expect(state.undoRedo.canUndo).toBe(false);
			expect(state.undoRedo.canRedo).toBe(true);
			expect(state.undoRedo.redoDescription).toBe("Undoable Command");
		});

		test("should redo command and update state", async () => {
			const mockCommand = {
				execute: jest.fn(() => "executed"),
				undo: jest.fn(() => "undone"),
				description: "Redoable Command",
			};

			// Execute, undo, then redo
			await act(async () => {
				actions.executeCommand(mockCommand);
			});

			await act(async () => {
				actions.undo();
			});

			await act(async () => {
				const redoResult = actions.redo();
				expect(redoResult).toBe(true);
			});

			expect(mockCommand.execute).toHaveBeenCalledTimes(2);
			expect(state.undoRedo.canUndo).toBe(true);
			expect(state.undoRedo.canRedo).toBe(false);
			expect(state.undoRedo.undoDescription).toBe("Redoable Command");
		});
	});

	describe("History Management", () => {
		test("should clear history and update state", async () => {
			const mockCommand = {
				execute: jest.fn(),
				undo: jest.fn(),
				description: "Clearable Command",
			};

			// Execute and undo to have history
			await act(async () => {
				actions.executeCommand(mockCommand);
				actions.undo();
			});

			expect(state.undoRedo.canRedo).toBe(true);

			// Clear history
			await act(async () => {
				actions.clearHistory();
			});

			expect(state.undoRedo.canUndo).toBe(false);
			expect(state.undoRedo.canRedo).toBe(false);
			expect(state.undoRedo.undoDescription).toBeNull();
			expect(state.undoRedo.redoDescription).toBeNull();
		});

		test("should handle failed undo gracefully", async () => {
			await act(async () => {
				const undoResult = actions.undo();
				expect(undoResult).toBe(false);
			});

			expect(state.undoRedo.canUndo).toBe(false);
		});

		test("should handle failed redo gracefully", async () => {
			await act(async () => {
				const redoResult = actions.redo();
				expect(redoResult).toBe(false);
			});

			expect(state.undoRedo.canRedo).toBe(false);
		});
	});

	describe("Real Audio Commands Integration", () => {
		test("should work with AddTrackCommand", async () => {
			// Create a mock context object that matches what the commands expect
			const mockAudioContextForCommand = {
				addTrack: jest.fn(() => ({ track: { id: "newTrack" } })),
				removeTrack: jest.fn(),
				state: { tracks: [] },
			};

			const trackData = { name: "Test Track", volume: 1.0 };
			const addCommand = new AddTrackCommand(
				mockAudioContextForCommand,
				trackData,
			);

			await act(async () => {
				actions.executeCommand(addCommand);
			});

			expect(state.undoRedo.canUndo).toBe(true);
			expect(state.undoRedo.undoDescription).toBe('Add track "Test Track"');
			expect(mockAudioContextForCommand.addTrack).toHaveBeenCalledWith(
				trackData,
			);

			// Test undo
			await act(async () => {
				actions.undo();
			});

			expect(mockAudioContextForCommand.removeTrack).toHaveBeenCalledWith(
				"newTrack",
			);
			expect(state.undoRedo.canUndo).toBe(false);
			expect(state.undoRedo.canRedo).toBe(true);
		});

		test("should work with UpdateTrackCommand", async () => {
			const mockAudioContextForCommand = {
				updateTrack: jest.fn(),
				state: {
					tracks: [{ id: "track1", name: "Original Track", volume: 1.0 }],
				},
			};

			const updates = { volume: 0.5, name: "Updated Track" };
			const updateCommand = new UpdateTrackCommand(
				mockAudioContextForCommand,
				"track1",
				updates,
			);

			await act(async () => {
				actions.executeCommand(updateCommand);
			});

			expect(state.undoRedo.canUndo).toBe(true);
			expect(state.undoRedo.undoDescription).toBe(
				'Update track "Original Track"',
			);
			expect(mockAudioContextForCommand.updateTrack).toHaveBeenCalledWith(
				"track1",
				updates,
			);

			// Test undo
			await act(async () => {
				actions.undo();
			});

			expect(mockAudioContextForCommand.updateTrack).toHaveBeenCalledWith(
				"track1",
				{
					volume: 1.0,
					name: "Original Track",
				},
			);
		});
	});

	describe("Multiple Commands", () => {
		test("should handle multiple commands in sequence", async () => {
			const commands = [];

			for (let i = 0; i < 3; i++) {
				const command = {
					execute: jest.fn(() => `executed ${i}`),
					undo: jest.fn(() => `undone ${i}`),
					description: `Command ${i}`,
				};
				commands.push(command);
			}

			// Execute all commands
			for (const command of commands) {
				await act(async () => {
					actions.executeCommand(command);
				});
			}

			expect(state.undoRedo.undoDescription).toBe("Command 2");

			// Undo all commands
			for (let i = commands.length - 1; i >= 0; i--) {
				expect(state.undoRedo.canUndo).toBe(true);

				await act(async () => {
					actions.undo();
				});

				expect(commands[i].undo).toHaveBeenCalledTimes(1);
			}

			expect(state.undoRedo.canUndo).toBe(false);
			expect(state.undoRedo.canRedo).toBe(true);

			// Redo all commands
			for (let i = 0; i < commands.length; i++) {
				await act(async () => {
					actions.redo();
				});

				// Execute should be called twice (initial + redo)
				expect(commands[i].execute).toHaveBeenCalledTimes(2);
			}

			expect(state.undoRedo.canRedo).toBe(false);
			expect(state.undoRedo.canUndo).toBe(true);
		});

		test("should clear redo stack when new command is executed after undo", async () => {
			const command1 = {
				execute: jest.fn(),
				undo: jest.fn(),
				description: "First Command",
			};

			const command2 = {
				execute: jest.fn(),
				undo: jest.fn(),
				description: "Second Command",
			};

			// Execute first command
			await act(async () => {
				actions.executeCommand(command1);
			});

			// Undo it
			await act(async () => {
				actions.undo();
			});

			expect(state.undoRedo.canRedo).toBe(true);

			// Execute second command (should clear redo stack)
			await act(async () => {
				actions.executeCommand(command2);
			});

			expect(state.undoRedo.canRedo).toBe(false);
			expect(state.undoRedo.undoDescription).toBe("Second Command");
		});
	});
});
