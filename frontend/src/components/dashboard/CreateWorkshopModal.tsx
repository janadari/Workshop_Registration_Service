"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, X } from "lucide-react";
import type { WorkshopPayload } from "./types";

type CreateWorkshopModalProps = {
  busy: boolean;
  onSubmit: (payload: WorkshopPayload) => void;
  onClose: () => void;
};

export function CreateWorkshopModal({
  busy,
  onSubmit,
  onClose,
}: CreateWorkshopModalProps) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [instructor, setInstructor] = useState("");
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState("20");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      code: code.trim(),
      title: title.trim(),
      instructor: instructor.trim(),
      date,
      capacity: Math.max(Number(capacity) || 1, 1),
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Create workshop"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow accent">New session</p>
            <h3>Create workshop</h3>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close dialog"
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              <span>Workshop code</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="WS-101"
                required
              />
            </label>
            <label>
              <span>Capacity</span>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                required
              />
            </label>
          </div>

          <label>
            <span>Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Introduction to woodworking"
              required
            />
          </label>

          <label>
            <span>Instructor</span>
            <input
              value={instructor}
              onChange={(event) => setInstructor(event.target.value)}
              placeholder="Full name"
              required
            />
          </label>

          <label>
            <span>Date &amp; time</span>
            <input
              type="datetime-local"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>

          <div className="form-actions">
            <button
              className="btn btn-secondary"
              onClick={onClose}
              type="button"
              disabled={busy}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              <CalendarPlus size={16} />
              {busy ? "Creating…" : "Create workshop"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
