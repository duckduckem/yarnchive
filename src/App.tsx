import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import SignIn from "./components/SignIn";
import KnitScreen from "./components/KnitScreen";
import NewProject from "./components/NewProject";
import ProjectList from "./components/ProjectList";
import { parseRoute } from "./lib/route";

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
  const route = parseRoute(window.location.pathname);
  switch (route.name) {
    case "project":
      return <KnitScreen projectId={route.id} />;
    case "new-project":
      return <NewProject />;
    case "not-found":
      window.location.replace("/");
      return null;
    default:
      return <ProjectList />;
  }
}

export default App;
