"use client";

import { useEffect, useState } from "react";
import {
  Armchair,
  CalendarDays,
  Clock,
  Mail,
  Save,
  Ticket,
  UserRound,
  X,
} from "lucide-react";
import { ProgressMeter, StatusBadge } from "./shared";
import {
  bookedSeats,
  dateParts,
  formatDateTime,
  initials,
  relativeTime,
  seatsLeft,
  type Registration,
  type Role,
  type WorkshopDetail,
  type WorkshopPayload,
} from "./types";

type ManageWorkshopModalProps = {
  role: Role;
  workshop: WorkshopDetail | null;
  loading: boolean;
  busy: boolean;
  onClose: () => void;
  onRegister: (payload: { attendeeName: string; attendeeEmail: string }) => void;
  onCancelRegistration: (registration: Registration) => void;
  onUpdate: (payload: Partial<WorkshopPayload>) => void;
};

const STATUS_OPTIONS = ["SCHEDULED", "COMPLETED", "CANCELLED"];

export function ManageWorkshopModal({
  role,
  workshop,
  loading,
  busy,
  onClose,
  onRegister,
  onCancelRegistration,
  onUpdate,
}: ManageWorkshopModalProps) {
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");

  // The parent keys this modal by workshop id, so the form is seeded once per
  // workshop instead of being synced from props inside an effect.
  const [title, setTitle] = useState(workshop?.title ?? "");
  const [instructor, setInstructor] = useState(workshop?.instructor ?? "");
  const [capacity, setCapacity] = useState(workshop ? String(workshop.capacity) : "");
  const [status, setStatus] = useState(workshop?.status ?? "SCHEDULED");

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

  const handleRegister = (event: React.FormEvent) => {
    event.preventDefault();
    onRegister({
      attendeeName: attendeeName.trim(),
      attendeeEmail: attendeeEmail.trim(),
    });
  };

  const handleUpdate = (event: React.FormEvent) => {
    event.preventDefault();
    onUpdate({
      title: title.trim(),
      instructor: instructor.trim(),
      capacity: Math.max(Number(capacity) || 1, 1),
      status,
    });
  };

  const booked = workshop ? bookedSeats(workshop) : 0;
  const left = workshop ? seatsLeft(workshop) : 0;
  const parts = workshop ? dateParts(workshop.date) : null;
  const registrations = workshop?.registrations ?? [];

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card wide"
        role="dialog"
        aria-modal="true"
        aria-label="Manage workshop"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow accent">{workshop ? workshop.code : "Workshop"}</p>
            <h3>{workshop ? workshop.title : "Loading workshop…"}</h3>
          </div>
          <div className="workshop-actions">
            {workshop ? <StatusBadge status={workshop.status} /> : null}
            <button
              className="close-button"
              onClick={onClose}
              aria-label="Close dialog"
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {loading || !workshop ? (
          <div className="skeleton-body">
            <div className="skeleton skull-lg" />
            <div className="skeleton skull-sm" />
            <div className="skeleton skull-xs" />
          </div>
        ) : (
          <>
            <div className="manage-grid">
              <section className="manage-col">
                <p className="eyebrow accent">Details</p>
                <ul className="detail-list">
                  <li>
                    <span>
                      <CalendarDays size={13} /> Date &amp; time
                    </span>
                    <strong>{formatDateTime(workshop.date)}</strong>
                  </li>
                  <li>
                    <span>
                      <Clock size={13} /> Start
                    </span>
                    <strong>{parts?.time}</strong>
                  </li>
                  <li>
                    <span>
                      <UserRound size={13} /> Instructor
                    </span>
                    <strong>{workshop.instructor}</strong>
                  </li>
                  <li>
                    <span>
                      <Ticket size={13} /> Capacity
                    </span>
                    <strong>{workshop.capacity} seats</strong>
                  </li>
                  <li>
                    <span>
                      <Armchair size={13} /> Seats left
                    </span>
                    <strong>{left === 0 ? "None — waitlist" : left}</strong>
                  </li>
                </ul>

                <ProgressMeter booked={booked} capacity={workshop.capacity} />
              </section>

              <section className="manage-col">
                <p className="eyebrow accent">Register an attendee</p>
                <form className="modal-form small" onSubmit={handleRegister}>
                  <label>
                    <span>Full name</span>
                    <input
                      value={attendeeName}
                      onChange={(event) => setAttendeeName(event.target.value)}
                      placeholder="Attendee name"
                      required
                    />
                  </label>
                  <label>
                    <span>Email address</span>
                    <div className="input-icon">
                      <Mail size={16} />
                      <input
                        type="email"
                        value={attendeeEmail}
                        onChange={(event) => setAttendeeEmail(event.target.value)}
                        placeholder="attendee@email.com"
                        required
                      />
                    </div>
                  </label>

                  <p className="empty-copy">
                    {left === 0
                      ? "This session is full — the attendee will be waitlisted."
                      : `${left} seat${left === 1 ? "" : "s"} available.`}
                  </p>

                  <button className="btn btn-primary" type="submit" disabled={busy}>
                    <Ticket size={16} />
                    {busy ? "Saving…" : "Register attendee"}
                  </button>
                </form>
              </section>
            </div>

            {role === "MANAGER" ? (
              <section className="manage-col" style={{ marginBottom: 20 }}>
                <p className="eyebrow accent">Update workshop</p>
                <form className="modal-form small" onSubmit={handleUpdate}>
                  <div className="form-row">
                    <label>
                      <span>Title</span>
                      <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      <span>Instructor</span>
                      <input
                        value={instructor}
                        onChange={(event) => setInstructor(event.target.value)}
                        required
                      />
                    </label>
                  </div>
                  <div className="form-row">
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
                    <label>
                      <span>Status</span>
                      <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button className="btn btn-secondary" type="submit" disabled={busy}>
                    <Save size={16} />
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                </form>
              </section>
            ) : null}

            <div className="section-header compact">
              <div>
                <p className="eyebrow accent">Attendees</p>
                <h3>Registration history</h3>
              </div>
              <span>
                {registrations.length} record
                {registrations.length === 1 ? "" : "s"}
              </span>
            </div>

            {registrations.length === 0 ? (
              <p className="empty-copy">
                Nobody has registered for this workshop yet.
              </p>
            ) : (
              <div className="registrations-list">
                {registrations.map((registration) => (
                  <div
                    className={`registration-row ${
                      registration.status === "CANCELLED" ? "is-cancelled" : ""
                    }`.trim()}
                    key={registration.id}
                  >
                    <span className="avatar sm">
                      {initials(registration.attendeeName || registration.attendeeEmail)}
                    </span>

                    <div className="reg-main">
                      <strong>{registration.attendeeName}</strong>
                      <small>{registration.attendeeEmail}</small>
                      <div className="reg-history">
                        <span>
                          Registered {relativeTime(registration.createdAt)} ·{" "}
                          <span className="reg-actor">
                            {registration.createdBy?.email ?? "unknown staff"}
                          </span>
                        </span>
                        {registration.cancelledAt ? (
                          <span className="cancelled-note">
                            Cancelled {relativeTime(registration.cancelledAt)} ·{" "}
                            {registration.cancelledBy?.email ?? "unknown staff"}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="reg-actions">
                      <StatusBadge status={registration.status} />
                      {registration.status !== "CANCELLED" ? (
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => onCancelRegistration(registration)}
                          disabled={busy}
                        >
                          <X size={13} />
                          Cancel seat
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
