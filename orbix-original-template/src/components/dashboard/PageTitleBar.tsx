import { Calendar, Clock, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ranges = ["24h", "Weekly", "Monthly"];

export const PageTitleBar = () => {
  const [range, setRange] = useState<string>("Weekly");

  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-4xl sm:text-5xl font-display tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Health Records</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => toast("Date range picker coming soon")}
          className="flex items-center gap-2 bg-card rounded-full pl-2 pr-4 h-10 shadow-card hover:bg-secondary transition"
        >
          <span className="w-7 h-7 rounded-full bg-secondary grid place-items-center">
            <Calendar className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-medium">Sep 02 - Sep 09</span>
        </button>
        <button
          onClick={() => setRange("24h")}
          className={`flex items-center gap-2 rounded-full pl-2 pr-4 h-10 shadow-card transition ${
            range === "24h" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"
          }`}
        >
          <span className="w-7 h-7 rounded-full bg-secondary text-foreground grid place-items-center">
            <Clock className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-medium">24h</span>
        </button>
        <button
          onClick={() => {
            const next = ranges[(ranges.indexOf(range) + 1) % ranges.length];
            setRange(next);
            toast(`View: ${next}`);
          }}
          className="flex items-center gap-2 bg-dark text-dark-foreground rounded-full pl-4 pr-1.5 h-10 hover:opacity-90 transition"
        >
          <span className="text-xs font-medium">{range}</span>
          <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center">
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </button>
      </div>
    </div>
  );
};
