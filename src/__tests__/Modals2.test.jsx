import { render } from "@testing-library/react";
import React from "react";
import {
	AboutModal,
	ConfirmModal,
	EffectModal,
	ExportModal,
	FileModal,
	GenerateModal,
	HelpModal,
	Modal,
	PreferencesModal,
	SpectrumModal,
} from "../components/Modals";

describe("Modal Components", () => {
	describe("Base Modal", () => {
		it("renders when isOpen is true", () => {
			render(
				<Modal isOpen={true} onClose={() => {}}>
					Test content
				</Modal>,
			);
			const modal = document.querySelector(".modal-overlay");
			expect(modal).toBeInTheDocument();
		});

		it("does not render when isOpen is false", () => {
			render(
				<Modal isOpen={false} onClose={() => {}}>
					Test content
				</Modal>,
			);
			const modal = document.querySelector(".modal");
			expect(modal).not.toBeInTheDocument();
		});
	});

	describe("ConfirmModal", () => {
		it("renders confirm modal", () => {
			render(
				<ConfirmModal
					isOpen={true}
					onClose={() => {}}
					onConfirm={() => {}}
					title="Test"
					message="Test message"
				/>,
			);
			const modal = document.querySelector(".modal-overlay");
			expect(modal).toBeInTheDocument();
		});
	});

	describe("PreferencesModal", () => {
		it("renders preferences modal", () => {
			render(
				<PreferencesModal
					isOpen={true}
					onClose={() => {}}
					onSave={() => {}}
					preferences={{}}
				/>,
			);
			const modal = document.querySelector(".modal-overlay");
			expect(modal).toBeInTheDocument();
		});
	});

	describe("AboutModal", () => {
		it("renders about modal", () => {
			render(<AboutModal isOpen={true} onClose={() => {}} />);
			const modal = document.querySelector(".modal-overlay");
			expect(modal).toBeInTheDocument();
		});
	});

	describe("HelpModal", () => {
		it("renders help modal", () => {
			render(<HelpModal isOpen={true} onClose={() => {}} />);
			const modal = document.querySelector(".modal-overlay");
			expect(modal).toBeInTheDocument();
		});
	});

	describe("SpectrumModal", () => {
		it("renders spectrum modal", () => {
			render(<SpectrumModal isOpen={true} onClose={() => {}} />);
			const modal = document.querySelector(".modal-overlay");
			expect(modal).toBeInTheDocument();
		});
	});
});
