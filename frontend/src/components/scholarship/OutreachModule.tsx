import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface OutreachModuleProps {
  scholarshipId: number;
  scholarshipTitle: string;
  onClose: () => void;
}

export default function OutreachModule({ scholarshipId, scholarshipTitle, onClose }: OutreachModuleProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const outreachMutation = useMutation({
    mutationFn: () => api.draftOutreach(scholarshipId),
    onSuccess: (data) => {
      toast.success("Outreach draft generated!");
      setDraft(data.email_draft);
    },
    onError: () => toast.error("Failed to generate outreach email.")
  });

  return (
    <div className="absolute inset-0 bg-background/95 z-50 p-8 rounded-2xl border border-border shadow-2xl flex flex-col animate-fade-in overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold font-display flex items-center">
            <span className="mr-3">✉️</span> University Outreach
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">For: {scholarshipTitle}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground font-bold p-2 bg-secondary/50 rounded-full w-8 h-8 flex items-center justify-center transition-colors">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col lg:flex-row gap-6">
        {/* Educational Panel */}
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl">
            <h3 className="font-bold text-blue-500 mb-2">Why contact them?</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Reaching out to the admissions or financial aid office shows proactive interest. It helps you clarify obscure requirements, confirms you are a serious candidate, and puts a "face" to your application before they even read it.
            </p>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl space-y-3">
            <h3 className="font-bold text-foreground">Typical Steps:</h3>
            <ol className="text-sm space-y-3 text-muted-foreground list-decimal pl-4">
              <li><strong className="text-foreground">Identify the Contact:</strong> Find the specific email for the program director or financial aid advisor.</li>
              <li><strong className="text-foreground">Draft Professionally:</strong> Keep it concise, polite, and ensure your grammar is perfect.</li>
              <li><strong className="text-foreground">Ask a Real Question:</strong> Don't ask what's already on the website. Ask about specific nuances or how your unique background fits.</li>
              <li><strong className="text-foreground">Follow Up:</strong> If they reply, thank them immediately. Use their advice in your final essay.</li>
            </ol>
          </div>

          {!draft && (
            <button 
              onClick={() => outreachMutation.mutate()}
              disabled={outreachMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center"
            >
              {outreachMutation.isPending ? "Generating Draft..." : "Draft Outreach with AI"}
            </button>
          )}
        </div>

        {/* Action Panel */}
        <div className="lg:w-2/3 bg-card rounded-2xl border border-border p-6 flex flex-col">
          <h3 className="font-bold text-foreground mb-4">Your Email Draft</h3>
          {outreachMutation.isPending ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full mt-4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : draft ? (
            <div className="flex-1 bg-background border border-border/50 rounded-xl p-5 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap font-mono">
              {draft}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-secondary/20 rounded-xl border border-dashed border-border">
              <div className="text-4xl mb-4 opacity-50">🤖</div>
              <p className="text-muted-foreground text-sm max-w-sm">
                Click the button to generate a personalized email draft based on your profile and this specific scholarship.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
