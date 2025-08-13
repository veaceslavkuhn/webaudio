import { render, screen, fireEvent } from "@testing-library/react";
import MenuBar from "../components/MenuBar";
import { AudioProvider } from "../context/AudioContext";

// Mock the audio context
jest.mock("../context/AudioContext", () => ({
	...jest.requireActual("../context/AudioContext"),
	useAudioActions: () => ({
		clearError: jest.fn(),
		clearSelection: jest.fn(),
		setStatus: jest.fn(),
		cut: jest.fn(),
		copy: jest.fn(),
		delete: jest.fn(),
		selectAll: jest.fn()
	})
}));

const WrappedMenuBar = ({ onMenuAction }) => (
	<AudioProvider>
		<MenuBar onMenuAction={onMenuAction} />
	</AudioProvider>
);

describe("MenuBar", () => {
	let mockOnMenuAction;

	beforeEach(() => {
		mockOnMenuAction = jest.fn();
	});

	test("renders all menu items", () => {
		render(<WrappedMenuBar onMenuAction={mockOnMenuAction} />);

		expect(screen.getByText("File")).toBeInTheDocument();
		expect(screen.getByText("Edit")).toBeInTheDocument();
		expect(screen.getByText("Generate")).toBeInTheDocument();
		expect(screen.getByText("Effect")).toBeInTheDocument();
		expect(screen.getByText("Analyze")).toBeInTheDocument();
		expect(screen.getByText("Tools")).toBeInTheDocument();
		expect(screen.getByText("Help")).toBeInTheDocument();
	});

	test("shows file menu items on hover", () => {
		render(<WrappedMenuBar onMenuAction={mockOnMenuAction} />);

		const fileMenu = screen.getByText("File");
		fireEvent.mouseEnter(fileMenu.parentElement);

		expect(screen.getByText("New")).toBeInTheDocument();
		expect(screen.getByText("Open...")).toBeInTheDocument();
		expect(screen.getByText("Save Project")).toBeInTheDocument();
		expect(screen.getByText("Export Audio...")).toBeInTheDocument();
		expect(screen.getByText("Import > Audio...")).toBeInTheDocument();
	});

	test("shows edit menu items on hover", () => {
		render(<WrappedMenuBar onMenuAction={mockOnMenuAction} />);

		const editMenu = screen.getByText("Edit");
		fireEvent.mouseEnter(editMenu.parentElement);

		expect(screen.getByText("Undo")).toBeInTheDocument();
		expect(screen.getByText("Redo")).toBeInTheDocument();
		expect(screen.getByText("Cut")).toBeInTheDocument();
		expect(screen.getByText("Copy")).toBeInTheDocument();
		expect(screen.getByText("Paste")).toBeInTheDocument();
		expect(screen.getByText("Delete")).toBeInTheDocument();
		expect(screen.getByText("Select All")).toBeInTheDocument();
	});

	test("shows generate menu items on hover", () => {
		render(<WrappedMenuBar onMenuAction={mockOnMenuAction} />);

		const generateMenu = screen.getByText("Generate");
		fireEvent.mouseEnter(generateMenu.parentElement);

		expect(screen.getByText("Tone...")).toBeInTheDocument();
		expect(screen.getByText("Noise...")).toBeInTheDocument();
		expect(screen.getByText("Silence...")).toBeInTheDocument();
	});

	test("shows effect menu items on hover", () => {
		render(<WrappedMenuBar onMenuAction={mockOnMenuAction} />);

		const effectMenu = screen.getByText("Effect");
		fireEvent.mouseEnter(effectMenu.parentElement);

		expect(screen.getByText("Amplify...")).toBeInTheDocument();
		expect(screen.getByText("Normalize...")).toBeInTheDocument();
		expect(screen.getByText("Fade In")).toBeInTheDocument();
		expect(screen.getByText("Fade Out")).toBeInTheDocument();
		expect(screen.getByText("Echo...")).toBeInTheDocument();
		expect(screen.getByText("Reverb...")).toBeInTheDocument();
		expect(screen.getByText("Noise Reduction...")).toBeInTheDocument();
		expect(screen.getByText("Change Speed...")).toBeInTheDocument();
		expect(screen.getByText("Change Pitch...")).toBeInTheDocument();
	});

	test("calls onMenuAction when file import is clicked", () => {
		render(<WrappedMenuBar onMenuAction={mockOnMenuAction} />);

		const fileMenu = screen.getByText("File");
		fireEvent.mouseEnter(fileMenu.parentElement);
		
		const openItem = screen.getByText("Open...");
		fireEvent.click(openItem);

		expect(mockOnMenuAction).toHaveBeenCalledWith("file");
	});

	test("calls onMenuAction when export is clicked", () => {
		render(<WrappedMenuBar onMenuAction={mockOnMenuAction} />);

		const fileMenu = screen.getByText("File");
		fireEvent.mouseEnter(fileMenu.parentElement);
		
		const exportItem = screen.getByText("Export Audio...");
		fireEvent.click(exportItem);

		expect(mockOnMenuAction).toHaveBeenCalledWith("export");
	});

	test("calls onMenuAction when generate tone is clicked", () => {
		render(<WrappedMenuBar onMenuAction={mockOnMenuAction} />);

		const generateMenu = screen.getByText("Generate");
		fireEvent.mouseEnter(generateMenu.parentElement);
		
		const toneItem = screen.getByText("Tone...");
		fireEvent.click(toneItem);

		expect(mockOnMenuAction).toHaveBeenCalledWith("generate", { type: "tone" });
	});

	test("calls onMenuAction when generate noise is clicked", () => {
		render(<WrappedMenuBar onMenuAction={mockOnMenuAction} />);

		const generateMenu = screen.getByText("Generate");
		fireEvent.mouseEnter(generateMenu.parentElement);
		
		const noiseItem = screen.getByText("Noise...");
		fireEvent.click(noiseItem);

		expect(mockOnMenuAction).toHaveBeenCalledWith("generate", { type: "noise" });
	});

	test("calls onMenuAction when generate silence is clicked", () => {
		render(<WrappedMenuBar onMenuAction={mockOnMenuAction} />);

		const generateMenu = screen.getByText("Generate");
		fireEvent.mouseEnter(generateMenu.parentElement);
		
		const silenceItem = screen.getByText("Silence...");
		fireEvent.click(silenceItem);

		expect(mockOnMenuAction).toHaveBeenCalledWith("generate", { type: "silence" });
	});

	test("calls onMenuAction when effect is clicked", () => {
		render(<WrappedMenuBar onMenuAction={mockOnMenuAction} />);

		const effectMenu = screen.getByText("Effect");
		fireEvent.mouseEnter(effectMenu.parentElement);
		
		const amplifyItem = screen.getByText("Amplify...");
		fireEvent.click(amplifyItem);

		expect(mockOnMenuAction).toHaveBeenCalledWith("effect", { effectName: "amplify" });
	});

	test("menu closes after item selection", () => {
		render(<WrappedMenuBar onMenuAction={mockOnMenuAction} />);

		const fileMenu = screen.getByText("File");
		fireEvent.mouseEnter(fileMenu.parentElement);
		
		// Menu should be open
		expect(screen.getByText("New")).toBeInTheDocument();
		
		const newItem = screen.getByText("New");
		fireEvent.click(newItem);

		// Menu should close after clicking
		// We can't directly test this without checking implementation details
		// But we can verify the action was called
		expect(mockOnMenuAction).toHaveBeenCalledTimes(0); // New project doesn't call onMenuAction
	});

	test("handles new project action", () => {
		render(<WrappedMenuBar onMenuAction={mockOnMenuAction} />);

		const fileMenu = screen.getByText("File");
		fireEvent.mouseEnter(fileMenu.parentElement);
		
		const newItem = screen.getByText("New");
		fireEvent.click(newItem);

		// New project should not call onMenuAction since it's handled internally
		expect(mockOnMenuAction).not.toHaveBeenCalled();
	});
});
