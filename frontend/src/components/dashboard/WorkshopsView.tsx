"use client";

import {
  Armchair,
  CalendarDays,
  Clock,
  ClipboardList,
  Filter,
  Plus,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";
import { EmptyState, ProgressMeter, SkeletonList, StatusBadge } from "./shared";
import {
  bookedSeats,
  dateParts,
  seatsLeft,
  type FilterPreset,
  type Role,
  type Workshop,
  type WorkshopFilters,
} from "./types";

const STATUS_OPTIONS = ["ALL", "SCHEDULED", "COMPLETED", "CANCELLED"];

const PRESETS: { key: FilterPreset; label: string }[] = [
  { key: "all", label: "All sessions" },
  { key: "upcoming", label: "Upcoming" },
  { key: "next7", label: "Next 7 days" },
  { key: "available", label: "Has seats" },
  { key: "full", label: "Fully booked" },
];

type WorkshopsViewProps = {
  role: Role;
  workshops: Workshop[];
  visible: Workshop[];
  loading: boolean;
  filters: WorkshopFilters;
  onFilterChange: (patch: Partial<WorkshopFilters>) => void;
  onApplyPreset: (preset: FilterPreset) => void;
  onResetFilters: () => void;
  onAddWorkshop: () => void;
  onManage: (workshop: Workshop) => void;
};

export function WorkshopsView({
  role,
  workshops,
  visible,
  loading,
  filters,
  onFilterChange,
  onApplyPreset,
  onResetFilters,
  onAddWorkshop,
  onManage,
}: WorkshopsViewProps) {
  const filtersActive =
    filters.query !== "" ||
    filters.status !== "ALL" ||
    filters.availability !== "ALL" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    filters.preset !== "all";

  return (
    <>
      <section className="card filters">
        <div className="filters-row">
          <div className="search-field">
            <Search size={16} />
            <input
              type="search"
              value={filters.query}
              onChange={(event) => onFilterChange({ query: event.target.value })}
              placeholder="Search by title, code or instructor…"
              aria-label="Search workshops"
            />
          </div>

          <select
            value={filters.status}
            onChange={(event) => onFilterChange({ status: event.target.value })}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? "Any status" : option}
              </option>
            ))}
          </select>

          <select
            value={filters.availability}
            onChange={(event) =>
              onFilterChange({
                availability: event.target.value as WorkshopFilters["availability"],
                preset: "custom",
              })
            }
            aria-label="Filter by availability"
          >
            <option value="ALL">Any availability</option>
            <option value="AVAILABLE">Seats available</option>
            <option value="FULL">Fully booked</option>
          </select>

          <button
            className="btn btn-ghost btn-sm"
            onClick={onResetFilters}
            type="button"
            disabled={!filtersActive}
          >
            <RotateCcw size={15} />
            Reset
          </button>
        </div>

        <div className="filters-row">
          <div className="field-inline">
            <label htmlFor="date-from">From</label>
            <input
              id="date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                onFilterChange({ dateFrom: event.target.value, preset: "custom" })
              }
            />
          </div>
          <div className="field-inline">
            <label htmlFor="date-to">To</label>
            <input
              id="date-to"
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                onFilterChange({ dateTo: event.target.value, preset: "custom" })
              }
            />
          </div>
          <span className="empty-copy">
            <Filter size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
            Narrow the catalogue by date, status or seat availability.
          </span>
        </div>

        <div className="filters-divider" />

        <div className="chips">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={`chip ${filters.preset === preset.key ? "active" : ""}`}
              onClick={() => onApplyPreset(preset.key)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <div className="section-header">
        <div>
          <h2>Workshop catalogue</h2>
          <span>
            Showing {visible.length} of {workshops.length} workshops
          </span>
        </div>
        {role === "MANAGER" ? (
          <button className="btn btn-primary btn-sm" onClick={onAddWorkshop} type="button">
            <Plus size={15} />
            Add workshop
          </button>
        ) : (
          <span className="empty-copy">
            Registrations are handled per workshop below.
          </span>
        )}
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={26} />}
          title={workshops.length === 0 ? "No workshops yet" : "No workshops match your filters"}
          description={
            workshops.length === 0
              ? "Create the first workshop to start taking registrations."
              : "Try widening the date range, clearing the search box or switching to “All sessions”."
          }
        />
      ) : (
        <div className="stack-list">
          {visible.map((workshop) => {
            const booked = bookedSeats(workshop);
            const left = seatsLeft(workshop);
            const { dow, dom, mon, time } = dateParts(workshop.date);

            return (
              <article className="card workshop-card" key={workshop.id}>
                <div className="date-tile">
                  <span className="dow">{dow}</span>
                  <strong className="dom">{dom}</strong>
                  <span className="mon">{mon}</span>
                </div>

                <div className="workshop-main">
                  <div className="workshop-header">
                    <div>
                      <p className="workshop-code">{workshop.code}</p>
                      <h3>{workshop.title}</h3>
                    </div>
                    <StatusBadge status={workshop.status} />
                  </div>

                  <div className="meta-row">
                    <span className="meta-chip">
                      <Clock size={14} />
                      {time}
                    </span>
                    <span className="meta-chip">
                      <UserRound size={14} />
                      {workshop.instructor}
                    </span>
                    <span className={`meta-chip ${left === 0 ? "warn" : ""}`.trim()}>
                      <Armchair size={14} />
                      {left === 0 ? "Waitlist only" : `${left} seat${left === 1 ? "" : "s"} left`}
                    </span>
                  </div>

                  <ProgressMeter booked={booked} capacity={workshop.capacity} />
                </div>

                <div className="workshop-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onManage(workshop)}
                    type="button"
                  >
                    <ClipboardList size={15} />
                    Manage
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
