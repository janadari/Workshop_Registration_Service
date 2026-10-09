"use client";

import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import type { Role, UserPayload } from "./types";

type CreateUserModalProps = {
  busy: boolean;
  onSubmit: (payload: UserPayload) => void;
  onClose: () => void;
};

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: "STAFF", label: "Staff", hint: "Register & cancel attendees" },
  { value: "MANAGER", label: "Manager", hint: "Workshops, registrations & history" },
  { value: "ADMIN", label: "Admin", hint: "Create accounts & view logs" },
];

export function CreateUserModal({
  busy,
  onSubmit,
  onClose,
}: CreateUserModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STAFF");

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
    onSubmit({ email: email.trim(), password, role });
  };

  const active = ROLES.find((item) => item.value === role);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Create user account"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow accent">Access control</p>
            <h3>Create user account</h3>
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
          <label>
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="new.staff@centre.org"
              required
            />
          </label>

          <label>
            <span>Temporary password</span>
            <input
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </label>

          <label>
            <span>Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              {ROLES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {active ? <p className="empty-copy">{active.hint}</p> : null}

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
              <UserPlus size={16} />
              {busy ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
