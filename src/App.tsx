import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import SignIn from "./components/SignIn";
import Home from "./components/Home";
import KnitScreen from "./components/KnitScreen";

// Temporary route until projects exist (M1.7): /knit/<pattern-slug>/<size-label>.
function parseKnitRoute(pathname: string): { slug: string; size: string } | null {
  const m = pathname.match(/^\/knit\/([^/]+)\/([^/]+)\/?$/);
  return m ? { slug: decodeURIComponent(m[1]), size: decodeURIComponent(m[2]) } : null;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!session) return <SignIn />;
  const knit = parseKnitRoute(window.location.pathname);
  return knit ? <KnitScreen slug={knit.slug} size={knit.size} /> : <Home />;
}

export default App;
