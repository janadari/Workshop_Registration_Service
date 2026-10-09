"use client";

import type { ReactNode } from "react";

export function StatusBadge({ status }: { status?: string | null }) {
  const key = (status ?? "unknown").toLowerCase();
  return <span className={`status-badge ${key}`}>{status ?? "Unknown"}</span>;
}

export function RoleBadge({ role }: { role: string }) {
  return <span className={`status-badge ${role.toLowerCase()}`}>{role}</span>;
}

export function ProgressMeter({
  booked,
  capacity,
}: {
  booked: number;
  capacity: number;
}) {
  const rate = capacity > 0 ? Math.min(Math.round((booked / capacity) * 100), 100) : 0;
  const tone = booked >= capacity ? "full" : rate >= 80 ? "warn" : "";

  return (
    <div className="progress-wrap">
      <div className="progress-head">
        <span>
          {booked} of {capacity} seats filled
        </span>
        <span>{rate}%</span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${tone}`.trim()}
          style={{ width: `${rate}%` }}
          role="progressbar"
          aria-valuenow={rate}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card empty-state">
      {icon}
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="stack-list" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="card skeleton-card" key={index}>
          <div className="skeleton skull-tile" />
          <div className="skeleton-body">
            <div className="skeleton skull-lg" />
            <div className="skeleton skull-sm" />
          </div>
          <div className="skeleton skull-xs" />
        </div>
      ))}
    </div>
  );
}

export function StatCard({
  icon,
  tone = "",
  label,
  value,
  foot,
}: {
  icon: ReactNode;
  tone?: string;
  label: string;
  value: string | number;
  foot?: string;
}) {
  return (
    <div className="card stat-card">
      <span className={`stat-icon ${tone}`.trim()}>{icon}</span>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        {foot ? <span className="stat-foot">{foot}</span> : null}
      </div>
    </div>
  );
}
