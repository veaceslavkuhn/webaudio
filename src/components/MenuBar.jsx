import React, { useState } from "react";
import { useAudioActions, useAudioState } from "../context/AudioContext";

const MenuBar = ({ onMenuAction }) => {
	const [activeMenu, setActiveMenu] = useState(null);
	const actions = useAudioActions();
	const state = useAudioState();

	const handleFileImport = () => {
		onMenuAction?.("file");
	};

	const handleExport = () => {
		onMenuAction?.("export");
	};

	const handleNewProject = () => {
		// Clear all tracks and reset state
		actions.clearError();
		actions.clearSelection();
		actions.setStatus("New project created");
	};

	const handleEffect = (effectName) => {
		onMenuAction?.("effect", { effectName });
	};

	const handleGenerate = (type) => {
		onMenuAction?.("generate", { type });
	};

	// Save project functionality
	const handleSaveProject = () => {
		try {
			const projectData = {
				tracks: Array.from(state.tracks.entries()).map(([id, track]) => ({
					id,
					name: track.name,
					// Note: In a real implementation, you'd serialize the audio data
					// For now, we'll just save metadata
					metadata: {
						duration: track.duration,
						sampleRate: track.sampleRate,
						channels: track.channels,
					},
				})),
				settings: state.projectSettings,
				timestamp: new Date().toISOString(),
			};

			const blob = new Blob([JSON.stringify(projectData, null, 2)], {
				type: "application/json",
			});

			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `webaudacity-project-${Date.now()}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			actions.setStatus("Project saved successfully");
		} catch (error) {
			actions.setError("Failed to save project");
		}
	};

	// Undo/Redo functionality
	const handleUndo = () => {
		const success = actions.undo();
		if (success) {
			actions.setStatus(
				`Undid: ${state.undoRedo.undoDescription || "operation"}`,
			);
		} else {
			actions.setStatus("Nothing to undo");
		}
	};

	const handleRedo = () => {
		const success = actions.redo();
		if (success) {
			actions.setStatus(
				`Redid: ${state.undoRedo.redoDescription || "operation"}`,
			);
		} else {
			actions.setStatus("Nothing to redo");
		}
	};

	// Paste functionality
	const handlePaste = () => {
		actions.paste();
	};

	// Analysis tools
	const handlePlotSpectrum = () => {
		if (state.tracks.size === 0) {
			actions.setStatus("No audio tracks to analyze");
			return;
		}

		// Open a modal for spectrum analysis
		onMenuAction?.("spectrum");
		actions.setStatus("Opening spectrum analyzer...");
	};

	const handleAnalyzeAudio = () => {
		if (state.tracks.size === 0) {
			actions.setStatus("No audio tracks to analyze");
			return;
		}

		// Show audio analysis information
		const totalTracks = state.tracks.size;
		const totalDuration = state.totalDuration;
		const message = `Audio Analysis: ${totalTracks} tracks, ${totalDuration.toFixed(2)}s total duration`;
		actions.setStatus(message);
	};

	// Preferences
	const handlePreferences = () => {
		onMenuAction?.("preferences");
		actions.setStatus("Opening preferences...");
	};

	// Reset configuration
	const handleResetConfig = () => {
		onMenuAction?.("confirm", {
			title: "Reset Configuration",
			message:
				"Are you sure you want to reset all settings to default? This action cannot be undone.",
			onConfirm: () => {
				// Reset to default settings
				actions.setZoomLevel(1.0);
				actions.setScrollPosition(0);
				actions.setTool("selection");
				actions.setPlaybackVolume(80);
				actions.setRecordingVolume(50);
				actions.clearSelection();
				actions.setStatus("Configuration reset to defaults");
			},
		});
	};

	// About dialog
	const handleAbout = () => {
		onMenuAction?.("about");
		actions.setStatus("Opening about dialog...");
	};

	// Help
	const handleHelp = () => {
		onMenuAction?.("help");
		actions.setStatus("Opening help...");
	};

	const menuItems = [
		{
			label: "File",
			items: [
				{ label: "New", action: handleNewProject },
				{ label: "Open...", action: handleFileImport },
				{
					label: "Save Project",
					action: handleSaveProject,
				},
				{ label: "Export Audio...", action: handleExport },
				{ type: "separator" },
				{ label: "Import > Audio...", action: handleFileImport },
			],
		},
		{
			label: "Edit",
			items: [
				{
					label: `Undo${state.undoRedo.undoDescription ? ` ${state.undoRedo.undoDescription}` : ""}`,
					action: handleUndo,
					disabled: !state.undoRedo.canUndo,
				},
				{
					label: `Redo${state.undoRedo.redoDescription ? ` ${state.undoRedo.redoDescription}` : ""}`,
					action: handleRedo,
					disabled: !state.undoRedo.canRedo,
				},
				{ type: "separator" },
				{ label: "Cut", action: actions.cut },
				{ label: "Copy", action: actions.copy },
				{
					label: "Paste",
					action: handlePaste,
				},
				{ label: "Delete", action: actions.delete },
				{ type: "separator" },
				{ label: "Select All", action: actions.selectAll },
			],
		},
		{
			label: "Generate",
			items: [
				{ label: "Tone...", action: () => handleGenerate("tone") },
				{ label: "Noise...", action: () => handleGenerate("noise") },
				{ label: "Silence...", action: () => handleGenerate("silence") },
			],
		},
		{
			label: "Effect",
			items: [
				{ label: "Amplify...", action: () => handleEffect("amplify") },
				{ label: "Normalize...", action: () => handleEffect("normalize") },
				{ label: "Fade In", action: () => handleEffect("fadeIn") },
				{ label: "Fade Out", action: () => handleEffect("fadeOut") },
				{ label: "Echo...", action: () => handleEffect("echo") },
				{ label: "Reverb...", action: () => handleEffect("reverb") },
				{
					label: "Noise Reduction...",
					action: () => handleEffect("noiseReduction"),
				},
				{ label: "Change Speed...", action: () => handleEffect("changeSpeed") },
				{ label: "Change Pitch...", action: () => handleEffect("changePitch") },
			],
		},
		{
			label: "Analyze",
			items: [
				{
					label: "Plot Spectrum...",
					action: handlePlotSpectrum,
				},
				{
					label: "Analyze Audio...",
					action: handleAnalyzeAudio,
				},
			],
		},
		{
			label: "Tools",
			items: [
				{
					label: "Preferences...",
					action: handlePreferences,
				},
				{
					label: "Reset Configuration",
					action: handleResetConfig,
				},
			],
		},
		{
			label: "Help",
			items: [
				{
					label: "About WebAudacity",
					action: handleAbout,
				},
				{ label: "Help", action: handleHelp },
			],
		},
	];

	const handleMenuClick = (index) => {
		setActiveMenu(activeMenu === index ? null : index);
	};

	const handleItemClick = (item) => {
		if (item.action && !item.disabled) {
			item.action();
		}
		setActiveMenu(null);
	};

	return (
		<div className="menu-bar">
			<div className="menu-items">
				{menuItems.map((menu, index) => (
					<div
						key={menu.label}
						className="menu-item"
						onMouseEnter={() => setActiveMenu(index)}
						onMouseLeave={() => setActiveMenu(null)}
					>
						<span onClick={() => handleMenuClick(index)}>{menu.label}</span>
						{activeMenu === index && (
							<div className="dropdown">
								{menu.items.map((item, itemIndex) =>
									item.type === "separator" ? (
										<hr key={itemIndex} />
									) : (
										<button
											key={itemIndex}
											onClick={() => handleItemClick(item)}
											disabled={item.disabled}
											type="button"
											className={item.disabled ? "disabled" : ""}
										>
											{item.label}
										</button>
									),
								)}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

export default MenuBar;
