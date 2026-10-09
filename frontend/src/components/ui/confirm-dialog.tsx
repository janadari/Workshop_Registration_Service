"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type ConfirmDialogProps = {
  eyebrow?: string;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  eyebrow = "Please confirm",
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Keep it",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onCancel]);

  return (
    <div className="modal-backdrop" onClick={onCancel} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow accent">{eyebrow}</p>
            <h3>{title}</h3>
          </div>
          <button
            className="close-button"
            onClick={onCancel}
            aria-label="Close dialog"
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        <p className="confirm-copy">{description}</p>

        <div className="form-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            type="button"
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            type="button"
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
