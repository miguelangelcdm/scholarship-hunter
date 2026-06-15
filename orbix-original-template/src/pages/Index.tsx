import { useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { Sidebar, MobileSidebar } from "@/components/dashboard/Sidebar";
import { PageTitleBar } from "@/components/dashboard/PageTitleBar";
import { AnalyticsCard } from "@/components/dashboard/AnalyticsCard";
import { OxygenCard, BpmCard, WellnessCard } from "@/components/dashboard/MetricCards";
import { HumanModel } from "@/components/dashboard/HumanModel";
import { BreathChart } from "@/components/dashboard/BreathChart";
import { BreathNowCard } from "@/components/dashboard/BreathNowCard";
import { useMockMetrics } from "@/hooks/useMockMetrics";

const Index = () => {
  const m = useMockMetrics();
  const [active, setActive] = useState("wellness");

  const handleSelect = (id: string) => {
    setActive(id);
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar active={active} onSelect={handleSelect} />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto w-full">
          <MobileSidebar active={active} onSelect={handleSelect} />
          <PageTitleBar />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
            <section id="section-spo2" className="lg:col-span-7">
              <AnalyticsCard bars={m.bars} timeAm={m.timeAm} tempF={m.tempF} />
            </section>

            <section id="section-pulse" className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-5">
              <OxygenCard value={m.oxygen} />
              <BpmCard bpm={m.bpm} />
            </section>

            <section id="section-wellness" className="lg:col-span-2">
              <WellnessCard kcal={m.kcal} calories={m.caloriesBurned} workouts={m.workouts} />
            </section>

            <section id="section-bmd" className="lg:col-span-5">
              <HumanModel db={m.db} />
            </section>

            <section id="section-brain" className="lg:col-span-3">
              <BreathChart values={m.breath} />
            </section>

            <section id="section-rx" className="lg:col-span-4">
              <BreathNowCard level={m.breathLevel} />
            </section>
          </div>

          <footer className="mt-10 text-center text-[11px] text-muted-foreground">
            Orbix Studio · Health Records · Live mock data refreshes every 2s
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Index;
