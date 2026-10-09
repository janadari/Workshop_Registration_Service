"use client";

import { useState } from "react";
import {
  Activity,
  ArrowUpCircle,
  Ban,
  CalendarDays,
  Hourglass,
  Pencil,
  Ticket,
  UserPlus,
} from "lucide-react";
import { EmptyState, SkeletonList } from "./shared";
import {
  ACTION_META,
  describeDetails,
  relativeTime,
  type AuditEntry,
} from "./types";

const ICONS: Record<string, typeof Activity> = {
  CREATE_USER: UserPlus,
  UPDATE_USER: Pencil,
  CREATE_WORKSHOP: CalendarDays,
  UPDATE_WORKSHOP: Pencil,
  REGISTER_WORKSHOP: Ticket,
  JOIN_WAITLIST: Hourglass,
  CANCEL_REGISTRATION: Ban,
  PROMOTE_WAITLIST: ArrowUpCircle,
};

const TONES: Record<string, string> = {
  cyan: "timeline-icon",
  amber: "timeline-icon amber",
  green: "timeline-icon green",
  rose: "timeline-icon rose",
  violet: "timeline-icon",
};

type ActivityViewProps = {
  entries: AuditEntry[];
  loading: boolean;
};

export function ActivityView({ entries, loading }: ActivityViewProps) {
  const [actionFilter, setActionFilter] = useState("ALL");

  const actions = Array.from(new Set(entries.map((entry) => entry.action)));
  const visible =
    actionFilter === "ALL"
      ? entries
      : entries.filter((entry) => entry.action === actionFilter);

  return (
    <>
      <div className="section-header">
        <div>
          <h2>Activity log</h2>
          <span>
            {visible.length} of {entries.length} events · who did what, and when
          </span>
        </div>
        <select
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          aria-label="Filter activity by action"
        >
          <option value="ALL">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {ACTION_META[action]?.label ?? action}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <SkeletonList rows={4} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Activity size={26} />}
          title="No activity recorded"
          description="Registrations, cancellations and account changes will appear here as they happen."
        />
      ) : (
        <div className="card activity-panel">
          <div className="timeline">
            {visible.map((entry) => {
              const meta = ACTION_META[entry.action];
              const Icon = ICONS[entry.action] ?? Activity;
              const tone = TONES[meta?.tone ?? ""] ?? "timeline-icon";

              return (
                <div className="timeline-item" key={entry.id}>
                  <span className={tone}>
                    <Icon size={16} />
                  </span>
                  <div className="timeline-body">
                    <strong>{meta?.label ?? entry.action.replace(/_/g, " ").toLowerCase()}</strong>
                    <span>
                      {entry.user?.email ?? "Unknown user"}
                      {describeDetails(entry.details)
                        ? ` · ${describeDetails(entry.details)}`
                        : ""}
                    </span>
                  </div>
                  <span className="timeline-meta">
                    {relativeTime(entry.createdAt)}
                    <br />
                    {entry.entity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
