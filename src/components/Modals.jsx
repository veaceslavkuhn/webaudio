import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import React, { useState } from "react";

const Modal = ({
	isOpen,
	onClose,
	title,
	children,
	type = "default",
	size = "medium",
	showCloseButton = true,
	closeOnEscape = true,
	closeOnOverlay = true,
}) => {
	const [isClosing, setIsClosing] = useState(false);

	const handleClose = () => {
		if (isClosing) return;
		setIsClosing(true);
		setTimeout(() => {
			setIsClosing(false);
			onClose();
		}, 200);
	};

	const handleOverlayClick = (e) => {
		if (closeOnOverlay && e.target === e.currentTarget) {
			handleClose();
		}
	};

	const handleEscapeKey = (e) => {
		if (closeOnEscape && e.key === "Escape") {
			handleClose();
		}
	};

	React.useEffect(() => {
		if (isOpen && closeOnEscape) {
			document.addEventListener("keydown", handleEscapeKey);
			return () => document.removeEventListener("keydown", handleEscapeKey);
		}
	}, [isOpen, closeOnEscape]);

	React.useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "unset";
		}

		return () => {
			document.body.style.overflow = "unset";
		};
	}, [isOpen]);

	if (!isOpen) return null;

	const getIcon = () => {
		switch (type) {
			case "warning":
				return <AlertTriangle className="modal-icon warning" size={24} />;
			case "info":
				return <Info className="modal-icon info" size={24} />;
			case "success":
				return <CheckCircle className="modal-icon success" size={24} />;
			case "error":
				return <AlertTriangle className="modal-icon error" size={24} />;
			default:
				return null;
		}
	};

	return (
		<div
			className={`modal-overlay ${isClosing ? "closing" : ""}`}
			onClick={handleOverlayClick}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
		>
			<div
				className={`modal-content ${size} ${type} ${isClosing ? "closing" : ""}`}
			>
				<div className="modal-header">
					<div className="modal-title-container">
						{getIcon()}
						<h2 id="modal-title" className="modal-title">
							{title}
						</h2>
					</div>
					{showCloseButton && (
						<button
							type="button"
							className="modal-close"
							onClick={handleClose}
							aria-label="Close modal"
						>
							<X size={20} />
						</button>
					)}
				</div>
				<div className="modal-body">{children}</div>
			</div>
		</div>
	);
};

// Confirmation Modal Component
const ConfirmModal = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	type = "warning",
}) => {
	const handleConfirm = () => {
		onConfirm();
		onClose();
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={title}
			type={type}
			size="small"
		>
			<div className="confirm-modal-content">
				<p className="confirm-message">{message}</p>
				<div className="confirm-actions">
					<button type="button" className="button secondary" onClick={onClose}>
						{cancelText}
					</button>
					<button
						type="button"
						className={`button ${type === "error" ? "danger" : "primary"}`}
						onClick={handleConfirm}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</Modal>
	);
};

// File Dialog Modal Component
const FileModal = ({
	isOpen,
	onClose,
	onFileSelect,
	title = "Select File",
	accept = ".wav,.mp3,.flac,.aiff,.m4a",
	multiple = false,
}) => {
	const [dragOver, setDragOver] = useState(false);

	const handleFileSelect = (files) => {
		if (files && files.length > 0) {
			onFileSelect(multiple ? Array.from(files) : files[0]);
			onClose();
		}
	};

	const handleDrop = (e) => {
		e.preventDefault();
		setDragOver(false);
		const files = e.dataTransfer.files;
		handleFileSelect(files);
	};

	const handleDragOver = (e) => {
		e.preventDefault();
		setDragOver(true);
	};

	const handleDragLeave = (e) => {
		e.preventDefault();
		setDragOver(false);
	};

	const handleFileInput = (e) => {
		handleFileSelect(e.target.files);
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={title} size="medium">
			<div className="file-modal-content">
				<div
					className={`file-drop-zone ${dragOver ? "drag-over" : ""}`}
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
				>
					<div className="file-drop-content">
						<p>Drop audio files here or click to browse</p>
						<input
							type="file"
							accept={accept}
							multiple={multiple}
							onChange={handleFileInput}
							className="file-input"
							id="file-input"
						/>
						<label
							htmlFor="file-input"
							className="file-input-label button primary"
						>
							Choose Files
						</label>
					</div>
				</div>
				<div className="supported-formats">
					<p>
						<strong>Supported formats:</strong> WAV, MP3, FLAC, AIFF, M4A
					</p>
				</div>
			</div>
		</Modal>
	);
};

