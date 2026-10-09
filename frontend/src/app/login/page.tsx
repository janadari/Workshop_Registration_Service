"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { fetchApi } from "@/lib/api";

type LoginResponse = {
  access_token?: string;
  user?: { id?: string; email: string; role: "ADMIN" | "MANAGER" | "STAFF" };
};

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "Role-based access",
    copy: "Admins manage accounts, managers run workshops, staff handle attendees.",
  },
  {
    icon: CalendarDays,
    title: "Live capacity control",
    copy: "Seats are enforced on the server — no overbooking, waitlists when full.",
  },
  {
    icon: Activity,
    title: "Complete audit trail",
    copy: "Every registration and cancellation is attributed to a person and a time.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  // Deliberately empty: the sign-in form must never ship seeded credentials.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetchApi<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!res.access_token) {
        throw new Error("Login did not return a session token.");
      }

      localStorage.setItem("token", res.access_token);
      localStorage.setItem("user", JSON.stringify(res.user));

      router.replace(
        res.user?.role === "ADMIN" ? "/dashboard/users" : "/dashboard/workshops",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow" aria-hidden="true" />

      <div className="auth-shell">
        <section className="auth-hero">
          <div className="brand">
            <span className="brand-mark">
              <Sparkles size={20} />
            </span>
            <span className="brand-text">
              <strong>WorkshopFlow</strong>
              <span>Registration Suite</span>
            </span>
          </div>

          <div>
            <span className="auth-badge">Community training centre</span>
            <h1>Every seat accounted for, every action on record.</h1>
            <p>
              Run workshop registrations, watch capacity in real time, and keep a
              full attendance history — all from one secure workspace.
            </p>

            <div className="feature-list">
              {HIGHLIGHTS.map(({ icon: Icon, title, copy }) => (
                <div className="feature-item" key={title}>
                  <span className="feature-icon">
                    <Icon size={17} />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <span>{copy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="auth-hero-foot">
            Capacity rules &amp; audit logging enforced by the API
          </p>
        </section>

        <section className="auth-card">
          <div className="auth-card-header">
            <p className="eyebrow accent">Welcome back</p>
            <h2>Sign in to continue</h2>
            <p>Accounts are created by an administrator and use email + password.</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <label className="field">
              <span>Email address</span>
              <div className="input-icon">
                <Mail size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@centre.org"
                  autoComplete="username"
                  required
                />
              </div>
            </label>

            <label className="field">
              <span>Password</span>
              <div className="input-icon pw-wrap">
                <LockKeyhole size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error ? (
              <div className="form-alert" role="alert">
                <AlertTriangle size={17} />
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
              {loading ? null : <ArrowRight size={16} />}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

