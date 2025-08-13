import React, { useState } from "react";
import MenuBar from "./components/MenuBar";
import { ConfirmModal, ExportModal, FileModal, GenerateModal, EffectModal } from "./components/Modals";
import StatusBar from "./components/StatusBar";
import Timeline from "./components/Timeline";
import Toolbar from "./components/Toolbar";
import TrackPanel from "./components/TrackPanel";
import { AudioProvider, useAudioState, useAudioActions } from "./context/AudioContext";
import { useFileDrop, useKeyboardShortcuts } from "./hooks/useAudioHooks";
import "./App.css";

const AppContent = () => {
	const state = useAudioState();
	const actions = useAudioActions();
	const [modals, setModals] = useState({
		file: false,
		export: false,
		confirm: null,
		generate: false,
		effect: false,
	});

	// Setup keyboard shortcuts
	useKeyboardShortcuts();

	// Setup file drop handler
	useFileDrop((files) => {
		handleFileSelect(files);
	});

	const openModal = (modalType, data = null) => {
		if (modalType === "generate") {
			setModals((prev) => ({ 
				...prev, 
				generate: data || true 
			}));
		} else if (modalType === "effect") {
			setModals((prev) => ({ 
				...prev, 
				effect: data || true 
			}));
		} else {
			setModals((prev) => ({ 
				...prev, 
				[modalType]: data === null ? true : data 
			}));
		}
	};

	const closeModal = (modalType) => {
		setModals((prev) => ({ ...prev, [modalType]: false }));
	};

	const handleFileSelect = async (files) => {
		if (!files || files.length === 0) return;

		for (const file of files) {
			try {
				await actions.loadAudioFile(file);
			} catch (error) {
				console.error("Failed to load file:", error);
			}
		}
		closeModal("file");
	};

	const handleExport = async (options) => {
		if (!options.trackId) {
			actions.setStatus("No track selected for export");
			return;
		}

		try {
			const blob = await actions.exportAudio(options.trackId, options.format);
			if (blob) {
				// Create download link
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = options.filename || "audio.wav";
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				actions.setStatus("Audio exported successfully");
			}
		} catch (error) {
			console.error("Export failed:", error);
			actions.setStatus("Export failed");
		}
		closeModal("export");
	};

	const handleGenerate = (type, params) => {
		switch (type) {
			case "tone":
				actions.generateTone(params.frequency, params.duration, params.amplitude, params.waveform);
				break;
			case "noise":
				actions.generateNoise(params.duration, params.amplitude, params.type);
				break;
			case "silence":
				actions.generateSilence(params.duration);
				break;
			default:
				console.log("Unknown generate type:", type);
		}
		closeModal("generate");
	};

	const handleEffect = (effectName, parameters) => {
		actions.applyEffect(effectName, parameters);
		closeModal("effect");
	};

	return (
		<div className="audacity-app">
			<MenuBar onMenuAction={openModal} />
			<Toolbar />

			<div className="main-content">
				<div className="timeline-container">
					<Timeline />
				</div>

				<div className="tracks-container">
					{state.tracks.length === 0 ? (
						<div className="empty-project">
							<div className="empty-message">
								<h3>No audio tracks</h3>
								<p>Import audio files to get started</p>
								<button
									type="button"
									className="button primary"
									onClick={() => openModal("file")}
								>
									Import Audio
								</button>
							</div>
						</div>
					) : (
						<div className="track-list">
							{Array.from(state.tracks.values()).map((track) => (
								<TrackPanel key={track.id} track={track} />
							))}
						</div>
					)}
				</div>
			</div>

			<StatusBar />

			{/* Modals */}
			<FileModal
				isOpen={modals.file}
				onClose={() => closeModal("file")}
				onFileSelect={handleFileSelect}
				title="Import Audio Files"
				multiple={true}
			/>

			<ExportModal
				isOpen={modals.export}
				onClose={() => closeModal("export")}
				onExport={handleExport}
				tracks={state.tracks}
			/>

			<GenerateModal
				isOpen={!!modals.generate}
				onClose={() => closeModal("generate")}
				onGenerate={handleGenerate}
				type={modals.generate?.type}
			/>

			<EffectModal
				isOpen={!!modals.effect}
				onClose={() => closeModal("effect")}
				onApply={handleEffect}
				effectName={modals.effect?.effectName}
			/>

			{modals.confirm && (
				<ConfirmModal
					isOpen={!!modals.confirm}
					onClose={() => closeModal("confirm")}
					onConfirm={modals.confirm.onConfirm}
					title={modals.confirm.title}
					message={modals.confirm.message}
					type={modals.confirm.type}
				/>
			)}

			{/* Global loading overlay */}
			{state.isProcessing && (
				<div className="processing-overlay">
					<div className="processing-spinner" />
					<p>Processing audio...</p>
				</div>
			)}
		</div>
	);
};

const App = () => {
	return (
		<AudioProvider>
			<AppContent />
		</AudioProvider>
	);
};

export default App;