// Export Modal Component
const ExportModal = ({ isOpen, onClose, onExport, tracks = [] }) => {
	const [exportOptions, setExportOptions] = useState({
		format: "wav",
		quality: "high",
		sampleRate: 44100,
		bitDepth: 16,
		channels: "stereo",
		exportTracks: "mix",
	});

	const handleExport = () => {
		onExport(exportOptions);
		onClose();
	};

	const handleOptionChange = (key, value) => {
		setExportOptions((prev) => ({ ...prev, [key]: value }));
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Export Audio" size="medium">
			<div className="export-modal-content">
				<div className="export-options">
					<div className="option-group">
						<label>Format:</label>
						<select
							value={exportOptions.format}
							onChange={(e) => handleOptionChange("format", e.target.value)}
						>
							<option value="wav">WAV</option>
							<option value="mp3">MP3</option>
							<option value="flac">FLAC</option>
						</select>
					</div>

					<div className="option-group">
						<label>Sample Rate:</label>
						<select
							value={exportOptions.sampleRate}
							onChange={(e) =>
								handleOptionChange("sampleRate", parseInt(e.target.value))
							}
						>
							<option value={22050}>22050 Hz</option>
							<option value={44100}>44100 Hz</option>
							<option value={48000}>48000 Hz</option>
							<option value={96000}>96000 Hz</option>
						</select>
					</div>

					<div className="option-group">
						<label>Bit Depth:</label>
						<select
							value={exportOptions.bitDepth}
							onChange={(e) =>
								handleOptionChange("bitDepth", parseInt(e.target.value))
							}
							disabled={exportOptions.format === "mp3"}
						>
							<option value={16}>16-bit</option>
							<option value={24}>24-bit</option>
							<option value={32}>32-bit</option>
						</select>
					</div>

					<div className="option-group">
						<label>Channels:</label>
						<select
							value={exportOptions.channels}
							onChange={(e) => handleOptionChange("channels", e.target.value)}
						>
							<option value="mono">Mono</option>
							<option value="stereo">Stereo</option>
						</select>
					</div>

					<div className="option-group">
						<label>Export:</label>
						<select
							value={exportOptions.exportTracks}
							onChange={(e) =>
								handleOptionChange("exportTracks", e.target.value)
							}
						>
							<option value="mix">Mixed Down</option>
							<option value="selection">Selection Only</option>
							<option value="individual">Individual Tracks</option>
						</select>
					</div>
				</div>

				<div className="export-actions">
					<button type="button" className="button secondary" onClick={onClose}>
						Cancel
					</button>
					<button
						type="button"
						className="button primary"
						onClick={handleExport}
					>
						Export
					</button>
				</div>
			</div>
		</Modal>
	);
};

