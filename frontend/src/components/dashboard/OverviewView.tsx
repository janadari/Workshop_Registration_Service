"use client";

import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Gauge,
  Plus,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { StatCard } from "./shared";
import { bookedSeats, fillRate, relativeTime, type AuditEntry, type Workshop } from "./types";

const RULES = [
  "Capacity is enforced by the API — registrations beyond the limit are rejected with a clear error.",
  "When a workshop is full, attendees are added to a waitlist in arrival order.",
  "Every registration and cancellation is logged with the staff member and timestamp.",
  "Cancellations keep their history so attendance can always be audited.",
];

type OverviewViewProps = {
  workshops: Workshop[];
  auditEntries: AuditEntry[];
  onAddWorkshop: () => void;
  onOpenWorkshop: (workshop: Workshop) => void;
  onGoToWorkshops: () => void;
};

export function OverviewView({
  workshops,
  auditEntries,
  onAddWorkshop,
  onOpenWorkshop,
  onGoToWorkshops,
}: OverviewViewProps) {
  const totalBooked = workshops.reduce((sum, item) => sum + bookedSeats(item), 0);
  const totalCapacity = workshops.reduce((sum, item) => sum + item.capacity, 0);
  const upcoming = workshops.filter(
    (item) => item.status === "SCHEDULED" && new Date(item.date) >= new Date(),
  ).length;
  const fullyBooked = workshops.filter(
    (item) => bookedSeats(item) >= item.capacity,
  ).length;
  const utilisation = totalCapacity
    ? Math.round((totalBooked / totalCapacity) * 100)
    : 0;

  const watchlist = [...workshops]
    .sort((a, b) => fillRate(b) - fillRate(a))
    .slice(0, 4);

  return (
    <>
      <section className="card hero-panel">
        <div className="hero-copy">
          <p className="eyebrow gold">Operations centre</p>
          <h2>Good to see you back.</h2>
          <p className="hero-text">
            {workshops.length === 0
              ? "You have no workshops on the books yet. Create the first session and registrations will start rolling in."
              : `${upcoming} scheduled session${upcoming === 1 ? "" : "s"} are on the calendar with ${Math.max(totalCapacity - totalBooked, 0)} seats still open.`}
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary" onClick={onAddWorkshop} type="button">
              <Plus size={16} />
              Create workshop
            </button>
            <button
              className="btn btn-secondary"
              onClick={onGoToWorkshops}
              type="button"
            >
              Browse catalogue
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="hero-metrics">
            <div className="hero-metric">
              <strong>{utilisation}%</strong>
              <span>Seat utilisation</span>
            </div>
            <div className="hero-metric">
              <strong>{totalBooked}</strong>
              <span>Registered seats</span>
            </div>
            <div className="hero-metric">
              <strong>{fullyBooked}</strong>
              <span>Full sessions</span>
            </div>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <span className="bar short" />
          <span className="bar mid" />
          <span className="bar tall" />
          <span className="bar long" />
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          icon={<Ticket size={19} />}
          tone="green"
          label="Registrations"
          value={totalBooked}
          foot="Active seats across all workshops"
        />
        <StatCard
          icon={<Users size={19} />}
          tone="cyan"
          label="Total capacity"
          value={totalCapacity}
          foot={`${Math.max(totalCapacity - totalBooked, 0)} seats remaining`}
        />
        <StatCard
          icon={<CalendarClock size={19} />}
          tone="violet"
          label="Upcoming"
          value={upcoming}
          foot="Scheduled sessions from today"
        />
        <StatCard
          icon={fullyBooked > 0 ? <AlertTriangle size={19} /> : <Gauge size={19} />}
          tone={fullyBooked > 0 ? "rose" : "amber"}
          label="Fully booked"
          value={fullyBooked}
          foot={fullyBooked > 0 ? "Waitlist in effect" : "All sessions have room"}
        />
      </section>

      <section className="info-grid">
        <article className="card panel-card">
          <p className="eyebrow accent">Operating rules</p>
          <h3>How registrations behave</h3>
          <ul>
            {RULES.map((rule) => (
              <li key={rule} className="rule-item">
                <ShieldCheck size={16} />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="card panel-card">
          <p className="eyebrow accent">Capacity watchlist</p>
          <h3>Sessions closest to capacity</h3>

          {watchlist.length === 0 ? (
            <p className="empty-copy">No workshops to watch yet.</p>
          ) : (
            <div className="watchlist">
              {watchlist.map((workshop) => {
                const rate = fillRate(workshop);
                const tone = bookedSeats(workshop) >= workshop.capacity
                  ? "full"
                  : rate >= 80
                    ? "warn"
                    : "";
                return (
                  <button
                    className="watch-item"
                    key={workshop.id}
                    onClick={() => onOpenWorkshop(workshop)}
                    type="button"
                  >
                    <span className="watch-copy">
                      <strong>{workshop.title}</strong>
                      <span>
                        {workshop.code} · {bookedSeats(workshop)}/{workshop.capacity} seats
                      </span>
                    </span>
                    <span className={`watch-meter ${tone}`.trim()}>
                      <i style={{ width: `${rate}%` }} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </article>
      </section>

      <section className="card panel-card">
        <div className="section-header compact">
          <div>
            <p className="eyebrow accent">Recent movement</p>
            <h3>Latest registrations &amp; cancellations</h3>
          </div>
          <span>{auditEntries.length} logged events</span>
        </div>

        {auditEntries.length === 0 ? (
          <p className="empty-copy">No activity has been recorded yet.</p>
        ) : (
          <div className="timeline">
            {auditEntries.slice(0, 4).map((entry) => (
              <div className="timeline-item" key={entry.id}>
                <span className="timeline-icon">
                  <Sparkles size={16} />
                </span>
                <div className="timeline-body">
                  <strong>{entry.action.replace(/_/g, " ").toLowerCase()}</strong>
                  <span>
                    {entry.user?.email ?? "Unknown user"} · {entry.entity}
                  </span>
                </div>
                <span className="timeline-meta">{relativeTime(entry.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
