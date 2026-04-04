// AppLayout.tsx
// This is the "shell" of the entire app — every page is wrapped inside this component.
// It renders the top navigation bar and then displays whatever page the user is on.

import { Link, useLocation } from "react-router-dom";
// Link = like an <a> tag but for React apps (doesn't reload the page)
// useLocation = tells us what the current URL is, e.g. "/matches" or "/admin"

import { Trophy, Calendar, Users, Shield, LogIn, LogOut, LayoutDashboard } from "lucide-react";
// These are icons from the lucide-react icon library
// Each one is used next to a nav item label

import { Button } from "@/components/ui/button";
// A pre-styled button component from our UI library (shadcn)

import { supabase } from "@/integrations/supabase/client";
// Our Supabase client — we use it here to check if someone is logged in
// and to let them log out

import { useEffect, useState } from "react";
// useState = lets us store values that can change (like the logged-in user)
// useEffect = lets us run code when the component first loads

import type { User } from "@supabase/supabase-js";
// This is just the TypeScript type for a Supabase user object
// It tells TypeScript what shape the user data will be

// ─── Navigation Items ─────────────────────────────────────────────────────────
// This is the list of pages shown in the top nav bar
// Each item has: a URL path, a display label, and an icon
const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/matches", label: "Matches", icon: Calendar },
  { to: "/standings", label: "Standings", icon: Trophy },
  { to: "/stats", label: "Stats", icon: Users },
  { to: "/teams", label: "Teams", icon: Shield },
];

// ─── AppLayout Component ──────────────────────────────────────────────────────
// "children" means whatever page content gets passed inside this layout
// For example: <AppLayout><Dashboard /></AppLayout>
export default function AppLayout({ children }: { children: React.ReactNode }) {
  
  // useLocation gives us the current URL path the user is on
  // e.g. if they're on http://localhost:8080/admin, location.pathname = "/admin"
  const location = useLocation();

  // This stores the currently logged-in user (or null if nobody is logged in)
  const [user, setUser] = useState<User | null>(null);

  // We only want to show the login button when the user is on /admin or /login
  // This is a security/UX decision — regular viewers should never see a login button
  // They'd have no reason to log in since they can't access the admin anyway
  const isAdminArea = location.pathname === "/admin" || location.pathname === "/login";

  // ─── Auth Listener ──────────────────────────────────────────────────────────
  // This runs once when the layout first loads
  // It does two things:
  //   1. Gets the current session immediately (in case the user is already logged in)
  //   2. Listens for any future login/logout events and updates the user state
  useEffect(() => {
    // onAuthStateChange fires whenever the user logs in or logs out
    // We update our "user" state based on the new session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // session?.user means "get the user from the session if it exists"
      // ?? null means "if there's no session, set user to null"
    });

    // getSession checks if there's already an active login session right now
    // This handles the case where the user refreshed the page while logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Cleanup: when the component is removed from the page,
    // we unsubscribe from the auth listener to avoid memory leaks
    return () => subscription.unsubscribe();
  }, []); 
  // The empty [] means this effect only runs once, when the component first mounts

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      {/* sticky top-0 means the nav sticks to the top when you scroll */}
      {/* backdrop-blur-md gives it a frosted glass effect */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          
          {/* ── Logo / Brand ──────────────────────────────────────────────── */}
          {/* Clicking this takes you back to the homepage */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </div>
            {/* hidden sm:inline means the text is hidden on very small screens */}
            <span className="text-lg font-bold text-gradient-pitch hidden sm:inline">SundayLeague</span>
          </Link>

          {/* ── Main Nav Links ────────────────────────────────────────────── */}
          {/* We loop through our navItems array and create a link for each one */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              // Check if this nav item matches the current page URL
              // If it does, we highlight it with a different style
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to} // React needs a unique "key" when rendering lists
                  to={item.to}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"       // highlighted style for current page
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary" // default style
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {/* hidden md:inline hides the label text on small screens, shows on medium+ */}
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* ── Auth Button (top right corner) ───────────────────────────── */}
          {/* This section has three possible states:
              1. User is logged in → show a Logout button (always visible)
              2. User is not logged in AND they're on /admin or /login → show Login button
              3. User is not logged in AND they're on a public page → show nothing */}
          <div>
            {user ? (
              // State 1: Logged in — show logout button
              // Clicking this calls Supabase to end the session
              <Button
                variant="ghost"
                size="sm"
                onClick={() => supabase.auth.signOut()}
                className="text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            ) : isAdminArea ? (
              // State 2: Not logged in, but on an admin page — show login button
              // This is the only way a viewer would see a login option
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <LogIn className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}
            {/* State 3: Not logged in on a public page — render nothing (null) */}
          </div>
        </div>
      </header>

      {/* ── Page Content ───────────────────────────────────────────────────── */}
      {/* This is where the actual page (Dashboard, Matches, Admin etc.) renders */}
      {/* "children" is whatever page was passed into this layout */}
      <main className="container py-6">{children}</main>
    </div>
  );
}