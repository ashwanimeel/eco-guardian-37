import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard, Calculator, Sparkles, Trophy, Users,
  BookOpen, FileBarChart, Leaf, LogOut, ScanLine
} from "lucide-react";

const links = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", testid: "nav-dashboard" },
  { to: "/calculator", icon: Calculator, label: "Calculator", testid: "nav-calculator" },
  { to: "/scanner", icon: ScanLine, label: "Bill Scanner", testid: "nav-scanner" },
  { to: "/coach", icon: Sparkles, label: "AI Coach", testid: "nav-coach" },
  { to: "/challenges", icon: Trophy, label: "Challenges", testid: "nav-challenges" },
  { to: "/community", icon: Users, label: "Community", testid: "nav-community" },
  { to: "/climate", icon: BookOpen, label: "Climate Hub", testid: "nav-climate" },
  { to: "/reports", icon: FileBarChart, label: "Reports", testid: "nav-reports" },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;
  const initials = (user.name || "U").split(" ").map(s=>s[0]).slice(0,2).join("");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/40 sticky top-0 h-screen" aria-label="Primary navigation">
        <Link to="/dashboard" className="flex items-center gap-2 px-6 py-6 border-b border-border" data-testid="shell-logo" aria-label="EcoTrack AI dashboard">
          <Leaf className="h-5 w-5 text-accent" aria-hidden="true" />
          <span className="font-serif text-2xl">EcoTrack <em className="text-accent">AI</em></span>
        </Link>
        <nav className="flex-1 p-3 space-y-1" aria-label="Application sections">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} data-testid={l.testid}
              className={({isActive}) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors
                ${isActive ? "bg-secondary text-secondary-foreground" : "text-foreground/70 hover:bg-secondary/40 hover:text-foreground"}`
              }>
              <l.icon className="h-4 w-4" aria-hidden="true" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <Link to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary/40 transition" data-testid="shell-profile-link">
            <Avatar className="h-8 w-8"><AvatarImage src={user.picture}/><AvatarFallback>{initials}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{user.name}</div>
              <div className="label-small">{user.level}</div>
            </div>
          </Link>
          <Button variant="ghost" size="sm" className="w-full mt-2 justify-start text-muted-foreground" onClick={async()=>{await logout(); navigate("/");}} data-testid="shell-logout-btn">
            <LogOut className="h-4 w-4 mr-2"/> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 glass border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-accent"/>
            <span className="font-serif text-xl">EcoTrack</span>
          </Link>
          <Link to="/profile" data-testid="mobile-profile-link">
            <Avatar className="h-8 w-8"><AvatarImage src={user.picture}/><AvatarFallback>{initials}</AvatarFallback></Avatar>
          </Link>
        </div>
        <div className="px-2 pb-2 flex gap-1 overflow-x-auto">
          {links.map(l => (
            <NavLink key={l.to} to={l.to}
              className={({isActive}) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap
                ${isActive ? "bg-primary text-primary-foreground" : "bg-secondary/40"}`}>
              <l.icon className="h-3 w-3"/>{l.label}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="flex-1 md:pt-0 pt-28" id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
