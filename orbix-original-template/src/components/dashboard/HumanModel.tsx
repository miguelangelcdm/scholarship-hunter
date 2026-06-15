import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import humanBody from "@/assets/human-body.svg";

type Region = {
  id: string;
  label: string;
  metric: string;
  value: string;
  trend: string;
  records: { time: string; note: string }[];
  x: number; // % of figure width
  y: number; // % of figure height
};

// Coordinates calibrated to the silhouette (viewBox 0 0 168 168).
// The figure spans roughly y: 0% (head top) → 96% (feet) and x: 32%–68%.
const regions: Region[] = [
  {
    id: "head",
    label: "Brain",
    metric: "Focus index",
    value: "92%",
    trend: "+4% vs yesterday",
    x: 50,
    y: 24,
    records: [
      { time: "08:10", note: "Deep focus session · 42 min" },
      { time: "10:25", note: "Meditation · 12 min" },
      { time: "13:40", note: "Cognitive load spike" },
    ],
  },
  {
    id: "arm-left",
    label: "Left Arm",
    metric: "Grip strength",
    value: "38 kg",
    trend: "Stable",
    x: 39,
    y: 47,
    records: [
      { time: "07:30", note: "Resistance set · 3×10" },
      { time: "18:00", note: "Recovery massage" },
    ],
  },
  {
    id: "chest",
    label: "Chest",
    metric: "Heart rate",
    value: "89 bpm",
    trend: "Resting · normal",
    x: 50,
    y: 42,
    records: [
      { time: "06:00", note: "HRV reading · 64 ms" },
      { time: "09:45", note: "ECG snapshot · sinus" },
      { time: "20:10", note: "Breath cycle · 12/min" },
    ],
  },
  {
    id: "arm-right",
    label: "Right Arm",
    metric: "Grip strength",
    value: "41 kg",
    trend: "+2 kg this week",
    x: 61,
    y: 47,
    records: [
      { time: "07:30", note: "Resistance set · 3×10" },
      { time: "16:20", note: "Mobility check · OK" },
    ],
  },
  {
    id: "stomach",
    label: "Stomach",
    metric: "Core strain",
    value: "06%",
    trend: "Low load",
    x: 50,
    y: 56,
    records: [
      { time: "08:30", note: "Breakfast · 420 kcal" },
      { time: "12:45", note: "Lunch · 610 kcal" },
      { time: "19:15", note: "Hydration · 1.8 L" },
    ],
  },
  {
    id: "quads",
    label: "Quads",
    metric: "Muscle load",
    value: "64%",
    trend: "Recovery advised",
    x: 50,
    y: 72,
    records: [
      { time: "06:30", note: "Run · 5.2 km" },
      { time: "17:00", note: "Squats · 4×8" },
      { time: "21:00", note: "Stretch · 8 min" },
    ],
  },
];

export const HumanModel = ({ db }: { db: number }) => {
  const [active, setActive] = useState("chest");
  const region = regions.find((r) => r.id === active)!;

  return (
    <div className="card-surface p-5 sm:p-6 bg-primary text-primary-foreground relative overflow-hidden flex flex-col md:flex-row gap-5">
      {/* Left column: stats + records */}
      <div className="flex flex-col justify-between gap-4 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="chip bg-primary-foreground/10 text-primary-foreground w-fit">
            <ArrowUpRight className="w-3 h-3" /> 06%
          </span>
          <div className="flex flex-wrap gap-1.5 justify-end">
            {regions.map((r) => (
              <button
                key={r.id}
                onClick={() => setActive(r.id)}
                aria-label={r.label}
                className={`w-2.5 h-2.5 rounded-full transition ${
                  active === r.id ? "bg-dark" : "bg-primary-foreground/30 hover:bg-primary-foreground/60"
                }`}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider opacity-70">{region.label}</p>
          <p className="text-sm font-medium mt-2">{region.metric}</p>
          <p className="text-5xl sm:text-6xl font-display tracking-tight leading-none mt-1">
            {region.value}
          </p>
          <p className="text-xs opacity-70 mt-2">{region.trend}</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-wider opacity-60">Recent records</p>
          <ul className="space-y-1">
            {region.records.map((rec, i) => (
              <li
                key={i}
                className="flex items-center gap-3 text-xs bg-primary-foreground/10 rounded-md px-2.5 py-1.5"
              >
                <span className="font-mono opacity-70 w-10 shrink-0">{rec.time}</span>
                <span className="truncate">{rec.note}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[10px] opacity-50">db reference · {db.toFixed(2)}</p>
      </div>

      {/* Right column: figure */}
      <div className="relative flex items-center justify-center w-full md:w-56 lg:w-64 self-stretch">
        <div className="relative w-44 sm:w-52 md:w-full aspect-[1/2] mx-auto">
          <div
            aria-label="Human anatomy silhouette"
            className="absolute inset-0 bg-primary-foreground"
            style={{
              WebkitMaskImage: `url(${humanBody})`,
              maskImage: `url(${humanBody})`,
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskSize: "contain",
              maskSize: "contain",
            }}
          />
          {regions.map((r) => (
            <button
              key={r.id}
              onClick={() => setActive(r.id)}
              aria-label={r.label}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${r.x}%`, top: `${r.y}%` }}
            >
              <span
                className={`relative block w-3.5 h-3.5 rounded-full border-2 border-dark transition ${
                  active === r.id ? "bg-primary" : "bg-background"
                }`}
              >
                {active === r.id && (
                  <span
                    className="absolute inset-0 rounded-full bg-primary"
                    style={{ animation: "ping-soft 2s ease-out infinite" }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