// Generate Audio Modal
const GenerateModal = ({ isOpen, onClose, onGenerate, type }) => {
	const [frequency, setFrequency] = useState(440);
	const [duration, setDuration] = useState(1.0);
	const [amplitude, setAmplitude] = useState(0.5);
	const [waveform, setWaveform] = useState("sine");
	const [noiseType, setNoiseType] = useState("white");

	const handleGenerate = () => {
		const params = { frequency, duration, amplitude };

		if (type === "tone") {
			params.waveform = waveform;
		} else if (type === "noise") {
			params.type = noiseType;
		}

		onGenerate(type, params);
		onClose();
	};

	const getTitle = () => {
		switch (type) {
			case "tone":
				return "Generate Tone";
			case "noise":
				return "Generate Noise";
			case "silence":
				return "Generate Silence";
			default:
				return "Generate Audio";
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
			<div className="generate-modal">
				<div className="form-group">
					<label>Duration (seconds):</label>
					<input
						type="number"
						value={duration}
						onChange={(e) => setDuration(parseFloat(e.target.value))}
						min="0.1"
						max="60"
						step="0.1"
					/>
				</div>

				{type !== "silence" && (
					<div className="form-group">
						<label>Amplitude:</label>
						<input
							type="range"
							value={amplitude}
							onChange={(e) => setAmplitude(parseFloat(e.target.value))}
							min="0"
							max="1"
							step="0.01"
						/>
						<span>{amplitude.toFixed(2)}</span>
					</div>
				)}

				{type === "tone" && (
					<>
						<div className="form-group">
							<label>Frequency (Hz):</label>
							<input
								type="number"
								value={frequency}
								onChange={(e) => setFrequency(parseInt(e.target.value))}
								min="20"
								max="20000"
							/>
						</div>
						<div className="form-group">
							<label>Waveform:</label>
							<select
								value={waveform}
								onChange={(e) => setWaveform(e.target.value)}
							>
								<option value="sine">Sine</option>
								<option value="square">Square</option>
								<option value="sawtooth">Sawtooth</option>
								<option value="triangle">Triangle</option>
							</select>
						</div>
					</>
				)}

				{type === "noise" && (
					<div className="form-group">
						<label>Noise Type:</label>
						<select
							value={noiseType}
							onChange={(e) => setNoiseType(e.target.value)}
						>
							<option value="white">White Noise</option>
							<option value="pink">Pink Noise</option>
						</select>
					</div>
				)}

				<div className="modal-actions">
					<button type="button" className="button secondary" onClick={onClose}>
						Cancel
					</button>
					<button
						type="button"
						className="button primary"
						onClick={handleGenerate}
					>
						Generate
					</button>
				</div>
			</div>
		</Modal>
	);
};

// Effect Modal
const EffectModal = ({ isOpen, onClose, onApply, effectName }) => {
	const [parameters, setParameters] = useState({});

	const getEffectConfig = () => {
		switch (effectName) {
			case "amplify":
				return {
					title: "Amplify",
					params: [
						{
							name: "gain",
							label: "Gain",
							type: "number",
							min: 0,
							max: 10,
							step: 0.1,
							default: 1.5,
						},
					],
				};
			case "normalize":
				return {
					title: "Normalize",
					params: [
						{
							name: "targetPeak",
							label: "Target Peak",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.95,
						},
					],
				};
			case "echo":
				return {
					title: "Echo",
					params: [
						{
							name: "delay",
							label: "Delay (s)",
							type: "number",
							min: 0.1,
							max: 2,
							step: 0.1,
							default: 0.5,
						},
						{
							name: "decay",
							label: "Decay",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.3,
						},
						{
							name: "repeat",
							label: "Repeat",
							type: "number",
							min: 1,
							max: 10,
							step: 1,
							default: 3,
						},
					],
				};
			case "reverb":
				return {
					title: "Reverb",
					params: [
						{
							name: "roomSize",
							label: "Room Size",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.5,
						},
						{
							name: "damping",
							label: "Damping",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.5,
						},
						{
							name: "wetGain",
							label: "Wet Gain",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.3,
						},
					],
				};
			case "changeSpeed":
				return {
					title: "Change Speed",
					params: [
						{
							name: "speedRatio",
							label: "Speed Ratio",
							type: "number",
							min: 0.1,
							max: 4,
							step: 0.1,
							default: 1.2,
						},
					],
				};
			case "changePitch":
				return {
					title: "Change Pitch",
					params: [
						{
							name: "pitchRatio",
							label: "Pitch Ratio",
							type: "number",
							min: 0.1,
							max: 4,
							step: 0.1,
							default: 1.2,
						},
					],
				};
			case "noiseReduction":
				return {
					title: "Noise Reduction",
					params: [
						{
							name: "noiseFloor",
							label: "Noise Floor",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.1,
						},
						{
							name: "reduction",
							label: "Reduction",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.8,
						},
					],
				};
			default:
				return { title: effectName, params: [] };
		}
	};

	const config = getEffectConfig();

	React.useEffect(() => {
		const initialParams = {};
		config.params.forEach((param) => {
			initialParams[param.name] = param.default;
		});
		setParameters(initialParams);
	}, [effectName]);

	const handleApply = () => {
		onApply(effectName, parameters);
		onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={config.title}>
			<div className="effect-modal">
				{config.params.map((param) => (
					<div key={param.name} className="form-group">
						<label>{param.label}:</label>
						<input
							type={param.type}
							value={parameters[param.name] || param.default}
							onChange={(e) => {
								const value =
									param.type === "number"
										? parseFloat(e.target.value)
										: e.target.value;
								setParameters((prev) => ({ ...prev, [param.name]: value }));
							}}
							min={param.min}
							max={param.max}
							step={param.step}
						/>
					</div>
				))}

				<div className="modal-actions">
					<button type="button" className="button secondary" onClick={onClose}>
						Cancel
					</button>
					<button
						type="button"
						className="button primary"
						onClick={handleApply}
					>
						Apply Effect
					</button>
				</div>
			</div>
		</Modal>
	);
};

// Preferences Modal Component
const PreferencesModal = ({ isOpen, onClose, onSave }) => {
	const [settings, setSettings] = useState({
		sampleRate: 44100,
		bitDepth: 16,
		bufferSize: 512,
		enableAutoSave: false,
		theme: "light",
	});

	const handleSave = () => {
		onSave(settings);
		onClose();
	};

	const updateSetting = (key, value) => {
		setSettings((prev) => ({ ...prev, [key]: value }));
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Preferences" size="medium">
			<div className="preferences-modal-content">
				<div className="preference-section">
					<h4>Audio Settings</h4>
					<div className="form-group">
						<label>Sample Rate:</label>
						<select
							value={settings.sampleRate}
							onChange={(e) =>
								updateSetting("sampleRate", parseInt(e.target.value))
							}
						>
							<option value={22050}>22,050 Hz</option>
							<option value={44100}>44,100 Hz</option>
							<option value={48000}>48,000 Hz</option>
							<option value={96000}>96,000 Hz</option>
						</select>
					</div>
					<div className="form-group">
						<label>Bit Depth:</label>
						<select
							value={settings.bitDepth}
							onChange={(e) =>
								updateSetting("bitDepth", parseInt(e.target.value))
							}
						>
							<option value={16}>16-bit</option>
							<option value={24}>24-bit</option>
							<option value={32}>32-bit</option>
						</select>
					</div>
					<div className="form-group">
						<label>Buffer Size:</label>
						<select
							value={settings.bufferSize}
							onChange={(e) =>
								updateSetting("bufferSize", parseInt(e.target.value))
							}
						>
							<option value={256}>256 samples</option>
							<option value={512}>512 samples</option>
							<option value={1024}>1024 samples</option>
							<option value={2048}>2048 samples</option>
						</select>
					</div>
				</div>

				<div className="preference-section">
					<h4>General Settings</h4>
					<div className="form-group">
						<label>
							<input
								type="checkbox"
								checked={settings.enableAutoSave}
								onChange={(e) =>
									updateSetting("enableAutoSave", e.target.checked)
								}
							/>
							Enable Auto-Save
						</label>
					</div>
					<div className="form-group">
						<label>Theme:</label>
						<select
							value={settings.theme}
							onChange={(e) => updateSetting("theme", e.target.value)}
						>
							<option value="light">Light</option>
							<option value="dark">Dark</option>
						</select>
					</div>
				</div>

				<div className="modal-buttons">
					<button type="button" onClick={onClose} className="button secondary">
						Cancel
					</button>
					<button type="button" onClick={handleSave} className="button primary">
						Save Settings
					</button>
				</div>
			</div>
		</Modal>
	);
};

// About Modal Component
const AboutModal = ({ isOpen, onClose }) => {
	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="About WebAudacity"
			size="medium"
		>
			<div className="about-modal-content">
				<div className="about-header">
					<h2>WebAudacity</h2>
					<p className="version">Version 1.0.0</p>
				</div>

				<div className="about-description">
					<p>
						A modern, browser-based audio editing application that replicates
						Audacity's core functionality using Web Audio API. No downloads or
						installations required!
					</p>
				</div>

				<div className="about-features">
					<h4>Features:</h4>
					<ul>
						<li>Multi-track audio editing</li>
						<li>Real-time recording and playback</li>
						<li>Professional audio effects</li>
						<li>Import/Export multiple formats</li>
						<li>Non-destructive editing</li>
						<li>Spectrum analysis tools</li>
					</ul>
				</div>

				<div className="about-credits">
					<h4>Credits:</h4>
					<p>Built with Web Audio API, React, and modern web technologies.</p>
					<p>Inspired by Audacity - the original free audio editor.</p>
				</div>

				<div className="modal-buttons">
					<button type="button" onClick={onClose} className="button primary">
						Close
					</button>
				</div>
			</div>
		</Modal>
	);
};

