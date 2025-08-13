import { useState } from "react";
import MenuBar from "./components/MenuBar";
import { ConfirmModal, ExportModal, FileModal } from "./components/Modals";
import StatusBar from "./components/StatusBar";
import Timeline from "./components/Timeline";
import Toolbar from "./components/Toolbar";
import TrackPanel from "./components/TrackPanel";
import { AudioProvider, useAudioState } from "./context/AudioContext";
import { useFileDrop, useKeyboardShortcuts } from "./hooks/useAudioHooks";
import "./App.css";

const AppContent = () => {
	const state = useAudioState();
	const [modals, setModals] = useState({
		file: false,
		export: false,
		confirm: null,
	});

	// Setup keyboard shortcuts
	useKeyboardShortcuts();

	// Setup file drop handler
	useFileDrop((files) => {
		handleFileSelect(files);
	});

	const openModal = (modalType, data = null) => {
		setModals((prev) => ({ ...prev, [modalType]: data || true }));
	};

	const closeModal = (modalType) => {
		setModals((prev) => ({ ...prev, [modalType]: false }));
	};

	const handleFileSelect = (files) => {
		// This would be handled by the audio context actions
		console.log("Files selected:", files);
	};

	const handleExport = (options) => {
		// This would be handled by the audio engine
		console.log("Export options:", options);
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
							{state.tracks.map((track) => (
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
