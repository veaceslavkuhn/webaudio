import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

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
			data-testid="modal-overlay"
		>
			<div
				className={`modal-content ${size} ${type} ${isClosing ? "closing" : ""}`}
				data-testid="modal-content"
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
							data-testid="modal-close"
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
			<div
				className="confirm-modal-content"
				data-testid="confirm-modal-content"
			>
				<p className="confirm-message" data-testid="confirm-message">
					{message}
				</p>
				<div className="confirm-actions" data-testid="confirm-actions">
					<button
						type="button"
						className="button secondary"
						onClick={onClose}
						data-testid="confirm-cancel-button"
					>
						{cancelText}
					</button>
					<button
						type="button"
						className={`button ${type === "error" ? "danger" : "primary"}`}
						onClick={handleConfirm}
						data-testid="confirm-button"
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
			<div className="file-modal-content" data-testid="file-modal-content">
				<div
					className={`file-drop-zone ${dragOver ? "drag-over" : ""}`}
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					data-testid="file-drop-zone"
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
							data-testid="file-input"
						/>
						<label
							htmlFor="file-input"
							className="file-input-label button primary"
							data-testid="choose-files-button"
						>
							Choose Files
						</label>
					</div>
				</div>
				<div className="supported-formats" data-testid="supported-formats">
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
			<div className="export-modal-content" data-testid="export-modal-content">
				<div className="export-options" data-testid="export-options">
					<div className="option-group">
						<label>Format:</label>
						<select
							value={exportOptions.format}
							onChange={(e) => handleOptionChange("format", e.target.value)}
							data-testid="export-format-select"
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
							data-testid="export-sample-rate-select"
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
							data-testid="export-bit-depth-select"
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
							data-testid="export-channels-select"
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
							data-testid="export-tracks-select"
						>
							<option value="mix">Mixed Down</option>
							<option value="selection">Selection Only</option>
							<option value="individual">Individual Tracks</option>
						</select>
					</div>
				</div>

				<div className="export-actions" data-testid="export-actions">
					<button
						type="button"
						className="button secondary"
						onClick={onClose}
						data-testid="export-cancel-button"
					>
						Cancel
					</button>
					<button
						type="button"
						className="button primary"
						onClick={handleExport}
						data-testid="export-button"
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
	const [parameters, setParameters] = useState({});

	const config = useMemo(() => {
		switch (type) {
			case "tone":
				return {
					title: "Generate Tone",
					params: [
						{
							name: "frequency",
							label: "Frequency (Hz)",
							type: "number",
							min: 20,
							max: 20000,
							step: 1,
							default: 440,
						},
						{
							name: "duration",
							label: "Duration (seconds)",
							type: "number",
							min: 0.1,
							max: 60,
							step: 0.1,
							default: 1.0,
						},
						{
							name: "amplitude",
							label: "Amplitude",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.5,
						},
						{
							name: "waveform",
							label: "Waveform",
							type: "select",
							options: ["sine", "square", "sawtooth", "triangle"],
							default: "sine",
						},
					],
				};
			case "noise":
				return {
					title: "Generate Noise",
					params: [
						{
							name: "duration",
							label: "Duration (seconds)",
							type: "number",
							min: 0.1,
							max: 60,
							step: 0.1,
							default: 1.0,
						},
						{
							name: "amplitude",
							label: "Amplitude",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.1,
						},
						{
							name: "type",
							label: "Noise Type",
							type: "select",
							options: ["white", "pink"],
							default: "white",
						},
					],
				};
			case "silence":
				return {
					title: "Generate Silence",
					params: [
						{
							name: "duration",
							label: "Duration (seconds)",
							type: "number",
							min: 0.1,
							max: 60,
							step: 0.1,
							default: 1.0,
						},
					],
				};
			// Phase 1 Priority Generators
			case "chirp":
				return {
					title: "Generate Chirp",
					params: [
						{
							name: "startFreq",
							label: "Start Frequency (Hz)",
							type: "number",
							min: 20,
							max: 20000,
							step: 1,
							default: 440,
						},
						{
							name: "endFreq",
							label: "End Frequency (Hz)",
							type: "number",
							min: 20,
							max: 20000,
							step: 1,
							default: 880,
						},
						{
							name: "duration",
							label: "Duration (seconds)",
							type: "number",
							min: 0.1,
							max: 60,
							step: 0.1,
							default: 2.0,
						},
						{
							name: "amplitude",
							label: "Amplitude",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.5,
						},
						{
							name: "waveform",
							label: "Waveform",
							type: "select",
							options: ["sine", "square", "sawtooth", "triangle"],
							default: "sine",
						},
					],
				};
			case "dtmf":
				return {
					title: "Generate DTMF Tone",
					params: [
						{
							name: "digit",
							label: "Digit/Key",
							type: "select",
							options: [
								"0",
								"1",
								"2",
								"3",
								"4",
								"5",
								"6",
								"7",
								"8",
								"9",
								"*",
								"#",
								"A",
								"B",
								"C",
								"D",
							],
							default: "1",
						},
						{
							name: "duration",
							label: "Duration (seconds)",
							type: "number",
							min: 0.1,
							max: 10,
							step: 0.1,
							default: 0.5,
						},
						{
							name: "amplitude",
							label: "Amplitude",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.5,
						},
					],
				};
			case "rhythm":
				return {
					title: "Generate Rhythm Track",
					params: [
						{
							name: "bpm",
							label: "BPM (Beats Per Minute)",
							type: "number",
							min: 40,
							max: 200,
							step: 1,
							default: 120,
						},
						{
							name: "duration",
							label: "Duration (seconds)",
							type: "number",
							min: 1,
							max: 300,
							step: 1,
							default: 10,
						},
						{
							name: "beatsPerMeasure",
							label: "Beats Per Measure",
							type: "number",
							min: 2,
							max: 8,
							step: 1,
							default: 4,
						},
						{
							name: "amplitude",
							label: "Amplitude",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.7,
						},
					],
				};
			case "pluck":
				return {
					title: "Generate Pluck",
					params: [
						{
							name: "frequency",
							label: "Frequency (Hz)",
							type: "number",
							min: 80,
							max: 2000,
							step: 1,
							default: 440,
						},
						{
							name: "duration",
							label: "Duration (seconds)",
							type: "number",
							min: 0.5,
							max: 10,
							step: 0.1,
							default: 2.0,
						},
						{
							name: "amplitude",
							label: "Amplitude",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.5,
						},
						{
							name: "decay",
							label: "Decay Rate",
							type: "number",
							min: 0.1,
							max: 2,
							step: 0.1,
							default: 0.5,
						},
					],
				};
			case "drum":
				return {
					title: "Generate Risset Drum",
					params: [
						{
							name: "frequency",
							label: "Base Frequency (Hz)",
							type: "number",
							min: 40,
							max: 200,
							step: 1,
							default: 60,
						},
						{
							name: "duration",
							label: "Duration (seconds)",
							type: "number",
							min: 0.1,
							max: 5,
							step: 0.1,
							default: 1.0,
						},
						{
							name: "amplitude",
							label: "Amplitude",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.8,
						},
					],
				};
			default:
				return { title: "Generate Audio", params: [] };
		}
	}, [type]);

	React.useEffect(() => {
		const initialParams = {};
		config.params.forEach((param) => {
			initialParams[param.name] = param.default;
		});
		setParameters(initialParams);
	}, [config]);

	const handleGenerate = () => {
		onGenerate(type, parameters);
		onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={config.title}>
			<div className="generate-modal" data-testid="generate-modal">
				{config.params.map((param) => (
					<div key={param.name} className="form-group">
						<label htmlFor={`generate-param-${param.name}`}>
							{param.label}:
						</label>
						{param.type === "select" ? (
							<select
								id={`generate-param-${param.name}`}
								value={parameters[param.name] || param.default}
								onChange={(e) => {
									setParameters((prev) => ({
										...prev,
										[param.name]: e.target.value,
									}));
								}}
								data-testid={`generate-param-${param.name}`}
							>
								{param.options.map((option) => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>
						) : (
							<input
								id={`generate-param-${param.name}`}
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
								data-testid={`generate-param-${param.name}`}
							/>
						)}
					</div>
				))}

				<div className="modal-actions" data-testid="generate-actions">
					<button
						type="button"
						className="button secondary"
						onClick={onClose}
						data-testid="generate-cancel-button"
					>
						Cancel
					</button>
					<button
						type="button"
						className="button primary"
						onClick={handleGenerate}
						data-testid="generate-button"
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
			// Phase 1 Priority Effects
			case "bassAndTreble":
				return {
					title: "Bass and Treble",
					params: [
						{
							name: "bassGain",
							label: "Bass Gain (dB)",
							type: "number",
							min: -20,
							max: 20,
							step: 0.5,
							default: 0,
						},
						{
							name: "trebleGain",
							label: "Treble Gain (dB)",
							type: "number",
							min: -20,
							max: 20,
							step: 0.5,
							default: 0,
						},
						{
							name: "bassFreq",
							label: "Bass Frequency (Hz)",
							type: "number",
							min: 100,
							max: 500,
							step: 10,
							default: 250,
						},
						{
							name: "trebleFreq",
							label: "Treble Frequency (Hz)",
							type: "number",
							min: 2000,
							max: 8000,
							step: 100,
							default: 4000,
						},
					],
				};
			case "graphicEQ":
				return {
					title: "Graphic EQ",
					params: [
						{
							name: "band31",
							label: "31.25 Hz (dB)",
							type: "number",
							min: -12,
							max: 12,
							step: 0.5,
							default: 0,
						},
						{
							name: "band62",
							label: "62.5 Hz (dB)",
							type: "number",
							min: -12,
							max: 12,
							step: 0.5,
							default: 0,
						},
						{
							name: "band125",
							label: "125 Hz (dB)",
							type: "number",
							min: -12,
							max: 12,
							step: 0.5,
							default: 0,
						},
						{
							name: "band250",
							label: "250 Hz (dB)",
							type: "number",
							min: -12,
							max: 12,
							step: 0.5,
							default: 0,
						},
						{
							name: "band500",
							label: "500 Hz (dB)",
							type: "number",
							min: -12,
							max: 12,
							step: 0.5,
							default: 0,
						},
						{
							name: "band1k",
							label: "1 kHz (dB)",
							type: "number",
							min: -12,
							max: 12,
							step: 0.5,
							default: 0,
						},
						{
							name: "band2k",
							label: "2 kHz (dB)",
							type: "number",
							min: -12,
							max: 12,
							step: 0.5,
							default: 0,
						},
						{
							name: "band4k",
							label: "4 kHz (dB)",
							type: "number",
							min: -12,
							max: 12,
							step: 0.5,
							default: 0,
						},
						{
							name: "band8k",
							label: "8 kHz (dB)",
							type: "number",
							min: -12,
							max: 12,
							step: 0.5,
							default: 0,
						},
						{
							name: "band16k",
							label: "16 kHz (dB)",
							type: "number",
							min: -12,
							max: 12,
							step: 0.5,
							default: 0,
						},
					],
				};
			case "notchFilter":
				return {
					title: "Notch Filter",
					params: [
						{
							name: "frequency",
							label: "Frequency (Hz)",
							type: "number",
							min: 20,
							max: 20000,
							step: 1,
							default: 60,
						},
						{
							name: "quality",
							label: "Quality Factor",
							type: "number",
							min: 0.1,
							max: 100,
							step: 0.1,
							default: 30,
						},
					],
				};
			case "clickRemoval":
				return {
					title: "Click Removal",
					params: [
						{
							name: "threshold",
							label: "Threshold (%)",
							type: "number",
							min: 10,
							max: 500,
							step: 10,
							default: 200,
						},
						{
							name: "width",
							label: "Spike Width (samples)",
							type: "number",
							min: 1,
							max: 20,
							step: 1,
							default: 5,
						},
					],
				};
			case "clipFix":
				return {
					title: "Clip Fix",
					params: [
						{
							name: "threshold",
							label: "Clipping Threshold",
							type: "number",
							min: 0.5,
							max: 1,
							step: 0.01,
							default: 0.95,
						},
					],
				};
			case "noiseGate":
				return {
					title: "Noise Gate",
					params: [
						{
							name: "threshold",
							label: "Threshold (dB)",
							type: "number",
							min: -60,
							max: 0,
							step: 1,
							default: -40,
						},
						{
							name: "attack",
							label: "Attack (s)",
							type: "number",
							min: 0.001,
							max: 1,
							step: 0.001,
							default: 0.01,
						},
						{
							name: "hold",
							label: "Hold (s)",
							type: "number",
							min: 0.001,
							max: 1,
							step: 0.001,
							default: 0.01,
						},
						{
							name: "release",
							label: "Release (s)",
							type: "number",
							min: 0.001,
							max: 2,
							step: 0.001,
							default: 0.1,
						},
					],
				};
			case "tremolo":
				return {
					title: "Tremolo",
					params: [
						{
							name: "rate",
							label: "Rate (Hz)",
							type: "number",
							min: 0.1,
							max: 20,
							step: 0.1,
							default: 5,
						},
						{
							name: "depth",
							label: "Depth",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.5,
						},
						{
							name: "waveform",
							label: "Waveform",
							type: "select",
							options: ["sine", "square", "triangle", "sawtooth"],
							default: "sine",
						},
					],
				};
			case "wahwah":
				return {
					title: "Wahwah",
					params: [
						{
							name: "rate",
							label: "Rate (Hz)",
							type: "number",
							min: 0.1,
							max: 10,
							step: 0.1,
							default: 0.5,
						},
						{
							name: "depth",
							label: "Depth",
							type: "number",
							min: 0,
							max: 1,
							step: 0.01,
							default: 0.7,
						},
						{
							name: "freqOffset",
							label: "Frequency Offset (Hz)",
							type: "number",
							min: 100,
							max: 2000,
							step: 10,
							default: 450,
						},
					],
				};
			case "invert":
				return {
					title: "Invert",
					params: [], // No parameters needed
				};
			case "repeat":
				return {
					title: "Repeat",
					params: [
						{
							name: "times",
							label: "Number of Repeats",
							type: "number",
							min: 1,
							max: 10,
							step: 1,
							default: 1,
						},
					],
				};
			case "reverse":
				return {
					title: "Reverse",
					params: [], // No parameters needed
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
			<div className="effect-modal" data-testid="effect-modal">
				{config.params.map((param) => (
					<div key={param.name} className="form-group">
						<label htmlFor={`effect-param-${param.name}`}>{param.label}:</label>
						{param.type === "select" ? (
							<select
								id={`effect-param-${param.name}`}
								value={parameters[param.name] || param.default}
								onChange={(e) => {
									setParameters((prev) => ({
										...prev,
										[param.name]: e.target.value,
									}));
								}}
								data-testid={`effect-param-${param.name}`}
							>
								{param.options.map((option) => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>
						) : (
							<input
								id={`effect-param-${param.name}`}
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
								data-testid={`effect-param-${param.name}`}
							/>
						)}
					</div>
				))}

				<div className="modal-actions" data-testid="effect-actions">
					<button
						type="button"
						className="button secondary"
						onClick={onClose}
						data-testid="effect-cancel-button"
					>
						Cancel
					</button>
					<button
						type="button"
						className="button primary"
						onClick={handleApply}
						data-testid="effect-apply-button"
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
			<div
				className="preferences-modal-content"
				data-testid="preferences-modal-content"
			>
				<div
					className="preference-section"
					data-testid="audio-settings-section"
				>
					<h4>Audio Settings</h4>
					<div className="form-group">
						<label>Sample Rate:</label>
						<select
							value={settings.sampleRate}
							onChange={(e) =>
								updateSetting("sampleRate", parseInt(e.target.value))
							}
							data-testid="sample-rate-select"
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
							data-testid="bit-depth-select"
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
							data-testid="buffer-size-select"
						>
							<option value={256}>256 samples</option>
							<option value={512}>512 samples</option>
							<option value={1024}>1024 samples</option>
							<option value={2048}>2048 samples</option>
						</select>
					</div>
				</div>

				<div
					className="preference-section"
					data-testid="general-settings-section"
				>
					<h4>General Settings</h4>
					<div className="form-group">
						<label>
							<input
								type="checkbox"
								checked={settings.enableAutoSave}
								onChange={(e) =>
									updateSetting("enableAutoSave", e.target.checked)
								}
								data-testid="auto-save-checkbox"
							/>
							Enable Auto-Save
						</label>
					</div>
					<div className="form-group">
						<label>Theme:</label>
						<select
							value={settings.theme}
							onChange={(e) => updateSetting("theme", e.target.value)}
							data-testid="theme-select"
						>
							<option value="light">Light</option>
							<option value="dark">Dark</option>
						</select>
					</div>
				</div>

				<div className="modal-buttons" data-testid="preferences-actions">
					<button
						type="button"
						onClick={onClose}
						className="button secondary"
						data-testid="preferences-cancel-button"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSave}
						className="button primary"
						data-testid="preferences-save-button"
					>
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
			<div className="about-modal-content" data-testid="about-modal-content">
				<div className="about-header" data-testid="about-header">
					<h2>WebAudacity</h2>
					<p className="version">Version 1.0.0</p>
				</div>

				<div className="about-description" data-testid="about-description">
					<p>
						A modern, browser-based audio editing application that replicates
						Audacity's core functionality using Web Audio API. No downloads or
						installations required!
					</p>
				</div>

				<div className="about-features" data-testid="about-features">
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

				<div className="about-credits" data-testid="about-credits">
					<h4>Credits:</h4>
					<p>Built with Web Audio API, React, and modern web technologies.</p>
					<p>Inspired by Audacity - the original free audio editor.</p>
				</div>

				<div className="modal-buttons" data-testid="about-actions">
					<button
						type="button"
						onClick={onClose}
						className="button primary"
						data-testid="about-close-button"
					>
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
			<div className="help-modal-content" data-testid="help-modal-content">
				<div className="help-sidebar" data-testid="help-sidebar">
					{Object.entries(helpSections).map(([key, section]) => (
						<button
							key={key}
							type="button"
							className={`help-nav-item ${activeSection === key ? "active" : ""}`}
							onClick={() => setActiveSection(key)}
							data-testid={`help-nav-${key}`}
						>
							{section.title}
						</button>
					))}
				</div>

				<div className="help-content" data-testid="help-content">
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
	const [selectedTrack, setSelectedTrack] = useState(null);
	const [analysisData, setAnalysisData] = useState(null);
	const canvasRef = useRef(null);

	// Get available tracks as array
	const tracksArray = tracks ? Array.from(tracks.values()) : [];
	const availableTracks = tracksArray.filter((track) => track.audioBuffer);

	useEffect(() => {
		if (availableTracks.length > 0 && !selectedTrack) {
			setSelectedTrack(availableTracks[0].id);
		}
	}, [availableTracks, selectedTrack]);

	useEffect(() => {
		if (selectedTrack && isOpen) {
			performAnalysis();
		}
	}, [selectedTrack, analysisType, isOpen]);

	const performAnalysis = async () => {
		if (!selectedTrack) return;

		const track = tracksArray.find((t) => t.id === selectedTrack);
		if (!track?.audioBuffer) return;

		try {
			// Dynamic import to avoid circular dependencies
			const { SpectrumAnalyzer } = await import("../services/SpectrumAnalyzer");
			const audioContext = new (
				window.AudioContext || window.webkitAudioContext
			)();
			const analyzer = new SpectrumAnalyzer(audioContext);

			let data;
			switch (analysisType) {
				case "frequency":
					analyzer.initialize(2048);
					data = analyzer.analyzeAudioBuffer(track.audioBuffer);
					break;
				case "waveform":
					data = track.audioBuffer.getChannelData(0);
					break;
				case "spectrogram":
					data = analyzer.createSpectrogram(track.audioBuffer);
					break;
				default:
					data = null;
			}

			setAnalysisData(data);
			analyzer.destroy();
			audioContext.close();
		} catch (error) {
			console.error("Analysis failed:", error);
			setAnalysisData(null);
		}
	};

	useEffect(() => {
		if (analysisData && canvasRef.current) {
			drawVisualization();
		}
	}, [analysisData, analysisType]);

	const drawVisualization = () => {
		const canvas = canvasRef.current;
		if (!canvas || !analysisData) return;

		const ctx = canvas.getContext("2d");
		const { width, height } = canvas;

		ctx.clearRect(0, 0, width, height);
		ctx.fillStyle = "#1a1a1a";
		ctx.fillRect(0, 0, width, height);

		switch (analysisType) {
			case "frequency":
				drawFrequencySpectrum(ctx, analysisData, width, height);
				break;
			case "waveform":
				drawWaveform(ctx, analysisData, width, height);
				break;
			case "spectrogram":
				drawSpectrogram(ctx, analysisData, width, height);
				break;
		}
	};

	const drawFrequencySpectrum = (ctx, data, width, height) => {
		if (!data || data.length === 0) return;

		// Use the first frame for static display
		const spectrum = data[0]?.frequencies || [];
		const barWidth = width / spectrum.length;

		ctx.fillStyle = "#00ff88";
		for (let i = 0; i < spectrum.length; i++) {
			const barHeight = (spectrum[i] / 255) * height;
			ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
		}

		// Draw frequency labels
		ctx.fillStyle = "#ffffff";
		ctx.font = "12px Arial";
		ctx.fillText("0 Hz", 10, height - 10);
		ctx.fillText("22kHz", width - 50, height - 10);
	};

	const drawWaveform = (ctx, data, width, height) => {
		if (!data) return;

		ctx.strokeStyle = "#00ff88";
		ctx.lineWidth = 1;
		ctx.beginPath();

		const step = data.length / width;
		for (let i = 0; i < width; i++) {
			const sample = data[Math.floor(i * step)];
			const y = height / 2 + (sample * height) / 2;

			if (i === 0) {
				ctx.moveTo(i, y);
			} else {
				ctx.lineTo(i, y);
			}
		}

		ctx.stroke();

		// Draw center line
		ctx.strokeStyle = "#444444";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, height / 2);
		ctx.lineTo(width, height / 2);
		ctx.stroke();
	};

	const drawSpectrogram = (ctx, data, width, height) => {
		if (!data || data.length === 0) return;

		const timeStep = width / data.length;
		const freqStep = height / (data[0]?.spectrum?.length || 1);

		for (let t = 0; t < data.length; t++) {
			const frame = data[t];
			if (!frame.spectrum) continue;

			for (let f = 0; f < frame.spectrum.length; f++) {
				const magnitude = frame.spectrum[f];
				const intensity = Math.max(0, Math.min(255, magnitude + 100)) / 255;

				const r = Math.floor(intensity * 255);
				const g = Math.floor(intensity * 128);
				const b = Math.floor(intensity * 64);

				ctx.fillStyle = `rgb(${r},${g},${b})`;
				ctx.fillRect(
					t * timeStep,
					height - (f + 1) * freqStep,
					timeStep,
					freqStep,
				);
			}
		}
	};

	const exportAnalysis = () => {
		if (!analysisData) return;

		const dataStr = JSON.stringify(
			{
				type: analysisType,
				trackId: selectedTrack,
				timestamp: new Date().toISOString(),
				data: analysisData,
			},
			null,
			2,
		);

		const blob = new Blob([dataStr], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `spectrum-analysis-${analysisType}-${Date.now()}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Spectrum Analyzer"
			size="large"
		>
			<div
				className="spectrum-modal-content"
				data-testid="spectrum-modal-content"
			>
				<div className="spectrum-controls" data-testid="spectrum-controls">
					<div className="form-group">
						<label htmlFor="track-select">Track:</label>
						<select
							id="track-select"
							value={selectedTrack || ""}
							onChange={(e) => setSelectedTrack(e.target.value)}
							disabled={availableTracks.length === 0}
							data-testid="spectrum-track-select"
						>
							{availableTracks.length === 0 ? (
								<option value="">No tracks available</option>
							) : (
								availableTracks.map((track) => (
									<option key={track.id} value={track.id}>
										{track.name}
									</option>
								))
							)}
						</select>
					</div>
					<div className="form-group">
						<label htmlFor="analysis-type-select">Analysis Type:</label>
						<select
							id="analysis-type-select"
							value={analysisType}
							onChange={(e) => setAnalysisType(e.target.value)}
							data-testid="spectrum-analysis-type-select"
						>
							<option value="frequency">Frequency Spectrum</option>
							<option value="waveform">Waveform</option>
							<option value="spectrogram">Spectrogram</option>
						</select>
					</div>
				</div>

				<div className="spectrum-display" data-testid="spectrum-display">
					<canvas
						ref={canvasRef}
						width={600}
						height={300}
						style={{
							width: "100%",
							height: "300px",
							backgroundColor: "#1a1a1a",
							border: "1px solid #333",
						}}
						data-testid="spectrum-canvas"
					/>
					{!analysisData && selectedTrack && (
						<div className="spectrum-status" data-testid="spectrum-analyzing">
							<p>Analyzing audio...</p>
						</div>
					)}
					{!selectedTrack && (
						<div className="spectrum-status" data-testid="spectrum-no-track">
							<p>Select a track to begin analysis</p>
						</div>
					)}
				</div>

				<div className="modal-buttons" data-testid="spectrum-actions">
					<button
						type="button"
						onClick={onClose}
						className="button secondary"
						data-testid="spectrum-close-button"
					>
						Close
					</button>
					<button
						type="button"
						className="button primary"
						onClick={exportAnalysis}
						disabled={!analysisData}
						data-testid="spectrum-export-button"
					>
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
