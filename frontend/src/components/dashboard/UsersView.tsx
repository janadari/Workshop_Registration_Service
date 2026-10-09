"use client";

import { ShieldCheck, UserPlus, Users } from "lucide-react";
import { EmptyState, RoleBadge, SkeletonList, StatCard } from "./shared";
import { formatDateTime, initials, type Role, type UserAccount } from "./types";

type UsersViewProps = {
  users: UserAccount[];
  loading: boolean;
  onCreateUser: () => void;
};

export function UsersView({ users, loading, onCreateUser }: UsersViewProps) {
  const count = (role: Role) => users.filter((user) => user.role === role).length;

  return (
    <>
      <section className="stats-grid">
        <StatCard
          icon={<Users size={19} />}
          tone="violet"
          label="Accounts"
          value={users.length}
          foot="All registered centre staff"
        />
        <StatCard
          icon={<ShieldCheck size={19} />}
          tone="amber"
          label="Admins"
          value={count("ADMIN")}
          foot="Can create accounts & view logs"
        />
        <StatCard
          icon={<Users size={19} />}
          tone="green"
          label="Managers"
          value={count("MANAGER")}
          foot="Own workshops & registrations"
        />
        <StatCard
          icon={<Users size={19} />}
          tone="cyan"
          label="Staff"
          value={count("STAFF")}
          foot="Handle day-to-day registrations"
        />
      </section>

      <div className="section-header">
        <div>
          <h2>User accounts</h2>
          <span>Roles decide what each person can reach</span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onCreateUser} type="button">
          <UserPlus size={15} />
          Create user
        </button>
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users size={26} />}
          title="No accounts yet"
          description="Create the first manager or staff account to get the centre running."
        />
      ) : (
        <div className="card panel-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Permissions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="user-cell">
                        <span className="avatar sm">{initials(user.email)}</span>
                        <span>
                          <strong>{user.email}</strong>
                          <span>Account ID · {user.id.slice(0, 8)}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <RoleBadge role={user.role} />
                    </td>
                    <td>{user.createdAt ? formatDateTime(user.createdAt) : "—"}</td>
                    <td>
                      {user.role === "ADMIN"
                        ? "Create users · view logs"
                        : user.role === "MANAGER"
                          ? "Workshops · registrations"
                          : "Registrations only"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
