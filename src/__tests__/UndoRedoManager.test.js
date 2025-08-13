/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import {
	Command,
	MacroCommand,
	UndoRedoManager,
} from "../services/UndoRedoManager";

describe("UndoRedoManager", () => {
	let manager;

	beforeEach(() => {
		manager = new UndoRedoManager();
	});

	describe("Basic Command Execution", () => {
		test("should execute command and add to undo stack", () => {
			let executed = false;
			const command = {
				execute: jest.fn(() => {
					executed = true;
					return "executed";
				}),
				undo: jest.fn(() => {
					executed = false;
					return "undone";
				}),
				description: "Test command",
			};

			const result = manager.executeCommand(command);

			expect(result).toBe("executed");
			expect(executed).toBe(true);
			expect(command.execute).toHaveBeenCalledTimes(1);
			expect(manager.canUndo()).toBe(true);
			expect(manager.canRedo()).toBe(false);
		});

		test("should undo command and add to redo stack", () => {
			let value = 0;
			const command = {
				execute: jest.fn(() => {
					value = 10;
				}),
				undo: jest.fn(() => {
					value = 0;
				}),
				description: "Increment command",
			};

			manager.executeCommand(command);
			expect(value).toBe(10);

			const undoResult = manager.undo();
			expect(undoResult).toBe(true);
			expect(value).toBe(0);
			expect(command.undo).toHaveBeenCalledTimes(1);
			expect(manager.canUndo()).toBe(false);
			expect(manager.canRedo()).toBe(true);
		});

		test("should redo command and add back to undo stack", () => {
			let value = 0;
			const command = {
				execute: jest.fn(() => {
					value = 10;
				}),
				undo: jest.fn(() => {
					value = 0;
				}),
				description: "Increment command",
			};

			manager.executeCommand(command);
			manager.undo();
			expect(value).toBe(0);

			const redoResult = manager.redo();
			expect(redoResult).toBe(true);
			expect(value).toBe(10);
			expect(command.execute).toHaveBeenCalledTimes(2);
			expect(manager.canUndo()).toBe(true);
			expect(manager.canRedo()).toBe(false);
		});
	});

	describe("Stack Management", () => {
		test("should clear redo stack when new command is executed", () => {
			const command1 = {
				execute: jest.fn(),
				undo: jest.fn(),
				description: "Command 1",
			};
			const command2 = {
				execute: jest.fn(),
				undo: jest.fn(),
				description: "Command 2",
			};

			manager.executeCommand(command1);
			manager.undo();
			expect(manager.canRedo()).toBe(true);

			manager.executeCommand(command2);
			expect(manager.canRedo()).toBe(false);
		});

		test("should limit stack size", () => {
			manager.maxHistorySize = 3;

			const commands = [];
			for (let i = 0; i < 5; i++) {
				const command = {
					execute: jest.fn(),
					undo: jest.fn(),
					description: `Command ${i}`,
				};
				commands.push(command);
				manager.executeCommand(command);
			}

			expect(manager.undoStack.length).toBe(3);
			expect(manager.getUndoDescription()).toBe("Command 4");
		});

		test("should return correct descriptions", () => {
			const command = {
				execute: jest.fn(),
				undo: jest.fn(),
				description: "Test operation",
			};

			expect(manager.getUndoDescription()).toBeNull();
			expect(manager.getRedoDescription()).toBeNull();

			manager.executeCommand(command);
			expect(manager.getUndoDescription()).toBe("Test operation");

			manager.undo();
			expect(manager.getUndoDescription()).toBeNull();
			expect(manager.getRedoDescription()).toBe("Test operation");
		});
	});

	describe("Edge Cases", () => {
		test("should not undo when stack is empty", () => {
			const result = manager.undo();
			expect(result).toBe(false);
		});

		test("should not redo when stack is empty", () => {
			const result = manager.redo();
			expect(result).toBe(false);
		});

		test("should prevent recursive operations", () => {
			let callCount = 0;
			const command = {
				execute: jest.fn(() => {
					callCount++;
					if (callCount === 1) {
						// Try to execute another command recursively
						manager.executeCommand(command);
					}
				}),
				undo: jest.fn(),
				description: "Recursive command",
			};

			manager.executeCommand(command);
			expect(callCount).toBe(1);
			expect(manager.undoStack.length).toBe(1);
		});

		test("should handle command execution errors", () => {
			const command = {
				execute: jest.fn(() => {
					throw new Error("Execution failed");
				}),
				undo: jest.fn(),
				description: "Failing command",
			};

			expect(() => {
				manager.executeCommand(command);
			}).toThrow("Execution failed");
		});
	});

	describe("State Management", () => {
		test("should return correct state information", () => {
			const command = {
				execute: jest.fn(),
				undo: jest.fn(),
				description: "State test command",
			};

			let state = manager.getState();
			expect(state).toEqual({
				canUndo: false,
				canRedo: false,
				undoDescription: null,
				redoDescription: null,
				undoStackSize: 0,
				redoStackSize: 0,
			});

			manager.executeCommand(command);
			state = manager.getState();
			expect(state.canUndo).toBe(true);
			expect(state.undoDescription).toBe("State test command");
			expect(state.undoStackSize).toBe(1);

			manager.undo();
			state = manager.getState();
			expect(state.canRedo).toBe(true);
			expect(state.redoDescription).toBe("State test command");
			expect(state.redoStackSize).toBe(1);
		});

		test("should clear all history", () => {
			const command = {
				execute: jest.fn(),
				undo: jest.fn(),
				description: "Clear test command",
			};

			manager.executeCommand(command);
			manager.undo();
			expect(manager.canUndo()).toBe(false);
			expect(manager.canRedo()).toBe(true);

			manager.clear();
			expect(manager.canUndo()).toBe(false);
			expect(manager.canRedo()).toBe(false);
			expect(manager.undoStack.length).toBe(0);
			expect(manager.redoStack.length).toBe(0);
		});
	});
});

