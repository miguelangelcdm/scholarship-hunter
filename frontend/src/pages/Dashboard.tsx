import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  const { data: scholarships = [], isLoading } = useQuery({
    queryKey: ['scholarships'],
    queryFn: api.getScholarships
  });

  const scanMutation = useMutation({
    mutationFn: api.scanScholarships,
    onSuccess: (data) => {
      toast.success(data.message || "Scan complete!");
      queryClient.invalidateQueries({ queryKey: ['scholarships'] });
    },
    onError: () => {
      toast.error("Failed to run scan. Make sure your profile is saved first!");
    }
  });

  const desireMatches = scholarships.filter((s: any) => s.desire_score > 70).sort((a: any, b: any) => b.desire_score - a.desire_score);
  const probMatches = scholarships.filter((s: any) => s.probability_score > 70).sort((a: any, b: any) => b.probability_score - a.probability_score);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-foreground">Discovery Dashboard</h1>
          <p className="text-muted-foreground mt-1">Review your AI-matched scholarship opportunities.</p>
        </div>
        <button 
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          {scanMutation.isPending ? "Scanning..." : "Run Discovery Scan"}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm transition-all hover:shadow-md">
          <h2 className="text-xl font-bold text-card-foreground mb-2 flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-500 mr-3 shadow-glow"></span>
            Desire-Based Matches
          </h2>
          <p className="text-sm text-muted-foreground mb-6">Opportunities aligned strictly with your specified fields and preferences.</p>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 border border-border/50 bg-background rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-6 w-24 mt-2" />
                </div>
              ))
            ) : desireMatches.length === 0 ? (
              <div className="p-4 border border-border/50 bg-secondary/30 rounded-xl">
                <p className="text-sm text-muted-foreground italic text-center py-4">No matches yet. Run a scan!</p>
              </div>
            ) : (
              desireMatches.map((s: any) => (
                <div key={s.id} className="p-4 border border-border/50 bg-background rounded-xl hover:border-blue-500/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-foreground">{s.title}</h3>
                    <span className="text-xs font-bold bg-blue-500/10 text-blue-500 px-2 py-1 rounded-md">{s.desire_score}% Desire</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.provider}</p>
                  <p className="text-sm mt-3 text-card-foreground font-display tracking-tight text-xl">{s.amount}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm transition-all hover:shadow-md">
          <h2 className="text-xl font-bold text-card-foreground mb-2 flex items-center">
            <span className="w-3 h-3 rounded-full bg-emerald-500 mr-3 shadow-glow"></span>
            Probability-Based Matches
          </h2>
          <p className="text-sm text-muted-foreground mb-6">Opportunities where you have the highest statistical chance of winning based on your profile.</p>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 border border-border/50 bg-background rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-6 w-24 mt-2" />
                </div>
              ))
            ) : probMatches.length === 0 ? (
              <div className="p-4 border border-border/50 bg-secondary/30 rounded-xl">
                <p className="text-sm text-muted-foreground italic text-center py-4">No matches yet. Run a scan!</p>
              </div>
            ) : (
              probMatches.map((s: any) => (
                <div key={s.id} className="p-4 border border-border/50 bg-background rounded-xl hover:border-emerald-500/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-foreground">{s.title}</h3>
                    <span className="text-xs font-bold bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md">{s.probability_score}% Chance</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.provider}</p>
                  <p className="text-sm mt-3 text-card-foreground font-display tracking-tight text-xl">{s.amount}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
