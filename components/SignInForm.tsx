"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn, signUp } from "../lib/ui/actions";

export function SignInForm({ initialMode, nextPath }: { initialMode: "signin" | "signup"; nextPath: string }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        await signUp(name.trim() || email.split("@")[0], email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
      router.push(nextPath);
      router.refresh();
    } catch (failure) {
      setError((failure as Error).message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="row-between">
        <div className="micro">{mode === "signup" ? "New account" : "Welcome back"}</div>
        <span className="testnet-badge">TESTNET</span>
      </div>
      <h1>{mode === "signup" ? "Start a demo project." : "Sign in to Grant."}</h1>
      <p className="lede">
        {mode === "signup"
          ? "Registration is open. A demo account is required only when you spend testnet funds."
          : "Use the email and password for this workspace. No wallet connection."}
      </p>

      <form onSubmit={submit}>
        {mode === "signup" ? (
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" className="input" value={name} onChange={event => setName(event.target.value)} autoComplete="name" required />
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={8}
            required
          />
        </div>
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn btn-primary btn-wide" type="submit" disabled={busy}>
          <span>{busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}</span>
          <span aria-hidden="true">→</span>
        </button>
      </form>

      <div className="auth-toggle">
        {mode === "signup" ? "Already have an account? " : "New to Grant? "}
        <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
          {mode === "signup" ? "Sign in" : "Create one"}
        </button>
      </div>
      <div className="auth-toggle">
        <Link href="/">Back to the landing page</Link>
      </div>
    </div>
  );
}
