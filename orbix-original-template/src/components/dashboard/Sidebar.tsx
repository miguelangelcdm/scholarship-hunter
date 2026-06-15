import { Asterisk, Pill, Bone, HeartPulse, Brain, Layers, Maximize2, ArrowDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { id: "asterisk", label: "Sync", icon: Asterisk },
  { id: "spo2", label: "Sp02", icon: null, custom: "Sp02" },
  { id: "rx", label: "Px", icon: Pill },
  { id: "bmd", label: "BMD", icon: null, custom: "BMD" },
  { id: "pulse", label: "Pulse", icon: HeartPulse },
  { id: "brain", label: "Mind", icon: Brain },
  { id: "wellness", label: "Wellness", icon: Layers },
];

type Props = { active: string; onSelect: (id: string) => void };

export const Sidebar = ({ active, onSelect }: Props) => {
  return (
    <aside className="hidden md:flex flex-col items-center justify-between py-6 w-16 lg:w-20 shrink-0">
      <nav className="flex flex-col items-center gap-2">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onSelect(it.id)}
              aria-label={it.label}
              className={cn(
                "w-11 h-11 rounded-full grid place-items-center text-[10px] font-semibold transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-glow scale-105"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              {it.custom ? <span>{it.custom}</span> : Icon ? <Icon className="w-4 h-4" /> : null}
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
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="w-11 h-11 rounded-full bg-dark text-dark-foreground grid place-items-center hover:opacity-90 transition"
          aria-label="Back to top"
        >
          <ArrowDownLeft className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

export const MobileSidebar = ({ active, onSelect }: Props) => (
  <div className="md:hidden -mx-4 px-4 mb-4 overflow-x-auto scrollbar-hide">
    <div className="flex gap-2 w-max">
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = active === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onSelect(it.id)}
            className={cn(
              "h-10 px-3 rounded-full grid place-items-center text-[11px] font-semibold transition shrink-0",
              isActive ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            )}
          >
            {it.custom ?? (Icon ? <Icon className="w-4 h-4" /> : it.label)}
          </button>
        );
      })}
    </div>
  </div>
);
