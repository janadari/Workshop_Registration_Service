"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Plus,
  Sparkles,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ApiError, fetchApi } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { OverviewView } from "./OverviewView";
import { WorkshopsView } from "./WorkshopsView";
import { UsersView } from "./UsersView";
import { ActivityView } from "./ActivityView";
import { CreateWorkshopModal } from "./CreateWorkshopModal";
import { CreateUserModal } from "./CreateUserModal";
import { ManageWorkshopModal } from "./ManageWorkshopModal";
import {
  EMPTY_FILTERS,
  addDaysIso,
  initials,
  matchesFilters,
  todayIso,
  type AuditEntry,
  type FilterPreset,
  type Registration,
  type Role,
  type UserAccount,
  type UserPayload,
  type ViewKey,
  type Workshop,
  type WorkshopDetail,
  type WorkshopFilters,
  type WorkshopPayload,
} from "./types";

type StoredUser = { id?: string; email: string; role: Role };

type NavItem = {
  key: ViewKey;
  label: string;
  href: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { key: "overview", label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  {
    key: "workshops",
    label: "Workshops",
    href: "/dashboard/workshops",
    icon: CalendarDays,
  },
  { key: "users", label: "Users", href: "/dashboard/users", icon: Users },
  { key: "activity", label: "Activity", href: "/dashboard/activity", icon: Activity },
];

const VIEW_META: Record<ViewKey, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: "Operations centre",
    title: "Overview",
    description: "Capacity, attendance and the sessions that need attention today.",
  },
  workshops: {
    eyebrow: "Workshop catalogue",
    title: "Workshops",
    description:
      "Filter sessions by date range, status or seat availability, then manage registrations.",
  },
  users: {
    eyebrow: "Access control",
    title: "User accounts",
    description: "Create and review the staff, manager and admin accounts for the centre.",
  },
  activity: {
    eyebrow: "Audit trail",
    title: "Activity log",
    description: "Every account, workshop and registration change, newest first.",
  },
};

const HOME_FOR: Record<Role, string> = {
  ADMIN: "/dashboard/users",
  MANAGER: "/dashboard",
  STAFF: "/dashboard/workshops",
};

