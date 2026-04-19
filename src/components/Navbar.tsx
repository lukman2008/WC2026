import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Trophy, Menu, X, Ticket, User, LogOut } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/matches", label: "Matches" },
] as const;

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    setMenuOpen(false);
    navigate({ to: "/" });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow-primary transition-transform group-hover:scale-110">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              WC<span className="text-gradient-primary">2026</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <Link
                to="/my-tickets"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === "/my-tickets"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                My Tickets
              </Link>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/matches"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow-primary transition-all hover:opacity-90 hover:scale-[1.02]"
            >
              <Ticket className="h-4 w-4" />
              Buy Tickets
            </Link>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <User className="h-4 w-4" />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card shadow-elevated overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-xs text-muted-foreground">Signed in as</p>
                        <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
                      >
                        <User className="h-4 w-4" /> Profile
                      </Link>
                      <Link
                        to="/my-tickets"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
                      >
                        <Ticket className="h-4 w-4" /> My Tickets
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-secondary border-t border-border"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/auth"
                search={{ redirect: location.pathname, mode: "signin" }}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user && (
                <>
                  <Link to="/my-tickets" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary">My Tickets</Link>
                  <Link to="/profile" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary">Profile</Link>
                  <button onClick={handleSignOut} className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-secondary">Sign out</button>
                </>
              )}
              {!user && (
                <Link to="/auth" search={{ redirect: location.pathname, mode: "signin" }} onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary">
                  Sign in
                </Link>
              )}
              <Link
                to="/matches"
                onClick={() => setMobileOpen(false)}
                className="block mt-2 text-center rounded-lg bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Buy Tickets
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
