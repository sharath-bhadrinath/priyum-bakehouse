import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { site } from "@/config/site";
import { useDocumentClass } from "@/hooks/use-document-class";
import { supabase } from "@/integrations/supabase/client";

type Mode = "sign-in" | "sign-up";

const COPY: Record<Mode, { title: string; subtitle: string; submit: string; switchPrompt: string; switchAction: string }> = {
  "sign-in": {
    title: "Welcome back",
    subtitle: "Sign in to manage orders and the menu.",
    submit: "Sign in",
    switchPrompt: "Need an account?",
    switchAction: "Create one",
  },
  "sign-up": {
    title: "Create an account",
    subtitle: "Set up a staff account for the bakehouse.",
    submit: "Create account",
    switchPrompt: "Already have an account?",
    switchAction: "Sign in",
  },
};

export default function Auth() {
  useDocumentClass("staff");
  const navigate = useNavigate();
  const location = useLocation();
  // RequireAuth records where the visitor was headed; send them back there.
  const destination = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const copy = COPY[mode];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate(destination, { replace: true });
    });
  }, [navigate, destination]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(destination, { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        if (data.session) navigate(destination, { replace: true });
        else setNotice("Check your email for a confirmation link, then sign in.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "sign-in" ? "sign-up" : "sign-in");
    setError(null);
    setNotice(null);
  };

  return (
    <div className="grid min-h-screen bg-brand-cream font-sans text-brand-cocoa lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-butter p-12 lg:flex">
        <span className="block h-32 w-32 overflow-hidden">
          <img src={site.logo} alt={site.name} width={1408} height={768} className="h-full w-full scale-[1.12] object-cover" />
        </span>
        <div>
          <p className="font-display text-4xl font-semibold leading-tight">
            The kitchen
            <br />
            behind the counter.
          </p>
          <p className="mt-4 max-w-sm text-brand-cocoa/70">Orders, invoices and the menu for {site.name}, all in one place.</p>
        </div>
        <p className="text-sm text-brand-cocoa/60">{site.tagline}</p>
        <span aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-crust/15" />
        <span aria-hidden className="absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-brand-cream/60" />
      </aside>

      <main className="flex flex-col px-4 py-6 sm:px-8">
        <Link
          to="/"
          className="flex h-10 items-center gap-2 self-start rounded-full px-3 text-sm font-medium text-brand-cocoa/70 hover:bg-brand-cocoa/10 hover:text-brand-cocoa"
        >
          <ArrowLeft className="h-4 w-4" /> Back to the shop
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8">
          <span className="mb-6 block h-20 w-20 overflow-hidden rounded-2xl lg:hidden">
            <img src={site.logo} alt={site.name} width={1408} height={768} className="h-full w-full scale-[1.12] object-cover" />
          </span>
          <h1 className="font-display text-3xl font-semibold">{copy.title}</h1>
          <p className="mt-1.5 text-brand-cocoa/70">{copy.subtitle}</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Email</span>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                autoFocus
                className="h-12 bg-white"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Password</span>
              <span className="relative block">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  minLength={mode === "sign-up" ? 6 : undefined}
                  required
                  className="h-12 bg-white pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full text-brand-cocoa/60 hover:bg-brand-cocoa/10 hover:text-brand-cocoa"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-xl bg-brand-berry/10 px-4 py-3 text-sm font-medium text-brand-berry">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="rounded-xl bg-brand-leaf/10 px-4 py-3 text-sm font-medium text-brand-leaf">
                {notice}
              </p>
            )}

            <Button type="submit" disabled={pending} className="h-12 w-full rounded-full text-base">
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {copy.submit}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-brand-cocoa/70">
            {copy.switchPrompt}{" "}
            <button type="button" onClick={switchMode} className="font-semibold text-brand-cocoa underline underline-offset-2">
              {copy.switchAction}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
