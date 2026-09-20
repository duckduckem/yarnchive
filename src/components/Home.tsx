import { supabase } from "../lib/supabase";

function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans text-text">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6 text-center">
        <h1 className="text-xl font-semibold text-accent">Yarnchive</h1>
        <p className="mt-2 text-sm text-text-muted">Signed in.</p>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="mt-6 w-full rounded-card border border-border px-3 py-2 text-sm font-medium text-text"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export default Home;
