import { useState } from "react";

const MenuBar = ({ onFileImport, onExport, onEffect, onGenerate }) => {
	const [activeMenu, setActiveMenu] = useState(null);

	const menuItems = [
		{
			label: "File",
			items: [
				{ label: "New", action: () => console.log("New project") },
				{ label: "Open...", action: onFileImport },
				{ label: "Save Project", action: () => console.log("Save project") },
				{ label: "Export Audio...", action: onExport },
				{ type: "separator" },
				{ label: "Import > Audio...", action: onFileImport },
			],
		},
		{
			label: "Edit",
			items: [
				{ label: "Undo", action: () => console.log("Undo") },
				{ label: "Redo", action: () => console.log("Redo") },
				{ type: "separator" },
				{ label: "Cut", action: () => console.log("Cut") },
				{ label: "Copy", action: () => console.log("Copy") },
				{ label: "Paste", action: () => console.log("Paste") },
				{ label: "Delete", action: () => console.log("Delete") },
				{ type: "separator" },
				{ label: "Select All", action: () => console.log("Select All") },
			],
		},
		{
			label: "Generate",
			items: [
				{ label: "Tone...", action: () => onGenerate("tone") },
				{ label: "Noise...", action: () => onGenerate("noise") },
				{ label: "Silence...", action: () => onGenerate("silence") },
			],
		},
		{
			label: "Effect",
			items: [
				{ label: "Amplify...", action: () => onEffect("amplify") },
				{ label: "Normalize...", action: () => onEffect("normalize") },
				{ label: "Fade In", action: () => onEffect("fadeIn") },
				{ label: "Fade Out", action: () => onEffect("fadeOut") },
				{ label: "Echo...", action: () => onEffect("echo") },
				{ label: "Reverb...", action: () => onEffect("reverb") },
				{
					label: "Noise Reduction...",
					action: () => onEffect("noiseReduction"),
				},
				{ label: "Change Speed...", action: () => onEffect("changeSpeed") },
				{ label: "Change Pitch...", action: () => onEffect("changePitch") },
			],
		},
		{
			label: "Analyze",
			items: [
				{
					label: "Plot Spectrum...",
					action: () => console.log("Plot spectrum"),
				},
				{
					label: "Analyze Audio...",
					action: () => console.log("Analyze audio"),
				},
			],
		},
		{
			label: "Tools",
			items: [
				{ label: "Preferences...", action: () => console.log("Preferences") },
				{
					label: "Reset Configuration",
					action: () => console.log("Reset config"),
				},
			],
		},
		{
			label: "Help",
			items: [
				{ label: "About WebAudacity", action: () => console.log("About") },
				{ label: "Help", action: () => console.log("Help") },
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
