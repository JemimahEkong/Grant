"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMe, listProjects } from "../lib/ui/actions";
import type { Me, Project } from "../lib/ui/api";
import { initials } from "../lib/ui/format";
import { HomeIcon, PlusIcon, ProfileIcon, PurchasesIcon, TracksIcon } from "./icons";
import { EmptyState, Spinner, TestnetBadge } from "./ui";

type MeContextValue = {
  me: Me;
  refreshMe: () => Promise<void>;
};

type ProjectsContextValue = {
  projects: Project[];
  selectedProject: Project | null;
  selectedProjectId: string | null;
  selectProjectId: (projectId: string) => void;
  refreshProjects: (preferredId?: string) => Promise<void>;
  loading: boolean;
};

const MeContext = createContext<MeContextValue | null>(null);
const ProjectsContext = createContext<ProjectsContextValue | null>(null);
const storageKey = "grant:selectedProjectId";

export function useMe(): MeContextValue {
  const value = useContext(MeContext);
  if (!value) throw new Error("useMe must be used inside AppProviders");
  return value;
}

export function useProjects(): ProjectsContextValue {
  const value = useContext(ProjectsContext);
  if (!value) throw new Error("useProjects must be used inside AppProviders");
  return value;
}

function FullPageLoading() {
  return (
    <div className="page" style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div className="logo">
          Grant<span>.</span>
        </div>
        <div className="row" style={{ color: "var(--muted)", fontSize: 10 }}>
          <Spinner /> <span>Opening your workspace</span>
        </div>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getMe();
      setMe(result);
      setError(null);
    } catch (failure) {
      const status = (failure as { status?: number }).status;
      if (status === 401) {
        router.replace(`/signin?next=${encodeURIComponent(pathname || "/app")}`);
        return;
      }
      setError("The workspace could not be opened. Check the connection and try again.");
    }
  }, [pathname, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="page" style={{ padding: 24 }}>
        <EmptyState
          title="Workspace unavailable"
          description={error}
          action={
            <button className="btn btn-primary" onClick={() => void load()}>
              Try again
            </button>
          }
        />
      </div>
    );
  }
  if (!me) return <FullPageLoading />;

  return (
    <MeContext.Provider value={{ me, refreshMe: load }}>
      <ProjectsProvider>{children}</ProjectsProvider>
    </MeContext.Provider>
  );
}

function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (preferredId?: string) => {
    setLoading(true);
    try {
      const result = await listProjects();
      setProjects(result.projects);
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      const candidate = preferredId ?? selectedProjectId ?? stored;
      const next = result.projects.find(project => project.id === candidate) ?? result.projects[0] ?? null;
      setSelectedProjectId(next?.id ?? null);
      if (next && typeof window !== "undefined") window.localStorage.setItem(storageKey, next.id);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    void load();
    // Load once on mount. Later refreshes are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectProjectId = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    if (typeof window !== "undefined") window.localStorage.setItem(storageKey, projectId);
  }, []);

  const selectedProject = useMemo(
    () => projects.find(project => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  return (
    <ProjectsContext.Provider
      value={{ projects, selectedProject, selectedProjectId, selectProjectId, refreshProjects: load, loading }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { me } = useMe();
  const pathname = usePathname();
  const isPurchase = pathname.startsWith("/app/purchase/");
  const railItems = [
    { href: "/app", label: "Home", icon: HomeIcon, active: pathname === "/app" },
    { href: "/app/catalog", label: "Tracks", icon: TracksIcon, active: pathname === "/app/catalog" || isPurchase },
    { href: "/app/new", label: "New license", icon: PlusIcon, active: pathname === "/app/new" },
    { href: "/app/purchases", label: "Purchases", icon: PurchasesIcon, active: pathname === "/app/purchases" },
    { href: "/app/profile", label: "Profile", icon: ProfileIcon, active: pathname === "/app/profile" },
  ];

  return (
    <div className="app-shell">
      <aside className="app-rail" aria-label="Primary">
        <div className="rail-brand">
          <Link href="/app" className="logo">
            Grant<span>.</span>
          </Link>
          <TestnetBadge />
        </div>
        <nav className="rail-links">
          {railItems.map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`rail-link${item.active ? " on" : ""}`}>
                <Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="rail-foot">
          Testnet USDC only. No real funds.
          <br />
          One approval per purchase.
        </div>
      </aside>

      <main className="app-main">
        <header className="app-top">
          <div className="app-top-left">
            <Link href="/app" className="app-brand">
              Grant <span>/ licenses</span>
            </Link>
            <TestnetBadge />
          </div>
          <Link href="/app/profile" className="avatar" aria-label="Open profile">
            {initials(me.user.name || me.user.email)}
          </Link>
        </header>
        {children}
      </main>

      <nav className="bottom-nav" aria-label="Primary">
        <Link href="/app" className={pathname === "/app" ? "on" : ""}>
          <HomeIcon />
          <span>Home</span>
        </Link>
        <Link href="/app/catalog" className={pathname === "/app/catalog" || isPurchase ? "on" : ""}>
          <TracksIcon />
          <span>Tracks</span>
        </Link>
        <Link href="/app/new" className="bottom-action" aria-label="New license">
          +
        </Link>
        <Link href="/app/purchases" className={pathname === "/app/purchases" ? "on" : ""}>
          <PurchasesIcon />
          <span>Purchases</span>
        </Link>
        <Link href="/app/profile" className={pathname === "/app/profile" ? "on" : ""}>
          <ProfileIcon />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
