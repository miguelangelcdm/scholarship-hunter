import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Sparkles, Building2, Globe, ShieldCheck, AlertTriangle, Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Mock Data for Program Matches since backend scraper isn't built yet
const MOCK_PROGRAMS = [
  {
    id: 1,
    title: "MSc in Artificial Intelligence",
    institution: "Technical University of Munich",
    location: "Germany",
    modality: "In-Person (Abroad)",
    tuition: "Free (Admin Fee: ~€138/sem)",
    matchScore: 92
  },
  {
    id: 2,
    title: "MSc Computer Science (Online)",
    institution: "Georgia Institute of Technology",
    location: "USA (Remote)",
    modality: "Online",
    tuition: "$7,000 Total",
    matchScore: 88
  },
  {
    id: 3,
    title: "Master of Data Science",
    institution: "University of Melbourne",
    location: "Australia",
    modality: "Hybrid",
    tuition: "$45,000/yr",
    matchScore: 78
  }
];

export default function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile
  });

  const { data: scholarships = [], isLoading: isLoadingScholarships } = useQuery({
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
  
  // Filter mock programs based on user modality if available
  const displayPrograms = MOCK_PROGRAMS.filter(p => {
    if (!profile?.preferred_modality) return true;
    if (profile.preferred_modality === "Online") return p.modality === "Online";
    if (profile.preferred_modality === "Hybrid") return p.modality === "Hybrid" || p.modality === "Online";
    return true; // If In-Person, show all for now
  });

  const feasibilityScore = profile?.relocation_feasibility_score || 0;
  
  const getFeasibilityBadge = (modality: string) => {
    if (modality === "Online" || modality === "In-Person (Local)") return null;
    
    if (feasibilityScore >= 80) return <span className="text-[10px] flex items-center gap-1 font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-md border border-emerald-500/20"><ShieldCheck className="w-3 h-3"/> {feasibilityScore}% Visa Feasibility</span>;
    if (feasibilityScore >= 50) return <span className="text-[10px] flex items-center gap-1 font-bold bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-md border border-yellow-500/20"><AlertTriangle className="w-3 h-3"/> {feasibilityScore}% Visa Feasibility</span>;
    return <span className="text-[10px] flex items-center gap-1 font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-md border border-destructive/20"><AlertTriangle className="w-3 h-3"/> {feasibilityScore}% Low Feasibility</span>;
  };

  // Profile Completeness Logic
  const isProfileComplete = profile && 
    profile.name !== "Default User" && 
    profile.preferred_modality && 
    profile.target_countries && 
    profile.target_countries !== "[]";

  const handleScanClick = () => {
    if (!isProfileComplete) {
      setIsModalOpen(true);
    } else {
      scanMutation.mutate();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 relative">
      
      {/* Modal for Incomplete Profile */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border/80 shadow-2xl rounded-3xl p-8 max-w-md w-full relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4 border border-destructive/20">
              <Lock className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Profile Incomplete</h3>
            <p className="text-muted-foreground text-sm mb-6">
              You must complete your profile (including Geographic Target locations and Modality preferences) before the Discovery Engine can accurately scan for programs and scholarships.
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-primary via-lime-400 to-primary text-primary-foreground py-3.5 rounded-xl font-extrabold transition-all shadow-glow hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(180,244,60,0.4)] border border-primary/30 active:scale-95 duration-200"
            >
              <span>Go to Profile Manager</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-[72px] z-30 flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-background/40 backdrop-blur-md py-4 border-b border-border/30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 transition-all duration-200">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-foreground flex items-center gap-3">
            Discovery Engine
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl">
            Review your AI-matched academic programs and financial aid opportunities, strictly tailored to your modality and relocation constraints.
          </p>
        </div>
        
        <div className="relative" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
          <button 
            onClick={handleScanClick}
            disabled={scanMutation.isPending}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-md shrink-0 flex items-center gap-2
              ${!isProfileComplete 
                ? 'bg-muted text-muted-foreground border border-border/80 cursor-not-allowed hover:bg-muted/80' 
                : 'bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-lg active:scale-95'
              }
            `}
          >
            {!isProfileComplete && <Lock className="w-4 h-4" />}
            {scanMutation.isPending ? "Scanning Web..." : "Run Discovery Scan"}
          </button>

          {/* Hover Popover Tooltip for disabled state */}
          {!isProfileComplete && showTooltip && (
            <div className="absolute top-full right-0 mt-3 w-64 p-3 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-10 animate-in fade-in slide-in-from-top-2 text-xs">
              <div className="absolute -top-2 right-6 w-4 h-4 bg-popover border-t border-l border-border transform rotate-45" />
              <p className="relative z-10 font-medium">Your profile lacks required details.</p>
              <p className="relative z-10 text-muted-foreground mt-1">Please provide your Modality, Targets, and CV to unlock the engine.</p>
            </div>
          )}
        </div>
      </header>

      {/* DASHBOARD GRID: Programs on left, Scholarships on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 relative">
        
        {/* Overlay Blur when Incomplete */}
        {!isProfileComplete && !isProfileLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/5 backdrop-blur-[6px] rounded-3xl border border-border/20">
            <div className="bg-card/90 border border-border p-6 rounded-2xl shadow-xl flex flex-col items-center max-w-sm text-center">
              <Lock className="w-8 h-8 text-muted-foreground mb-3" />
              <h3 className="font-bold text-lg mb-1">Results Locked</h3>
              <p className="text-sm text-muted-foreground mb-5">Complete your Profile Manager steps to tailor these matches exactly to your background and geographic targets.</p>
              <button 
                onClick={() => navigate('/profile')} 
                className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-primary via-lime-400 to-primary text-primary-foreground py-3 px-5 rounded-xl font-extrabold shadow-glow hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(180,244,60,0.3)] border border-primary/20 active:scale-95 duration-200"
              >
                <span>Complete Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* LANE 1: PROGRAM MATCHES */}
        <section className={`bg-card/40 backdrop-blur-md p-6 rounded-3xl border border-border/50 shadow-sm transition-all flex flex-col relative overflow-hidden ${!isProfileComplete ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <h2 className="text-2xl font-display text-card-foreground mb-2 flex items-center">
            <GraduationCap className="w-6 h-6 text-indigo-500 mr-2" />
            Program Matches
          </h2>
          <p className="text-sm text-muted-foreground mb-6">Target university programs filtered by your preferred modality: <strong className="text-foreground">{profile?.preferred_modality || "Pending"}</strong></p>
          
          <div className="space-y-4 flex-1">
            {displayPrograms.length === 0 ? (
              <div className="p-4 border border-border/50 bg-secondary/30 rounded-2xl h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground italic text-center py-4">No programs match your exact modality. Update your profile or run a scan.</p>
              </div>
            ) : (
              displayPrograms.map((p) => (
                <div key={p.id} className="p-5 border border-border/60 bg-background/80 rounded-2xl hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-foreground text-lg group-hover:text-indigo-400 transition-colors">{p.title}</h3>
                    <span className="text-xs font-bold bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-lg border border-indigo-500/20">{p.matchScore}% Match</span>
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      <span>{p.institution}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold bg-secondary px-2 py-1 rounded-md text-foreground">
                        <Globe className="w-3 h-3 text-muted-foreground" />
                        {p.location} ({p.modality})
                      </div>
                      
                      {/* Feasibility Reality Check Badge */}
                      {getFeasibilityBadge(p.modality)}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-border/40 flex justify-between items-center">
                    <span className="text-xs font-semibold text-muted-foreground">Estimated Tuition:</span>
                    <span className="text-sm font-display text-foreground font-bold">{p.tuition}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* LANE 2: SCHOLARSHIP & AID MATCHES */}
        <section className={`bg-card/40 backdrop-blur-md p-6 rounded-3xl border border-border/50 shadow-sm transition-all flex flex-col relative overflow-hidden ${!isProfileComplete ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
          
          <h2 className="text-2xl font-display text-card-foreground mb-2 flex items-center">
            <span className="w-4 h-4 rounded-full bg-emerald-500 mr-2 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
            Financial Aid Matches
          </h2>
          <p className="text-sm text-muted-foreground mb-6">Funding opportunities based on your academic caliber, demographics, and goals.</p>
          
          <div className="space-y-4 flex-1">
            {isLoadingScholarships ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-5 border border-border/50 bg-background/50 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-5 w-2/3 bg-muted/60" />
                    <Skeleton className="h-5 w-16 bg-muted/60" />
                  </div>
                  <Skeleton className="h-3.5 w-1/3 bg-muted/60" />
                  <Skeleton className="h-6 w-24 mt-4 bg-muted/60" />
                </div>
              ))
            ) : desireMatches.length === 0 ? (
              <div className="p-4 border border-border/50 bg-secondary/30 rounded-2xl h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground italic text-center py-4">No financial aid matches yet. Run a discovery scan!</p>
              </div>
            ) : (
              desireMatches.map((s: any) => (
                <div key={s.id} className="p-5 border border-border/60 bg-background/80 rounded-2xl hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-foreground text-lg group-hover:text-emerald-400 transition-colors">{s.title}</h3>
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20">{s.probability_score}% Win Chance</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1">{s.provider}</p>
                  
                  <div className="mt-4 pt-3 border-t border-border/40 flex justify-between items-center">
                    <span className="text-xs font-semibold text-muted-foreground">Funding Amount:</span>
                    <span className="text-lg font-display text-emerald-500 font-bold tracking-tight">{s.amount}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
