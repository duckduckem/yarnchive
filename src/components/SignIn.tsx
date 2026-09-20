import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    }
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans text-text">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-card border border-border bg-surface p-6"
      >
        <h1 className="text-xl font-semibold text-accent">Yarnchive</h1>
        <p className="mt-2 text-sm text-text-muted">Sign in to continue.</p>

        <label className="mt-6 block text-sm text-text">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-card border border-border bg-background px-3 py-2 text-text"
          />
        </label>

        <label className="mt-4 block text-sm text-text">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-card border border-border bg-background px-3 py-2 text-text"
          />
        </label>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-card bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default SignIn;
