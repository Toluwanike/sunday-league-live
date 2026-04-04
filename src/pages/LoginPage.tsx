// LoginPage.tsx
// This is the admin login page — only accessible at /login
// It only has a sign-in form. There is NO sign-up button by design.
// New admin accounts can only be created manually in the Supabase dashboard.
// This prevents random people from creating admin accounts.

import { useState } from "react";
// useState lets us store the email, password, and loading state

import { supabase } from "@/integrations/supabase/client";
// We use supabase to actually attempt the login

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
// These are pre-styled UI components so we don't have to style from scratch

import { useNavigate } from "react-router-dom";
// useNavigate lets us redirect the user to another page programmatically
// e.g. after a successful login, send them to /admin

import { Trophy } from "lucide-react";
// The trophy icon used in the login card header

import { toast } from "sonner";
// toast shows small popup notifications (success or error messages)

export default function LoginPage() {
  // These store what the user types into the email and password fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // This tracks whether a login request is in progress
  // We use it to disable the button and show "Signing in..." while waiting
  const [loading, setLoading] = useState(false);

  // navigate("/admin") will redirect the user to the admin page
  const navigate = useNavigate();

  // ─── Handle Login ───────────────────────────────────────────────────────────
  // This function runs when the user submits the login form
  // e.preventDefault() stops the page from refreshing (default browser form behaviour)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Show loading state so the user knows something is happening
    setLoading(true);

    // Ask Supabase to check the email and password against its auth system
    // If they match a real account, it returns a session
    // If not, it returns an error
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    // Login attempt is done, stop showing loading state
    setLoading(false);

    if (error) {
      // We use a generic message on purpose — we don't want to tell someone
      // whether the email exists or if just the password was wrong
      // That kind of detail can help hackers narrow things down
      toast.error("Invalid email or password");
    } else {
      // Login was successful — show a success message and go to admin panel
      toast.success("Logged in!");
      navigate("/admin");
    }
  };

  return (
    // Center the card vertically and horizontally on the page
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-sm p-6 space-y-6">
        
        {/* ── Card Header ───────────────────────────────────────────────── */}
        <div className="text-center">
          {/* Trophy icon in a coloured circle at the top */}
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mx-auto mb-3">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">Admin Login</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage matches</p>
        </div>

        {/* ── Login Form ────────────────────────────────────────────────── */}
        {/* onSubmit calls handleLogin when the user clicks Sign In or presses Enter */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Email input — onChange updates our email state as the user types */}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required // Browser won't submit the form if this is empty
          />

          {/* Password input — same pattern as email */}
          <Input
            type="password" // Hides the text as the user types
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {/* Submit button — disabled while the login request is in progress
              so the user can't click it multiple times */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
            {/* Shows different text depending on whether we're waiting for a response */}
          </Button>
        </form>
        {/* NOTE: There is intentionally no "Create Account" button here.
            Admin accounts are created manually in the Supabase dashboard only. */}
      </Card>
    </div>
  );
}