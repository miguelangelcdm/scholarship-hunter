import { useEffect, useState } from "react";

export type Metrics = {
  tempF: number;
  timeAm: string;
  oxygen: number;
  bpm: number;
  kcal: number;
  caloriesBurned: number;
  workouts: number;
  db: number;
  bars: number[];
  breath: number[];
  breathLevel: number;
};

const rand = (min: number, max: number, decimals = 0) => {
  const v = Math.random() * (max - min) + min;
  const p = Math.pow(10, decimals);
  return Math.round(v * p) / p;
};

const initial: Metrics = {
  tempF: 98.57,
  timeAm: "09:45",
  oxygen: 97.5,
  bpm: 89,
  kcal: 19365.29,
  caloriesBurned: 265,
  workouts: 8,
  db: 10.57,
  bars: [22, 28, 35, 30, 42, 95, 55, 48, 60, 52, 75, 38, 30, 88, 45, 32],
  breath: [40, 65, 80, 95, 88, 70, 50],
  breathLevel: 12,
};

export function useMockMetrics(): Metrics {
  const [m, setM] = useState<Metrics>(initial);

  useEffect(() => {
    const id = setInterval(() => {
      setM((prev) => ({
        ...prev,
        tempF: +(97.8 + Math.random() * 1.2).toFixed(2),
        oxygen: +(96.5 + Math.random() * 2).toFixed(1),
        bpm: Math.round(78 + Math.random() * 22),
        caloriesBurned: prev.caloriesBurned + rand(0, 3),
        kcal: +(prev.kcal + Math.random() * 4).toFixed(2),
        bars: prev.bars.map((b) => Math.max(15, Math.min(100, b + rand(-10, 10)))),
        breath: prev.breath.map((b) => Math.max(30, Math.min(100, b + rand(-8, 8)))),
        breathLevel: Math.max(8, Math.min(20, prev.breathLevel + rand(-1, 1))),
      }));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return m;
}
