import { useCallback, useEffect } from "react";
import { useAudioActions, useAudioState } from "../context/AudioContext";

// Hook for keyboard shortcuts
export const useKeyboardShortcuts = () => {
	const state = useAudioState();
	const actions = useAudioActions();

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.ctrlKey || e.metaKey) {
				switch (e.key) {
					case "n":
						e.preventDefault();
						// New project
						break;
					case "o":
						e.preventDefault();
						// Open file
						break;
					case "s":
						e.preventDefault();
						// Save project
						break;
					case "z":
						e.preventDefault();
						if (e.shiftKey) {
							// Redo
							actions.redo();
						} else {
							// Undo
							actions.undo();
						}
						break;
					case "x":
						e.preventDefault();
						actions.cut();
						break;
					case "c":
						e.preventDefault();
						actions.copy();
						break;
					case "v":
						e.preventDefault();
						// Paste
						break;
					case "a":
						e.preventDefault();
						actions.selectAll();
						break;
					default:
						break;
				}
			}

			if (e.key === " ") {
				e.preventDefault();
				if (state.isPlaying) {
					actions.pause();
				} else {
					actions.play();
				}
			}

			if (e.key === "Delete" || e.key === "Backspace") {
				e.preventDefault();
				actions.delete();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [state.isPlaying, actions]);
};

// Hook for file drag and drop
export const useFileDrop = (onFileDrop) => {
	const handleDragOver = useCallback((e) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
	}, []);

	const handleDrop = useCallback(
		(e) => {
			e.preventDefault();
			const files = Array.from(e.dataTransfer.files);
			const audioFiles = files.filter((file) => file.type.startsWith("audio/"));

			if (audioFiles.length > 0) {
				onFileDrop(audioFiles);
			}
		},
		[onFileDrop],
	);

	return {
		handleDragOver,
		handleDrop,
	};
};