// Help Modal Component
const HelpModal = ({ isOpen, onClose }) => {
	const [activeSection, setActiveSection] = useState("getting-started");

	const helpSections = {
		"getting-started": {
			title: "Getting Started",
			content: (
				<div>
					<h4>Loading Audio Files</h4>
					<p>
						Click <strong>File &gt; Import &gt; Audio...</strong> or drag and
						drop files onto the interface.
					</p>

					<h4>Recording Audio</h4>
					<p>
						Click the red <strong>Record</strong> button and allow microphone
						access when prompted.
					</p>

					<h4>Basic Editing</h4>
					<p>
						Use the Selection Tool to select portions of audio, then use Cut,
						Copy, Paste, or Delete from the Edit menu.
					</p>
				</div>
			),
		},
		"keyboard-shortcuts": {
			title: "Keyboard Shortcuts",
			content: (
				<div>
					<table>
						<tbody>
							<tr>
								<td>Ctrl/Cmd + N</td>
								<td>New Project</td>
							</tr>
							<tr>
								<td>Ctrl/Cmd + O</td>
								<td>Open File</td>
							</tr>
							<tr>
								<td>Ctrl/Cmd + S</td>
								<td>Save Project</td>
							</tr>
							<tr>
								<td>Ctrl/Cmd + Z</td>
								<td>Undo</td>
							</tr>
							<tr>
								<td>Ctrl/Cmd + Y</td>
								<td>Redo</td>
							</tr>
							<tr>
								<td>Ctrl/Cmd + X</td>
								<td>Cut</td>
							</tr>
							<tr>
								<td>Ctrl/Cmd + C</td>
								<td>Copy</td>
							</tr>
							<tr>
								<td>Ctrl/Cmd + V</td>
								<td>Paste</td>
							</tr>
							<tr>
								<td>Space</td>
								<td>Play/Pause</td>
							</tr>
							<tr>
								<td>Delete</td>
								<td>Delete Selection</td>
							</tr>
						</tbody>
					</table>
				</div>
			),
		},
		effects: {
			title: "Audio Effects",
			content: (
				<div>
					<h4>Available Effects:</h4>
					<ul>
						<li>
							<strong>Amplify:</strong> Boost or reduce volume levels
						</li>
						<li>
							<strong>Normalize:</strong> Automatic level optimization
						</li>
						<li>
							<strong>Fade In/Out:</strong> Smooth transitions
						</li>
						<li>
							<strong>Echo:</strong> Delay and repeat effects
						</li>
						<li>
							<strong>Reverb:</strong> Spatial ambience effects
						</li>
						<li>
							<strong>Speed/Pitch Change:</strong> Tempo and pitch manipulation
						</li>
					</ul>
				</div>
			),
		},
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Help" size="large">
			<div className="help-modal-content">
				<div className="help-sidebar">
					{Object.entries(helpSections).map(([key, section]) => (
						<button
							key={key}
							className={`help-nav-item ${activeSection === key ? "active" : ""}`}
							onClick={() => setActiveSection(key)}
						>
							{section.title}
						</button>
					))}
				</div>

				<div className="help-content">
					<h3>{helpSections[activeSection].title}</h3>
					{helpSections[activeSection].content}
				</div>
			</div>
		</Modal>
	);
};

