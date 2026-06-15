import { ArrowUpRight } from "lucide-react";

type Props = { values: number[] };
const days = ["S", "M", "T", "W", "T", "F", "S"];

export const BreathChart = ({ values }: Props) => {
  const max = Math.max(...values);
  const peak = values.indexOf(max);
  return (
    <div className="card-surface p-5 flex flex-col">
      <div className="flex justify-center">
        <span className="chip bg-primary/30">
          <ArrowUpRight className="w-3 h-3" /> 278%
        </span>
      </div>

      <div className="relative flex-1 mt-4 grid grid-cols-7 gap-2 items-end h-40">
        {values.map((v, i) => (
          <div key={i} className="flex flex-col items-center justify-end h-full gap-1 relative">
            <div className="w-px flex-1 bg-border" style={{ height: `${100 - v}%` }} />
            <span
              className={`w-3 h-3 rounded-full ${i === peak ? "bg-dark ring-4 ring-primary/40" : "bg-primary"}`}
              style={{ marginBottom: `${v * 0.6}px` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 text-[11px] text-center text-muted-foreground">
        {days.map((d, i) => <span key={i}>{d}</span>)}
      </div>
    </div>
  );
};
