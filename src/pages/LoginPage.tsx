import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Logged in!");
      navigate("/admin");
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email to confirm signup!");
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-sm p-6 space-y-6">
        <div className="text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mx-auto mb-3">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">Admin Login</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage matches</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : "Sign In"}
          </Button>
        </form>

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSignup} disabled={loading}>
          Create Account
        </Button>
      </Card>
    </div>
  );
}
