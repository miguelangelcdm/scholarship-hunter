import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Tracker() {
  const queryClient = useQueryClient();
  const [selectedEssay, setSelectedEssay] = useState<string | null>(null);

  const { data: scholarships = [], isLoading } = useQuery({
    queryKey: ['scholarships'],
    queryFn: api.getScholarships
  });

  const draftMutation = useMutation({
    mutationFn: (id: number) => api.draftEssay(id),
    onSuccess: (data) => {
      toast.success("Essay draft generated!");
      setSelectedEssay(data.essay_draft);
      queryClient.invalidateQueries({ queryKey: ['scholarships'] });
    },
    onError: () => toast.error("Failed to generate essay.")
  });

  const columns = ["Discovered", "To Apply", "Drafting", "Applied", "Rejected", "Won"];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6 animate-fade-in relative">
      <header className="shrink-0 mb-2">
        <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-foreground">Application Tracker</h1>
        <p className="text-muted-foreground mt-1">Manage your active scholarships and draft essays with AI.</p>
      </header>

      {selectedEssay && (
        <div className="absolute inset-0 bg-background/95 z-50 p-8 rounded-2xl border border-border shadow-2xl flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold font-display">AI Generated Draft</h2>
            <button onClick={() => setSelectedEssay(null)} className="text-muted-foreground hover:text-foreground font-bold">Close X</button>
          </div>
          <div className="flex-1 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground p-4 bg-card rounded-xl border border-border">
            {selectedEssay}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex space-x-6 min-w-max h-full">
          {columns.map((col, index) => {
            const colItems = scholarships.filter((s: any) => s.status === col || (col === "Discovered" && !s.status));
            
            return (
              <div key={index} className="w-[340px] bg-secondary/30 rounded-2xl border border-border/50 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm font-bold text-card-foreground flex justify-between items-center">
                  {col}
                  <span className="bg-background text-muted-foreground text-xs font-semibold px-2.5 py-1 rounded-full border border-border/50 min-w-[24px] text-center">
                    {isLoading ? "..." : colItems.length}
                  </span>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-4">
                  {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="bg-card p-5 rounded-xl border border-border space-y-4">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-8 w-1/3" />
                        <Skeleton className="h-8 w-full rounded-lg" />
                      </div>
                    ))
                  ) : (
                    colItems.map((s: any) => (
                      <div key={s.id} className="bg-card p-5 rounded-xl shadow-sm border border-border hover:border-primary/50 transition-all cursor-grab group relative overflow-hidden">
                        {s.status === "Drafting" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                        <h3 className="font-bold text-card-foreground group-hover:text-primary transition-colors">{s.title}</h3>
                        <div className="flex items-center text-sm text-muted-foreground mt-2 font-medium">
                          <span className="text-3xl font-display tracking-tight text-foreground">{s.amount || "Varies"}</span>
                        </div>
                        
                        {col !== "Drafting" && col !== "Applied" && (
                          <button 
                            onClick={() => draftMutation.mutate(s.id)}
                            disabled={draftMutation.isPending}
                            className="mt-5 w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center border border-blue-500/20"
                          >
                            <span className="mr-2">✨</span> {draftMutation.isPending ? "Generating..." : "Open AI Drafter"}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
