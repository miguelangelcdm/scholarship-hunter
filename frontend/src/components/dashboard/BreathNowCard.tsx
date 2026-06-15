import { Settings2 } from "lucide-react";
import { toast } from "sonner";

export const BreathNowCard = ({ level }: { level: number }) => (
  <div className="card-surface p-5 sm:p-6 flex flex-col justify-between min-h-[14rem] gap-4">
    <div className="flex items-start justify-between gap-3">
      <h3 className="font-display text-2xl sm:text-3xl leading-none">
        TAKE A<br />BREATH NOW
      </h3>
      <p className="text-[11px] text-muted-foreground text-right max-w-[8rem]">
        <span className="font-semibold text-foreground">Wait 2 sec,</span> and then take a deep breath!
      </p>
    </div>

    <button
      onClick={() => toast("Breathe in… and out 🌬️")}
      className="relative flex items-center justify-center my-2 h-24"
      aria-label="Start breath"
    >
      <span className="absolute w-24 h-24 rounded-full bg-primary/30 animate-breath" />
      <span className="absolute w-16 h-16 rounded-full bg-primary/50 animate-breath" style={{ animationDelay: "1s" }} />
      <span className="w-10 h-10 rounded-full bg-primary shadow-glow" />
    </button>

    <div className="flex items-center justify-between gap-2 bg-secondary rounded-full px-3 sm:px-4 py-2">
      <span className="text-xs font-medium shrink-0">{level.toFixed(0)},m²</span>
      <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
        Breath Level is Normal
      </span>
      <button
        onClick={() => toast("Breath settings")}
        className="w-7 h-7 rounded-full bg-card grid place-items-center hover:bg-muted shrink-0"
        aria-label="Settings"
      >
        <Settings2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);
