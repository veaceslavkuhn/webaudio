/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import {
	AddEffectCommand,
	AddTrackCommand,
	BulkDeleteCommand,
	RemoveEffectCommand,
	RemoveTrackCommand,
	ReorderTrackCommand,
	SetSelectionCommand,
	UpdateEffectCommand,
	UpdateTrackCommand,
} from "../services/AudioCommands";

describe("Audio Commands", () => {
	let mockAudioContext;

	beforeEach(() => {
		mockAudioContext = {
			state: {
				tracks: [
					{ id: "track1", name: "Track 1", volume: 1.0, effects: [] },
					{
						id: "track2",
						name: "Track 2",
						volume: 0.8,
						effects: [
							{ id: "effect1", type: "reverb", params: { roomSize: 0.5 } },
						],
					},
				],
				selection: { start: 0, end: 100 },
			},
			addTrack: jest.fn(() => ({ track: { id: "mockTrackId" } })),
			removeTrack: jest.fn(() => true),
			updateTrack: jest.fn(() => true),
			reorderTrack: jest.fn(() => true),
			setSelection: jest.fn(() => true),
			addEffect: jest.fn(() => ({ effect: { id: "mockEffectId" } })),
			removeEffect: jest.fn(() => true),
			updateEffect: jest.fn(() => true),
		};
	});

	describe("AddTrackCommand", () => {
		test("should execute and store track ID for undo", () => {
			const trackData = { name: "New Track", volume: 1.0 };
			const command = new AddTrackCommand(mockAudioContext, trackData);

			mockAudioContext.addTrack.mockReturnValue({ track: { id: "newTrack" } });

			const result = command.execute();

			expect(mockAudioContext.addTrack).toHaveBeenCalledWith(trackData);
			expect(command.addedTrackId).toBe("newTrack");
			expect(command.description).toBe('Add track "New Track"');
			expect(result.track.id).toBe("newTrack");
		});

		test("should undo by removing the added track", () => {
			const trackData = { name: "Test Track" };
			const command = new AddTrackCommand(mockAudioContext, trackData);

			mockAudioContext.addTrack.mockReturnValue({ track: { id: "testTrack" } });
			command.execute();

			const undoResult = command.undo();

			expect(mockAudioContext.removeTrack).toHaveBeenCalledWith("testTrack");
			expect(undoResult).toBeTruthy();
		});

		test("should handle failed track addition", () => {
			const command = new AddTrackCommand(mockAudioContext, {});
			mockAudioContext.addTrack.mockReturnValue(null);

			command.execute();
			const undoResult = command.undo();

			expect(undoResult).toBe(false);
		});
	});

	describe("RemoveTrackCommand", () => {
		test("should execute and store track data for undo", () => {
			const command = new RemoveTrackCommand(mockAudioContext, "track1");

			command.execute();

			expect(mockAudioContext.removeTrack).toHaveBeenCalledWith("track1");
			expect(command.removedTrack).toEqual(mockAudioContext.state.tracks[0]);
			expect(command.trackIndex).toBe(0);
			expect(command.description).toBe('Remove track "Track 1"');
		});

		test("should undo by re-adding the track", () => {
			const command = new RemoveTrackCommand(mockAudioContext, "track1");

			mockAudioContext.addTrack.mockReturnValue({
				track: { id: "restoredTrack" },
			});
			command.execute();
			const undoResult = command.undo();

			expect(mockAudioContext.addTrack).toHaveBeenCalledWith(
				command.removedTrack,
			);
			expect(mockAudioContext.reorderTrack).toHaveBeenCalledWith(
				"restoredTrack",
				0,
			);
			expect(undoResult).toBeTruthy();
		});
	});

	describe("UpdateTrackCommand", () => {
		test("should execute and store previous state for undo", () => {
			const updates = { volume: 0.5, name: "Updated Track" };
			const command = new UpdateTrackCommand(
				mockAudioContext,
				"track1",
				updates,
			);

			command.execute();

			expect(mockAudioContext.updateTrack).toHaveBeenCalledWith(
				"track1",
				updates,
			);
			expect(command.previousState).toEqual({
				volume: 1.0,
				name: "Track 1",
			});
		});

		test("should undo by restoring previous state", () => {
			const updates = { volume: 0.5 };
			const command = new UpdateTrackCommand(
				mockAudioContext,
				"track1",
				updates,
			);

			command.execute();
			const undoResult = command.undo();

			expect(mockAudioContext.updateTrack).toHaveBeenCalledWith("track1", {
				volume: 1.0,
			});
			expect(undoResult).toBeTruthy();
		});
	});

	describe("ReorderTrackCommand", () => {
		test("should execute and store old index for undo", () => {
			const command = new ReorderTrackCommand(mockAudioContext, "track1", 1);

			command.execute();

			expect(mockAudioContext.reorderTrack).toHaveBeenCalledWith("track1", 1);
			expect(command.oldIndex).toBe(0);
		});

		test("should undo by moving track back to original position", () => {
			const command = new ReorderTrackCommand(mockAudioContext, "track1", 1);

			command.execute();
			const undoResult = command.undo();

			expect(mockAudioContext.reorderTrack).toHaveBeenCalledWith("track1", 0);
			expect(undoResult).toBeTruthy();
		});
	});

	describe("SetSelectionCommand", () => {
		test("should execute and store previous selection", () => {
			const newSelection = { start: 50, end: 150 };
			const command = new SetSelectionCommand(mockAudioContext, newSelection);

			command.execute();

			expect(mockAudioContext.setSelection).toHaveBeenCalledWith(newSelection);
			expect(command.previousSelection).toEqual({ start: 0, end: 100 });
		});

		test("should undo by restoring previous selection", () => {
			const newSelection = { start: 50, end: 150 };
			const command = new SetSelectionCommand(mockAudioContext, newSelection);

			command.execute();
			const undoResult = command.undo();

			expect(mockAudioContext.setSelection).toHaveBeenCalledWith({
				start: 0,
				end: 100,
			});
			expect(undoResult).toBeTruthy();
		});
	});

	describe("AddEffectCommand", () => {
		test("should execute and store effect ID for undo", () => {
			const command = new AddEffectCommand(
				mockAudioContext,
				"track1",
				"delay",
				{ time: 0.3 },
			);

			mockAudioContext.addEffect.mockReturnValue({
				effect: { id: "newEffect" },
			});

			command.execute();

			expect(mockAudioContext.addEffect).toHaveBeenCalledWith(
				"track1",
				"delay",
				{ time: 0.3 },
			);
			expect(command.addedEffectId).toBe("newEffect");
			expect(command.description).toBe("Add delay effect");
		});

		test("should undo by removing the added effect", () => {
			const command = new AddEffectCommand(
				mockAudioContext,
				"track1",
				"delay",
				{},
			);

			mockAudioContext.addEffect.mockReturnValue({
				effect: { id: "delayEffect" },
			});
			command.execute();

			const undoResult = command.undo();

			expect(mockAudioContext.removeEffect).toHaveBeenCalledWith(
				"track1",
				"delayEffect",
			);
			expect(undoResult).toBeTruthy();
		});
	});

	describe("RemoveEffectCommand", () => {
		test("should execute and store effect data for undo", () => {
			const command = new RemoveEffectCommand(
				mockAudioContext,
				"track2",
				"effect1",
			);

			command.execute();

			expect(mockAudioContext.removeEffect).toHaveBeenCalledWith(
				"track2",
				"effect1",
			);
			expect(command.removedEffect).toEqual({
				id: "effect1",
				type: "reverb",
				params: { roomSize: 0.5 },
			});
			expect(command.description).toBe("Remove reverb effect");
		});

		test("should undo by re-adding the effect", () => {
			const command = new RemoveEffectCommand(
				mockAudioContext,
				"track2",
				"effect1",
			);

			command.execute();
			const undoResult = command.undo();

			expect(mockAudioContext.addEffect).toHaveBeenCalledWith(
				"track2",
				"reverb",
				{ roomSize: 0.5 },
			);
			expect(undoResult).toBeTruthy();
		});
	});

	describe("UpdateEffectCommand", () => {
		test("should execute and store previous effect state", () => {
			const updates = { params: { roomSize: 0.8 } };
			const command = new UpdateEffectCommand(
				mockAudioContext,
				"track2",
				"effect1",
				updates,
			);

			command.execute();

			expect(mockAudioContext.updateEffect).toHaveBeenCalledWith(
				"track2",
				"effect1",
				updates,
			);
			expect(command.previousState).toEqual({
				params: { roomSize: 0.5 },
			});
			expect(command.description).toBe("Update reverb effect");
		});

		test("should undo by restoring previous effect state", () => {
			const updates = { params: { roomSize: 0.8 } };
			const command = new UpdateEffectCommand(
				mockAudioContext,
				"track2",
				"effect1",
				updates,
			);

			command.execute();
			const undoResult = command.undo();

			expect(mockAudioContext.updateEffect).toHaveBeenCalledWith(
				"track2",
				"effect1",
				{
					params: { roomSize: 0.5 },
				},
			);
			expect(undoResult).toBeTruthy();
		});
	});

	describe("BulkDeleteCommand", () => {
		test("should execute and store all deleted items", () => {
			const selections = [
				{ type: "track", id: "track1" },
				{ type: "track", id: "track2" },
			];
			const command = new BulkDeleteCommand(mockAudioContext, selections);

			command.execute();

			expect(mockAudioContext.removeTrack).toHaveBeenCalledWith("track1");
			expect(mockAudioContext.removeTrack).toHaveBeenCalledWith("track2");
			expect(command.deletedItems).toHaveLength(2);
			expect(command.description).toBe("Delete 2 items");
		});

		test("should undo by restoring all items in reverse order", () => {
			const selections = [{ type: "track", id: "track1" }];
			const command = new BulkDeleteCommand(mockAudioContext, selections);

			mockAudioContext.addTrack.mockReturnValue({
				track: { id: "restoredTrack" },
			});
			command.execute();
			const undoResults = command.undo();

			expect(mockAudioContext.addTrack).toHaveBeenCalledWith(
				command.deletedItems[0].data,
			);
			expect(undoResults).toHaveLength(1);
		});
	});

	describe("Command Descriptions", () => {
		test("should generate appropriate descriptions", () => {
			const addCommand = new AddTrackCommand(mockAudioContext, {
				name: "Test",
			});
			expect(addCommand.description).toBe('Add track "Test"');

			const addCommandNoName = new AddTrackCommand(mockAudioContext, {});
			expect(addCommandNoName.description).toBe('Add track "Untitled"');

			const removeCommand = new RemoveTrackCommand(mockAudioContext, "track1");
			removeCommand.execute();
			expect(removeCommand.description).toBe('Remove track "Track 1"');

			const updateCommand = new UpdateTrackCommand(
				mockAudioContext,
				"track1",
				{},
			);
			expect(updateCommand.description).toBe('Update track "Track 1"');
		});
	});

	describe("Error Handling", () => {
		test("should handle missing tracks gracefully", () => {
			mockAudioContext.state.tracks = [];

			const removeCommand = new RemoveTrackCommand(
				mockAudioContext,
				"nonexistent",
			);
			removeCommand.execute();

			expect(removeCommand.removedTrack).toBeNull();
			expect(removeCommand.undo()).toBe(false);
		});

		test("should handle missing effects gracefully", () => {
			const removeEffectCommand = new RemoveEffectCommand(
				mockAudioContext,
				"track1",
				"nonexistent",
			);
			removeEffectCommand.execute();

			expect(removeEffectCommand.removedEffect).toBeNull();
			expect(removeEffectCommand.undo()).toBe(false);
		});
	});
});