describe("Command Base Class", () => {
	test("should throw error for unimplemented execute", () => {
		const command = new Command();
		expect(() => command.execute()).toThrow(
			"Command.execute() must be implemented",
		);
	});

	test("should throw error for unimplemented undo", () => {
		const command = new Command();
		expect(() => command.undo()).toThrow("Command.undo() must be implemented");
	});

	test("should set description and timestamp", () => {
		const command = new Command("Test description");
		expect(command.description).toBe("Test description");
		expect(command.timestamp).toBeGreaterThan(0);
	});
});

describe("MacroCommand", () => {
	test("should execute all commands in order", () => {
		const executions = [];
		const commands = [
			{
				execute: jest.fn(() => executions.push("cmd1")),
				undo: jest.fn(),
			},
			{
				execute: jest.fn(() => executions.push("cmd2")),
				undo: jest.fn(),
			},
			{
				execute: jest.fn(() => executions.push("cmd3")),
				undo: jest.fn(),
			},
		];

		const macro = new MacroCommand(commands, "Multi-operation");
		const results = macro.execute();

		expect(executions).toEqual(["cmd1", "cmd2", "cmd3"]);
		expect(results).toHaveLength(3);
		expect(macro.description).toBe("Multi-operation");
	});

	test("should undo all commands in reverse order", () => {
		const undoOperations = [];
		const commands = [
			{
				execute: jest.fn(),
				undo: jest.fn(() => undoOperations.push("undo1")),
			},
			{
				execute: jest.fn(),
				undo: jest.fn(() => undoOperations.push("undo2")),
			},
			{
				execute: jest.fn(),
				undo: jest.fn(() => undoOperations.push("undo3")),
			},
		];

		const macro = new MacroCommand(commands);
		macro.execute();
		const undoResults = macro.undo();

		expect(undoOperations).toEqual(["undo3", "undo2", "undo1"]);
		expect(undoResults).toHaveLength(3);
	});

	test("should handle empty command list", () => {
		const macro = new MacroCommand([], "Empty macro");
		const executeResults = macro.execute();
		const undoResults = macro.undo();

		expect(executeResults).toEqual([]);
		expect(undoResults).toEqual([]);
	});
});
