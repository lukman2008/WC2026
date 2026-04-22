import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow-primary transition-all hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FIFA World Cup 2026 Tickets | Official Ticketing Platform" },
      { name: "description", content: "Buy tickets for the FIFA World Cup 2026 in USA, Mexico & Canada. Browse matches, select seats, and secure your spot at the biggest sporting event." },
      { property: "og:title", content: "FIFA World Cup 2026 Tickets | Official Ticketing Platform" },
      { property: "og:description", content: "Buy tickets for the FIFA World Cup 2026 in USA, Mexico & Canada. Browse matches, select seats, and secure your spot at the biggest sporting event." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "FIFA World Cup 2026 Tickets | Official Ticketing Platform" },
      { name: "twitter:description", content: "Buy tickets for the FIFA World Cup 2026 in USA, Mexico & Canada. Browse matches, select seats, and secure your spot at the biggest sporting event." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/79d60d3a-e013-40b2-b116-bc9879885edc" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/79d60d3a-e013-40b2-b116-bc9879885edc" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var c=t==='light'?'light':'dark';var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(c);}catch(e){}})();`;

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-16">
          <Outlet />
        </main>
        <Footer />
      </div>
      <Toaster />
    </AuthProvider>
  );
}
