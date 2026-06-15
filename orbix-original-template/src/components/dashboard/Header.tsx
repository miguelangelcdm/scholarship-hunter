import { Heart, Sparkles, Bell, Menu, Activity, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";

export const Header = () => {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  const notify = (msg: string) => toast(msg);

  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4 bg-card/70 backdrop-blur rounded-b-3xl border-b border-border">
      <div className="flex items-center gap-3">
        <button
          onClick={() => notify("Orbix Studio · Dashboard")}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-2 pr-3 py-1.5 shadow-glow hover:opacity-90 transition"
          aria-label="Orbix Studio"
        >
          <div className="w-7 h-7 rounded-full bg-dark text-primary flex items-center justify-center">
            <Activity className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div className="leading-tight text-left">
            <p className="text-[13px] font-semibold">Orbix Studio</p>
            <p className="text-[10px] opacity-70 -mt-0.5">Dashboard</p>
          </div>
        </button>

        <div className="hidden sm:flex items-center gap-1.5">
          <button onClick={() => notify("Vitals snapshot captured")} className="w-9 h-9 rounded-full bg-secondary hover:bg-muted grid place-items-center transition" aria-label="Vitals">
            <Activity className="w-4 h-4" />
          </button>
          <button onClick={() => notify("Syncing data…")} className="w-9 h-9 rounded-full bg-secondary hover:bg-muted grid place-items-center transition" aria-label="Sync">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => notify("Records confirmed ✓")} className="w-9 h-9 rounded-full bg-secondary hover:bg-muted grid place-items-center transition" aria-label="Confirm">
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => notify("Added to favorites")} className="hidden sm:grid w-10 h-10 rounded-full bg-secondary hover:bg-muted place-items-center transition" aria-label="Favorites">
          <Heart className="w-4 h-4" />
        </button>
        <button onClick={() => notify("AI assistant coming soon")} className="hidden sm:grid w-10 h-10 rounded-full bg-secondary hover:bg-muted place-items-center transition" aria-label="AI">
          <Sparkles className="w-4 h-4" />
        </button>
        <button onClick={() => notify("You have 5 new notifications")} className="flex items-center gap-2 rounded-full bg-secondary hover:bg-muted px-3 h-10 transition" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          <span className="text-[12px] font-medium hidden sm:inline">{today}</span>
          <span className="ml-1 text-[10px] font-bold bg-primary text-primary-foreground rounded-full w-5 h-5 grid place-items-center">5</span>
        </button>
        <button onClick={() => notify("Menu")} className="w-10 h-10 rounded-full bg-dark text-dark-foreground grid place-items-center hover:opacity-90 transition" aria-label="Menu">
          <Menu className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
