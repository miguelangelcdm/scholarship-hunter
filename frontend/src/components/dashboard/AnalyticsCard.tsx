import { Plus, Minus, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  bars: number[];
  timeAm: string;
  tempF: number;
};

const tabs = ["Tracker", "MedicalAnalytics", "FitnessMetrics", "PatientInsights", "AI Healthcare"];

export const AnalyticsCard = ({ bars, timeAm, tempF }: Props) => {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [zoom, setZoom] = useState(1);

  const max = Math.max(...bars);
  const peakIdx = bars.indexOf(max);

  return (
    <div className="card-surface p-5 sm:p-6 relative">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-3.5 h-3.5 rounded-sm bg-primary shrink-0" />
          <span className="text-sm font-medium truncate">Analytics · {activeTab}</span>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(2)))}
            className="w-7 h-7 rounded-full bg-secondary grid place-items-center hover:bg-muted"
            aria-label="Zoom in"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))}
            className="w-7 h-7 rounded-full bg-secondary grid place-items-center hover:bg-muted"
            aria-label="Zoom out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1">Tracker</p>
          <div className="flex items-end gap-1 flex-wrap">
            <span className="text-4xl sm:text-5xl font-display tracking-tight">{timeAm}</span>
            <span className="text-xs text-muted-foreground mb-2">AM</span>
            <span className="chip bg-primary/30 text-foreground ml-1 mb-2">
              <ArrowUpRight className="w-3 h-3" /> 30min
            </span>
          </div>
        </div>
        <div className="sm:text-right min-w-0">
          <p className="text-xs text-muted-foreground mb-1 sm:text-right">Body temp</p>
          <div className="flex items-end gap-1 sm:justify-end flex-wrap">
            <span className="text-4xl sm:text-5xl font-display tracking-tight">{tempF.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground mb-2">°F</span>
            <span className="chip bg-primary/30 text-foreground ml-1 mb-2">
              <ArrowUpRight className="w-3 h-3" /> 30min
            </span>
          </div>
        </div>
      </div>

      <div className="relative h-44 sm:h-52 pl-8">
        <div className="absolute inset-y-0 left-0 flex flex-col justify-between text-[10px] text-muted-foreground">
          <span>10%</span>
          <span>08%</span>
          <span>00%</span>
        </div>

        <div className="relative h-full flex items-end justify-between gap-1">
          {bars.map((h, i) => {
            const isPeak = i === peakIdx;
            const height = Math.min(100, h * zoom);
            return (
              <div key={i} className="flex-1 flex items-end justify-center h-full relative">
                {isPeak && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 bg-dark text-dark-foreground text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{ bottom: `calc(${height}% + 6px)` }}
                  >
                    {(height / 27).toFixed(2)}%
                  </div>
                )}
                <div
                  className={`w-full rounded-full transition-all ${isPeak ? "bg-primary" : "bg-muted"}`}
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pl-8 flex items-center justify-between text-[10px] text-muted-foreground">
        {["Jan", "", "Mar", "", "May", "", "Jul"].map((m, i) => (
          <span key={i} className="flex-1 text-center">{m}</span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => {
              setActiveTab(t);
              toast(`Switched to ${t}`);
            }}
            className={`chip px-3 py-1.5 text-[11px] transition ${
              t === activeTab
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
};
