// AppLayout.tsx
// The main shell of the app — wraps every single page
// Handles: top navigation, theme switching (dark/light), and auth state (login/logout)

import { Link, useLocation } from "react-router-dom";
// Link = React Router's version of <a> — navigates without refreshing the page
// useLocation = tells us the current URL path so we can highlight the active nav item

import { Trophy, Calendar, Users, Shield, LogIn, LogOut, LayoutDashboard, Sun, Moon } from "lucide-react";
// Icons from lucide-react — each one maps to a nav item or action button

import { Button } from "@/components/ui/button";
// Pre-styled button component from shadcn/ui

import { supabase } from "@/integrations/supabase/client";
// Supabase client — used here to listen for auth changes and handle sign out

import { useEffect, useState } from "react";
// useState = store values that can change (user, theme)
// useEffect = run code when component mounts or when a value changes

import type { User } from "@supabase/supabase-js";
// TypeScript type for a Supabase user object — tells TS what shape the user data is

// ─── Navigation items ─────────────────────────────────────────────────────────
// Each item has a URL path, a display label, and an icon
// These are rendered as links in the top nav bar
const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/matches", label: "Matches", icon: Calendar },
  { to: "/standings", label: "Standings", icon: Trophy },
  { to: "/stats", label: "Stats", icon: Users },
  { to: "/teams", label: "Teams", icon: Shield },
];

// ─── AppLayout Component ──────────────────────────────────────────────────────
// "children" = whatever page is currently being shown inside the layout
// e.g. <AppLayout><Dashboard /></AppLayout>
export default function AppLayout({ children }: { children: React.ReactNode }) {
  
  // useLocation gives us the current URL path
  // e.g. "/matches" or "/admin"
  const location = useLocation();

  // Stores the currently logged-in Supabase user
  // null = nobody is logged in
  const [user, setUser] = useState<User | null>(null);

  // ─── Theme state ────────────────────────────────────────────────────────────
  // true = dark mode, false = light mode
  // On first load, we check localStorage to restore the user's last preference
  // If nothing is saved, we default to dark mode
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });

  // ─── Apply theme to <html> element ──────────────────────────────────────────
  // Tailwind's darkMode: ["class"] works by looking for a "dark" class on <html>
  // We add or remove that class here whenever isDark changes
  // We also save the preference to localStorage so it persists across page refreshes
  useEffect(() => {
    const root = document.documentElement; // = the <html> element
    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]); // runs every time isDark changes

  // ─── Admin area detection ────────────────────────────────────────────────────
  // We only show the login button when the user is on /admin or /login
  // On all other public pages, the login button is hidden entirely
  // This prevents regular viewers from even knowing there's an admin panel
  const isAdminArea = location.pathname === "/admin" || location.pathname === "/login";

  // ─── Auth listener ───────────────────────────────────────────────────────────
  // This runs once when the layout mounts
  // It does two things:
  //   1. Gets the current session immediately (handles page refresh while logged in)
  //   2. Subscribes to future auth changes (login/logout events)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // session?.user = the logged-in user, or undefined if logged out
      // ?? null = fallback to null if undefined
      setUser(session?.user ?? null);
    });

    // Also check immediately on mount in case user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Cleanup: stop listening when this component unmounts
    // Prevents memory leaks from stale subscriptions
    return () => subscription.unsubscribe();
  }, []); // empty [] = only runs once on mount

  return (
    <div className="min-h-screen bg-background">

      {/* ── Top Navigation Bar ──────────────────────────────────────────────── */}
      {/* sticky = stays at the top when scrolling */}
      {/* backdrop-blur-md = frosted glass effect on the nav */}
      {/* z-50 = sits above all other page content */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">

          {/* ── Logo ────────────────────────────────────────────────────────── */}
          {/* Clicking the logo always takes you back to the homepage */}
          {/* shrink-0 = prevents the logo from shrinking on small screens */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </div>
            {/* hidden sm:inline = hide text on very small screens, show on sm and above */}
            <span className="text-lg font-bold text-foreground hidden sm:inline">
              Talksport
            </span>
          </Link>

          {/* ── Page Navigation Links ────────────────────────────────────────── */}
          {/* Loop through navItems and render a Link for each one */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              // Check if this link matches the current page URL
              // If yes, apply the active highlight style
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to} // React needs a unique key when rendering lists
                  to={item.to}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"         // active = green highlight
                      : "text-foreground/80 hover:text-foreground hover:bg-secondary" // default
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {/* hidden md:inline = show label text only on medium screens and above */}
                  {/* On mobile, only the icon shows to save space */}
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* ── Right Side Controls ──────────────────────────────────────────── */}
          {/* Contains: theme toggle button + login/logout button */}
          <div className="flex items-center gap-1 shrink-0">

            {/* Theme toggle — switches between dark and light mode */}
            {/* Shows a Sun icon in dark mode (click to go light) */}
            {/* Shows a Moon icon in light mode (click to go dark) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDark(!isDark)}
              className="text-foreground/80 hover:text-foreground"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Auth button — three possible states:
                1. Logged in → show logout button (always visible)
                2. Not logged in + on admin area → show login button
                3. Not logged in + on public page → show nothing */}
            {user ? (
              // State 1: Logged in — clicking this ends the Supabase session
              <Button
                variant="ghost"
                size="sm"
                onClick={() => supabase.auth.signOut()}
                className="text-foreground/80 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            ) : isAdminArea ? (
              // State 2: Not logged in, on admin page — show login button
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground">
                  <LogIn className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}
            {/* State 3: Not logged in on a public page — render nothing */}
          </div>

        </div>
      </header>

      {/* ── Page Content ─────────────────────────────────────────────────────── */}
      {/* This is where the actual page component renders */}
      {/* "children" = whatever page was passed into this layout */}
      <main className="container py-6">{children}</main>

    </div>
  );
}