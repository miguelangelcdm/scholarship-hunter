import { Compass, User, LayoutGrid, Maximize2, ArrowDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";

const items = [
  { id: "/", label: "Discover", icon: Compass },
  { id: "/profile", label: "Profile", icon: User },
  { id: "/tracker", label: "Tracker", icon: LayoutGrid },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname;

  return (
    <aside className="hidden md:flex flex-col items-center justify-between py-6 w-16 lg:w-20 shrink-0">
      <nav className="flex flex-col items-center gap-4">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => navigate(it.id)}
              aria-label={it.label}
              className={cn(
                "w-11 h-11 rounded-full grid place-items-center transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-glow scale-105"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
          className="w-11 h-11 rounded-full bg-card grid place-items-center text-muted-foreground hover:bg-secondary transition"
          aria-label="Expand"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

export const MobileSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname;

  return (
    <div className="md:hidden -mx-4 px-4 mb-4 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 w-max">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => navigate(it.id)}
              className={cn(
                "h-10 px-4 rounded-full flex items-center gap-2 text-[12px] font-semibold transition shrink-0",
                isActive ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