export function DashboardView({ view }: { view: ViewKey }) {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<StoredUser | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [filters, setFilters] = useState<WorkshopFilters>(EMPTY_FILTERS);

  const [showWorkshopModal, setShowWorkshopModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeWorkshop, setActiveWorkshop] = useState<WorkshopDetail | null>(null);
  const [pendingCancel, setPendingCancel] = useState<Registration | null>(null);

  const handleApiError = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        toast({
          title: "Session expired",
          description: "Please sign in again.",
          variant: "error",
        });
        router.replace("/login");
        return;
      }

      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : fallback,
        variant: "error",
      });
    },
    [router, toast],
  );

  const loadWorkshops = useCallback(async () => {
    try {
      const data = (await fetchApi("/workshops")) as Workshop[];
      setWorkshops(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setWorkshops([]);
        return;
      }
      handleApiError(error, "Could not load workshops.");
    }
  }, [handleApiError]);

  const loadUsers = useCallback(async () => {
    try {
      const data = (await fetchApi("/users")) as UserAccount[];
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      handleApiError(error, "Could not load user accounts.");
    }
  }, [handleApiError]);

  const loadAudit = useCallback(async () => {
    try {
      const data = (await fetchApi("/users/audit")) as AuditEntry[];
      setAuditTrail(Array.isArray(data) ? data : []);
    } catch (error) {
      handleApiError(error, "Could not load the activity log.");
    }
  }, [handleApiError]);

  useEffect(() => {
    const bootstrap = async () => {
      const stored = localStorage.getItem("user");
      if (!stored) {
        router.replace("/login");
        return;
      }

      let parsed: StoredUser;
      try {
        parsed = JSON.parse(stored) as StoredUser;
      } catch {
        localStorage.removeItem("user");
        router.replace("/login");
        return;
      }

      // Restore the session after a microtask boundary so the update is treated
      // as an async one (react-hooks/set-state-in-effect). The shell still paints
      // in the same frame, with skeletons while the data streams in.
      await Promise.resolve();

      setUser(parsed);

      const tasks: Promise<unknown>[] = [loadWorkshops(), loadAudit()];
      if (parsed.role === "ADMIN") tasks.push(loadUsers());
      await Promise.allSettled(tasks);
      setLoading(false);
    };

    void bootstrap();
  }, [loadAudit, loadUsers, loadWorkshops, router]);

  const role: Role = user?.role ?? "STAFF";

  const visibleNavItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (item.key === "users") return role === "ADMIN";
        if (role === "ADMIN") return item.key === "activity";
        if (item.key === "overview") return role === "MANAGER";
        return true;
      }),
    [role],
  );

  const allowed = visibleNavItems.some((item) => item.key === view);
  const safeView: ViewKey = allowed
    ? view
    : role === "ADMIN"
      ? "users"
      : role === "MANAGER"
        ? "overview"
        : "workshops";

  useEffect(() => {
    if (!user) return;
    if (!allowed) router.replace(HOME_FOR[user.role]);
  }, [allowed, router, user]);

  const meta = VIEW_META[safeView];

  const handleFilterChange = useCallback((patch: Partial<WorkshopFilters>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      preset: patch.preset ?? "custom",
    }));
  }, []);

  const applyPreset = useCallback((preset: FilterPreset) => {
    setFilters((current) => {
      switch (preset) {
        case "upcoming":
          return { ...current, preset, availability: "ALL", dateFrom: todayIso(), dateTo: "" };
        case "next7":
          return {
            ...current,
            preset,
            availability: "ALL",
            dateFrom: todayIso(),
            dateTo: addDaysIso(7),
          };
        case "available":
          return { ...current, preset, availability: "AVAILABLE", dateFrom: "", dateTo: "" };
        case "full":
          return { ...current, preset, availability: "FULL", dateFrom: "", dateTo: "" };
        default:
          return { ...EMPTY_FILTERS, query: current.query };
      }
    });
  }, []);

  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const visibleWorkshops = useMemo(
    () =>
      workshops
        .filter((workshop) => matchesFilters(workshop, filters))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [filters, workshops],
  );

  const refreshDetail = useCallback(
    async (workshopId: string) => {
      try {
        const detail = (await fetchApi(`/workshops/${workshopId}`)) as WorkshopDetail;
        setActiveWorkshop(detail);
      } catch (error) {
        handleApiError(error, "Could not refresh the workshop.");
      }
    },
    [handleApiError],
  );

  const handleOpenWorkshop = useCallback(
    async (workshop: Workshop) => {
      setActiveWorkshop(null);
      setDetailOpen(true);
      setDetailLoading(true);
      try {
        const detail = (await fetchApi(`/workshops/${workshop.id}`)) as WorkshopDetail;
        setActiveWorkshop(detail);
      } catch (error) {
        setDetailOpen(false);
        handleApiError(error, "Could not open the workshop.");
      } finally {
        setDetailLoading(false);
      }
    },
    [handleApiError],
  );

  const handleCreateWorkshop = async (payload: WorkshopPayload) => {
    setBusy(true);
    try {
      await fetchApi("/workshops", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast({
        title: "Workshop created",
        description: `${payload.code} · ${payload.title}`,
        variant: "success",
      });
      setShowWorkshopModal(false);
      await Promise.all([loadWorkshops(), loadAudit()]);
    } catch (error) {
      handleApiError(error, "Could not create the workshop.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateUser = async (payload: UserPayload) => {
    setBusy(true);
    try {
      await fetchApi("/users", { method: "POST", body: JSON.stringify(payload) });
      toast({
        title: "Account created",
        description: `${payload.email} can now sign in as ${payload.role.toLowerCase()}.`,
        variant: "success",
      });
      setShowUserModal(false);
      await Promise.all([loadUsers(), loadAudit()]);
    } catch (error) {
      handleApiError(error, "Could not create the account.");
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterAttendee = async (payload: {
    attendeeName: string;
    attendeeEmail: string;
  }) => {
    if (!activeWorkshop) return;
    setBusy(true);
    try {
      await fetchApi("/registrations", {
        method: "POST",
        body: JSON.stringify({ workshopId: activeWorkshop.id, ...payload }),
      });
      toast({
        title: "Attendee registered",
        description: `${payload.attendeeName} is on the list.`,
        variant: "success",
      });
      await Promise.all([refreshDetail(activeWorkshop.id), loadWorkshops(), loadAudit()]);
    } catch (error) {
      handleApiError(error, "Could not register the attendee.");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateWorkshop = async (payload: Partial<WorkshopPayload>) => {
    if (!activeWorkshop) return;
    setBusy(true);
    try {
      await fetchApi(`/workshops/${activeWorkshop.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      toast({
        title: "Workshop updated",
        description: "The changes are live for every staff member.",
        variant: "success",
      });
      await Promise.all([refreshDetail(activeWorkshop.id), loadWorkshops(), loadAudit()]);
    } catch (error) {
      handleApiError(error, "Could not update the workshop.");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!pendingCancel || !activeWorkshop) return;
    setBusy(true);
    try {
      await fetchApi(`/registrations/${pendingCancel.id}/cancel`, { method: "PATCH" });
      toast({
        title: "Registration cancelled",
        description: `${pendingCancel.attendeeName} keeps their record in the history.`,
        variant: "success",
      });
      setPendingCancel(null);
      await Promise.all([refreshDetail(activeWorkshop.id), loadWorkshops(), loadAudit()]);
    } catch (error) {
      handleApiError(error, "Could not cancel the registration.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  };

  if (!user) return null;

  return (
    <div className="app">
      <aside className="sidebar">
        <Link href={HOME_FOR[user.role]} className="brand">
          <span className="brand-mark">
            <Sparkles size={20} />
          </span>
          <span className="brand-text">
            <strong>WorkshopFlow</strong>
            <span>Operations</span>
          </span>
        </Link>

        <nav className="side-nav" aria-label="Dashboard navigation">
          <p className="side-label">Workspace</p>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = safeView === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`side-link ${active ? "active" : ""}`.trim()}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="side-foot">
          <div className="user-card">
            <span className="avatar sm">{initials(user.email)}</span>
            <div className="user-meta">
              <strong>{user.email}</strong>
              <span className={`role-pill ${user.role.toLowerCase()}`}>
                {user.role}
              </span>
            </div>
            <button
              className="close-button"
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="page-head">
          <div>
            <p className="eyebrow accent">{meta.eyebrow}</p>
            <h1>{meta.title}</h1>
            <p className="page-head-text">{meta.description}</p>
          </div>

          <div className="page-actions">
            {role === "MANAGER" ? (
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => setShowWorkshopModal(true)}
              >
                <Plus size={16} />
                New workshop
              </button>
            ) : null}
            {role === "ADMIN" ? (
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => setShowUserModal(true)}
              >
                <UserPlus size={16} />
                New user
              </button>
            ) : null}
          </div>
        </header>

        <main className="content">
          {safeView === "overview" ? (
            <OverviewView
              workshops={workshops}
              auditEntries={auditTrail}
              onAddWorkshop={() => setShowWorkshopModal(true)}
              onOpenWorkshop={handleOpenWorkshop}
              onGoToWorkshops={() => router.push("/dashboard/workshops")}
            />
          ) : null}

          {safeView === "workshops" ? (
            <WorkshopsView
              role={role}
              workshops={workshops}
              visible={visibleWorkshops}
              loading={loading}
              filters={filters}
              onFilterChange={handleFilterChange}
              onApplyPreset={applyPreset}
              onResetFilters={resetFilters}
              onAddWorkshop={() => setShowWorkshopModal(true)}
              onManage={handleOpenWorkshop}
            />
          ) : null}

          {safeView === "users" ? (
            <UsersView users={users} loading={loading} />
          ) : null}

          {safeView === "activity" ? (
            <ActivityView entries={auditTrail} loading={loading} />
          ) : null}
        </main>
      </div>

      {showWorkshopModal ? (
        <CreateWorkshopModal
          busy={busy}
          onClose={() => setShowWorkshopModal(false)}
          onSubmit={handleCreateWorkshop}
        />
      ) : null}

      {showUserModal ? (
        <CreateUserModal
          busy={busy}
          onClose={() => setShowUserModal(false)}
          onSubmit={handleCreateUser}
        />
      ) : null}

      {detailOpen ? (
        <ManageWorkshopModal
          key={activeWorkshop?.id ?? "workshop-loading"}
          role={role}
          workshop={activeWorkshop}
          loading={detailLoading}
          busy={busy}
          onClose={() => {
            setDetailOpen(false);
            setActiveWorkshop(null);
          }}
          onRegister={handleRegisterAttendee}
          onCancelRegistration={(registration) => setPendingCancel(registration)}
          onUpdate={handleUpdateWorkshop}
        />
      ) : null}

      {pendingCancel ? (
        <ConfirmDialog
          eyebrow="Cancel seat"
          title={`Cancel ${pendingCancel.attendeeName}'s registration?`}
          description="The seat is released immediately and the attendee moves to the history with a cancellation stamp. You can register them again later if needed."
          confirmLabel={busy ? "Cancelling…" : "Yes, cancel seat"}
          cancelLabel="Keep registration"
          busy={busy}
          onConfirm={handleConfirmCancel}
          onCancel={() => setPendingCancel(null)}
        />
      ) : null}
    </div>
  );
}
