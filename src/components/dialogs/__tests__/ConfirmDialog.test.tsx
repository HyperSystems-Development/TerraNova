import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ConfirmDialog } from "../ConfirmDialog";

describe("ConfirmDialog", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: "Test Dialog",
    message: "Are you sure you want to proceed?",
    confirmLabel: "Confirm",
    onConfirm: vi.fn(),
    cancelLabel: "Cancel",
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when open", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Test Dialog")).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to proceed?")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText("Test Dialog")).not.toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);
    const confirmButton = screen.getByText("Confirm");
    fireEvent.click(confirmButton);
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancel button is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);
    const backdrop = screen.getByRole("dialog").parentElement;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    }
  });

  it("does not call onConfirm when buttons are disabled during loading", () => {
    render(<ConfirmDialog {...defaultProps} loading={true} />);
    const confirmButton = screen.getByText("Saving...");
    fireEvent.click(confirmButton);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it("has proper dialog role and ARIA attributes", () => {
    render(<ConfirmDialog {...defaultProps} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "dialog-title");
  });

  it("title has proper ID for ARIA reference", () => {
    render(<ConfirmDialog {...defaultProps} />);
    const title = screen.getByText("Test Dialog");
    expect(title).toHaveAttribute("id", "dialog-title");
  });

  it("supports secondary action button", () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        secondaryLabel="Delete"
        onSecondary={vi.fn()}
      />
    );
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls onSecondary when secondary button is clicked", () => {
    const onSecondary = vi.fn();
    render(
      <ConfirmDialog
        {...defaultProps}
        secondaryLabel="Delete"
        onSecondary={onSecondary}
      />
    );
    const secondaryButton = screen.getByText("Delete");
    fireEvent.click(secondaryButton);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it("focuses confirm button on open", () => {
    render(<ConfirmDialog {...defaultProps} />);
    const confirmButton = screen.getByText("Confirm");
    expect(confirmButton).toHaveFocus();
  });
});
