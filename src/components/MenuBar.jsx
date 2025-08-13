import React, { useState } from "react";
import { useAudioActions } from "../context/AudioContext";

const MenuBar = ({ onMenuAction }) => {
	const [activeMenu, setActiveMenu] = useState(null);
	const actions = useAudioActions();

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

	const menuItems = [
		{
			label: "File",
			items: [
				{ label: "New", action: handleNewProject },
				{ label: "Open...", action: handleFileImport },
				{ label: "Save Project", action: () => console.log("Save project - Not implemented") },
				{ label: "Export Audio...", action: handleExport },
				{ type: "separator" },
				{ label: "Import > Audio...", action: handleFileImport },
			],
		},
		{
			label: "Edit",
			items: [
				{ label: "Undo", action: () => console.log("Undo - Not implemented") },
				{ label: "Redo", action: () => console.log("Redo - Not implemented") },
				{ type: "separator" },
				{ label: "Cut", action: actions.cut },
				{ label: "Copy", action: actions.copy },
				{ label: "Paste", action: () => console.log("Paste - Not implemented") },
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
					action: () => console.log("Plot spectrum - Not implemented"),
				},
				{
					label: "Analyze Audio...",
					action: () => console.log("Analyze audio - Not implemented"),
				},
			],
		},
		{
			label: "Tools",
			items: [
				{ label: "Preferences...", action: () => console.log("Preferences - Not implemented") },
				{
					label: "Reset Configuration",
					action: () => console.log("Reset config - Not implemented"),
				},
			],
		},
		{
			label: "Help",
			items: [
				{ label: "About WebAudacity", action: () => console.log("About - Not implemented") },
				{ label: "Help", action: () => console.log("Help - Not implemented") },
			],
		},
	];

	const handleMenuClick = (index) => {
		setActiveMenu(activeMenu === index ? null : index);
	};

	const handleItemClick = (item) => {
		if (item.action) {
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
											type="button"
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
