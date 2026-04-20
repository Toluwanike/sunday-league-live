import { Link, useLocation, useNavigate } from "react-router-dom";
import { Trophy, Calendar, Users, Shield, LogIn, LogOut, LayoutDashboard, Sun, Moon, Star, History } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/matches", label: "Matches", icon: Calendar },
  { to: "/standings", label: "League", icon: Trophy },
  { to: "/cup", label: "Cup", icon: Star },
  { to: "/stats", label: "Stats", icon: Users },
  { to: "/teams", label: "Teams", icon: Shield },
  { to: "/history", label: "History", icon: History },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Track dark/light theme — persisted in localStorage
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  // Track logged in state
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Apply theme class to document root whenever isDark changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Listen for auth state changes — login/logout
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Only show login/logout button on /admin route or when logged in
  const showAuthButton = location.pathname === "/admin" || isLoggedIn;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">

          {/* Logo — clicking takes you back to dashboard */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </div>
            {/* Brand name — hidden on very small screens */}
            <span className="text-lg font-bold hidden sm:inline">Talksport</span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right side — theme toggle + auth button */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Theme toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Login/logout — only visible on /admin or when logged in */}
            {showAuthButton && (
              isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              ) : (
                <Link
                  to="/admin"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="Admin login"
                >
                  <LogIn className="h-4 w-4" />
                </Link>
              )
            )}
          </div>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main className="container py-6">{children}</main>
    </div>
  );
}