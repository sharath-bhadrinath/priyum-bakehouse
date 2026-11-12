import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/PageLoader";

/** Gate for staff-only routes. Redirects to /auth when there is no session. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <PageLoader />;
  if (!session) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
