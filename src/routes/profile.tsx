import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User as UserIcon, Mail, Phone, Loader2, LogOut, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CountrySelect } from "@/components/CountrySelect";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "Profile — FIFA World Cup 2026" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/profile", mode: "signin" } });
      return;
    }
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setPhone(data.phone ?? "");
        setCountry(data.country ?? "");
      }
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim() || null,
      phone: phone.trim() || null,
      country: country.trim() || null,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  if (authLoading || loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-foreground">Profile</h1>
      <p className="mt-2 text-muted-foreground">Manage your account information</p>

      <div className="mt-8 rounded-xl border border-border bg-card shadow-card p-6 sm:p-8 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="email" value={user?.email ?? ""} disabled className="w-full rounded-lg border border-border bg-secondary/40 pl-10 pr-4 py-2.5 text-sm text-muted-foreground" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Display Name</label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" className="w-full rounded-lg border border-border bg-input pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Phone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 0000" className="w-full rounded-lg border border-border bg-input pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Country</label>
          <CountrySelect value={country || null} onChange={(code) => setCountry(code ?? "")} />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button onClick={handleSignOut} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow-primary transition-all hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link to="/my-tickets" className="text-sm font-medium text-primary hover:underline">View my tickets →</Link>
      </div>
    </div>
  );
}