// Spectrum Modal Component
const SpectrumModal = ({ isOpen, onClose, tracks }) => {
	const [analysisType, setAnalysisType] = useState("frequency");

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Spectrum Analyzer"
			size="large"
		>
			<div className="spectrum-modal-content">
				<div className="spectrum-controls">
					<div className="form-group">
						<label>Analysis Type:</label>
						<select
							value={analysisType}
							onChange={(e) => setAnalysisType(e.target.value)}
						>
							<option value="frequency">Frequency Spectrum</option>
							<option value="waveform">Waveform</option>
							<option value="spectrogram">Spectrogram</option>
						</select>
					</div>
				</div>

				<div className="spectrum-display">
					<div className="spectrum-placeholder">
						<p>Spectrum analysis visualization would appear here.</p>
						<p>Tracks available: {tracks?.size || 0}</p>
						<p>Analysis type: {analysisType}</p>
					</div>
				</div>

				<div className="modal-buttons">
					<button type="button" onClick={onClose} className="button secondary">
						Close
					</button>
					<button type="button" className="button primary">
						Export Analysis
					</button>
				</div>
			</div>
		</Modal>
	);
};

export {
	Modal,
	ConfirmModal,
	FileModal,
	ExportModal,
	GenerateModal,
	EffectModal,
	PreferencesModal,
	AboutModal,
	HelpModal,
	SpectrumModal,
};
