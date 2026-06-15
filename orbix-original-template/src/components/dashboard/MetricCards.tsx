import { ArrowUpRight, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const OxygenCard = ({ value }: { value: number }) => (
  <div className="card-surface p-5 flex flex-col gap-3">
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-sm bg-dark" />
      <span className="text-xs text-muted-foreground">Oxygen</span>
    </div>
    <div className="flex items-end gap-1 flex-wrap">
      <span className="text-5xl font-display tracking-tight">{value.toFixed(1)}</span>
      <span className="text-xl text-muted-foreground mb-1">%</span>
    </div>
    <p className="text-[11px] text-muted-foreground mt-auto">±0.2% from last week</p>
  </div>
);

export const BpmCard = ({ bpm }: { bpm: number }) => (
  <div className="rounded-3xl p-5 flex flex-col gap-3 bg-info text-info-foreground">
    <span className="text-[11px] font-medium opacity-80">12:02</span>
    <div className="flex items-end gap-2 flex-wrap">
      <span className="text-5xl font-display tracking-tight text-foreground">{bpm}</span>
      <span className="text-xl text-foreground mb-1">bpm</span>
    </div>
    <p className="text-[11px] text-muted-foreground mt-auto">±0.2% from last week</p>
  </div>
);

export const WellnessCard = ({
  kcal,
  calories,
  workouts,
}: {
  kcal: number;
  calories: number;
  workouts: number;
}) => {
  const [goal, setGoal] = useState(workouts);

  return (
    <div className="card-surface p-5 flex flex-col gap-3 relative">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-3 h-3 rounded-sm bg-primary shrink-0" />
          <span className="text-xs truncate">Wellness</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-3 h-3 rounded-sm bg-dark shrink-0" />
          <span className="text-xs text-muted-foreground truncate">News</span>
        </div>
      </div>

      <div className="flex items-start gap-2 flex-wrap pr-10">
        <span className="text-3xl sm:text-4xl font-display tracking-tight break-all">
          {kcal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="chip bg-primary/30 mt-2">
          <ArrowUpRight className="w-3 h-3" />
          10%
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground -mt-1">KCAL Totally</p>

      <p className="text-[9px] text-muted-foreground uppercase tracking-wide mt-2 leading-relaxed">
        Perfect Wellness Metrics<br />
        Based on <u>Blockchain</u>
      </p>

      <div className="grid grid-cols-2 gap-3 mt-2">
        <div className="min-w-0">
          <span className="text-3xl font-display">{calories}</span>
          <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
            KCAL<br />Calories<br />Burned
          </p>
        </div>
        <div className="relative min-w-0">
          <div className="flex items-start gap-1 flex-wrap">
            <span className="text-3xl font-display">{goal}</span>
            <span className="chip bg-primary/30 text-[10px]">
              <ArrowUpRight className="w-3 h-3" />
              2%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
            Workouts<br />Completed
          </p>
        </div>
      </div>

      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
        <button
          onClick={() => {
            setGoal((g) => g + 1);
            toast("Workout logged");
          }}
          className="w-7 h-7 rounded-full bg-secondary grid place-items-center hover:bg-muted"
          aria-label="Add workout"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setGoal((g) => Math.max(0, g - 1));
            toast("Workout removed");
          }}
          className="w-7 h-7 rounded-full bg-secondary grid place-items-center hover:bg-muted"
          aria-label="Remove workout"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
