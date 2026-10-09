import { format, parseISO } from "date-fns";

export type Role = "ADMIN" | "MANAGER" | "STAFF";

export type ViewKey = "overview" | "workshops" | "users" | "activity";

export type Workshop = {
  id: string;
  code: string;
  title: string;
  instructor: string;
  date: string;
  capacity: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: { registrations: number };
};

export type Registration = {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  status: string;
  createdAt: string;
  cancelledAt?: string | null;
  createdBy?: { email: string; role: string } | null;
  cancelledBy?: { email: string; role: string } | null;
};

export type WorkshopDetail = Workshop & { registrations: Registration[] };

export type UserAccount = {
  id: string;
  email: string;
  role: Role;
  createdAt?: string;
};

export type AuditEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details?: string | null;
  createdAt: string;
  user?: { email: string } | null;
};

export type WorkshopPayload = {
  code: string;
  title: string;
  instructor: string;
  date: string;
  capacity: number;
  status?: string;
};

export type RegistrationPayload = {
  workshopId: string;
  attendeeName: string;
  attendeeEmail: string;
};

export type UserPayload = {
  email: string;
  password: string;
  role: Role;
};

/*
 * Seat maths.
 *
 * Two shapes reach these helpers: list rows carry `_count.registrations`
 * (already filtered to ACTIVE by the API) while the detail response carries the
 * full `registrations` array, cancelled history included. Counting that raw
 * array would over-report bookings, so the fallback below filters on status; the
 * `_count` branch is preferred whenever it is present because the database does
 * the counting. Without the fallback a response that omits `_count` silently
 * reported an empty workshop (full capacity "left", 0% fill rate).
 */
export function bookedSeats(workshop: {
  _count?: { registrations: number };
  registrations?: { status: string }[];
}) {
  if (typeof workshop._count?.registrations === "number") {
    return workshop._count.registrations;
  }
  return workshop.registrations?.filter((entry) => entry.status === "ACTIVE").length ?? 0;
}

export function seatsLeft(workshop: Workshop) {
  return Math.max(workshop.capacity - bookedSeats(workshop), 0);
}

export function fillRate(workshop: Workshop) {
  if (!workshop.capacity) return 0;
  return Math.min(Math.round((bookedSeats(workshop) / workshop.capacity) * 100), 100);
}

export function initials(value?: string | null) {
  const source = (value ?? "").trim();
  if (!source) return "??";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || source.slice(0, 2).toUpperCase();
}

export function formatDateTime(value: string) {
  try {
    return format(parseISO(value), "d MMM yyyy · HH:mm");
  } catch {
    return value;
  }
}

export function relativeTime(value: string) {
  try {
    return `${format(parseISO(value), "d MMM")} · ${formatDistanceShort(value)}`;
  } catch {
    return value;
  }
}

function formatDistanceShort(value: string) {
  const diff = Date.now() - parseISO(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return format(parseISO(value), "d MMM yyyy");
}

export const ACTION_META: Record<string, { label: string; tone: string }> = {
  CREATE_USER: { label: "User account created", tone: "cyan" },
  UPDATE_USER: { label: "User account updated", tone: "amber" },
  CREATE_WORKSHOP: { label: "Workshop created", tone: "violet" },
  UPDATE_WORKSHOP: { label: "Workshop updated", tone: "amber" },
  REGISTER_WORKSHOP: { label: "Attendee registered", tone: "green" },
  JOIN_WAITLIST: { label: "Attendee waitlisted", tone: "amber" },
  CANCEL_REGISTRATION: { label: "Registration cancelled", tone: "rose" },
  PROMOTE_WAITLIST: { label: "Waitlist seat released", tone: "green" },
};

export function describeDetails(details?: string | null) {
  if (!details) return "";
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    return Object.entries(parsed)
      .map(([key, value]) => `${key.replace(/([A-Z])/g, " $1").toLowerCase()}: ${String(value)}`)
      .join(" · ");
  } catch {
    return details;
  }
}

export function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

export function addDaysIso(days: number) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return format(next, "yyyy-MM-dd");
}
export type Availability = "ALL" | "AVAILABLE" | "FULL";

export type FilterPreset = "all" | "upcoming" | "next7" | "available" | "full" | "custom";

export type WorkshopFilters = {
  query: string;
  status: string;
  availability: Availability;
  dateFrom: string;
  dateTo: string;
  preset: FilterPreset;
};

export const EMPTY_FILTERS: WorkshopFilters = {
  query: "",
  status: "ALL",
  availability: "ALL",
  dateFrom: "",
  dateTo: "",
  preset: "all",
};

export function dateParts(value: string) {
  try {
    const parsed = parseISO(value);
    return {
      dow: format(parsed, "EEE"),
      dom: format(parsed, "d"),
      mon: format(parsed, "MMM"),
      time: format(parsed, "HH:mm"),
    };
  } catch {
    return { dow: "—", dom: "—", mon: "—", time: "—" };
  }
}

export function matchesFilters(workshop: Workshop, filters: WorkshopFilters) {
  const query = filters.query.trim().toLowerCase();
  if (query) {
    const haystack = [workshop.title, workshop.code, workshop.instructor]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  if (filters.status !== "ALL" && workshop.status !== filters.status) return false;

  const booked = bookedSeats(workshop);
  if (filters.availability === "AVAILABLE" && booked >= workshop.capacity) return false;
  if (filters.availability === "FULL" && booked < workshop.capacity) return false;

  if (filters.dateFrom || filters.dateTo) {
    const time = parseISO(workshop.date).getTime();
    if (Number.isNaN(time)) return true;
    if (filters.dateFrom && time < parseISO(`${filters.dateFrom}T00:00:00`).getTime()) {
      return false;
    }
    if (filters.dateTo && time > parseISO(`${filters.dateTo}T23:59:59`).getTime()) {
      return false;
    }
  }

  return true;
}

