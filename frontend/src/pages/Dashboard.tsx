import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Sparkles, Building2, Globe, ShieldCheck, AlertTriangle, Lock, ArrowRight, Radar, CheckCircle2, Database, Search, Loader2, X, ChevronRight, Heart, Clock, Inbox, Check } from "lucide-react";
import UniversityDetailDrawer from "@/components/dashboard/UniversityDetailDrawer";
import { useNavigate } from "react-router-dom";

const formatScanTime = (isoString: string) => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return "";
  }
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("Initiating scan...");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'shortlisted' | 'targeted'>('all');
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedUniversityName, setSelectedUniversityName] = useState<string>("");

  // Targeted Quick Scan States
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ name: string; domain: string }>>([]);
  const [selectedUnis, setSelectedUnis] = useState<Array<{ name: string; domain: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await api.searchUniversities(searchQuery);
        setSuggestions(response);
      } catch (err) {
        console.error("Error fetching university suggestions:", err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const targetedScanMutation = useMutation({
    mutationFn: async (targets: { name: string; domain: string }[]) => {
      setScanProgress(0);
      setScanStatus("Initiating targeted scan...");
      setIsScanning(true);
      
      const response = await api.triggerTargetedScan(targets);
      return response.job_id;
    },
    onSuccess: (jobId) => {
      startPolling(jobId);
      setSelectedUnis([]);
      setSearchQuery("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to start targeted scan.");
      setIsScanning(false);
      setActiveJobId(null);
    }
  });
  
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile
  });

  const { data: scholarships = [], isLoading: isLoadingScholarships, refetch: refetchScholarships } = useQuery({
    queryKey: ['scholarships'],
    queryFn: api.getFunding
  });

  const { data: lastScanData, refetch: refetchLastScan } = useQuery({
    queryKey: ['lastScan'],
    queryFn: api.getLastScan
  });

  const { data: blacklistedUniversities = [], refetch: refetchBlacklist } = useQuery({
    queryKey: ['blacklistedUniversities'],
    queryFn: api.getBlacklistedUniversities
  });


  const startPolling = async (jobId: string) => {
    setIsScanning(true);
    setActiveJobId(jobId);
    
    try {
      while (true) {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await fetch(`${API_BASE}/discovery/mass-scan/${jobId}/status`);
        if (!statusRes.ok) continue;
        
        const statusData = await statusRes.json();
        setScanProgress(statusData.progress || 0);
        setScanStatus(statusData.message || "Scanning...");
        
        if (statusData.status === "completed" || statusData.status === "failed" || statusData.status === "canceled") {
          if (statusData.status === "failed") throw new Error(statusData.message || "Scan failed.");
          break;
        }
      }
      toast.success(jobId.startsWith("target_") ? "Targeted scan complete! Results updated." : "Discovery scan complete! Results updated.");
      refetchScholarships();
      refetchPrograms();
      refetchLastScan();
      setIsScanning(false);
      setActiveJobId(null);
    } catch (err: any) {
      toast.error(err?.message || (jobId.startsWith("target_") ? "Failed to run targeted scan." : "Failed to run discovery scan."));
      setIsScanning(false);
      setActiveJobId(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const checkActiveJob = async () => {
      try {
        const activeJobData = await api.getActiveScan();
        if (activeJobData && activeJobData.active_job_id && isMounted) {
          setScanProgress(activeJobData.progress || 0);
          setScanStatus(activeJobData.message || "Resuming scan progress...");
          startPolling(activeJobData.active_job_id);
        }
      } catch (err) {
        console.error("Failed to check active scan on load:", err);
      }
    };
    
    checkActiveJob();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const massScanMutation = useMutation({
    mutationFn: async () => {
      setScanProgress(0);
      setScanStatus("Initiating discovery scan...");
      setIsScanning(true);
      
      const response = await fetch(`${API_BASE}/discovery/mass-scan`, { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to start discovery scan.");
      }
      const data = await response.json();
      return data.job_id;
    },
    onSuccess: (jobId) => {
      startPolling(jobId);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to run discovery scan.");
      setIsScanning(false);
      setActiveJobId(null);
    }
  });

  const cancelScanMutation = useMutation({
    mutationFn: async () => {
      if (!activeJobId) return;
      setScanStatus("Cancelling search... saving partial results...");
      await api.cancelScan(activeJobId);
    },
    onSuccess: () => {
      toast.success("Discovery scan cancelled. Partial results saved!");
      refetchScholarships();
      refetchPrograms();
      refetchLastScan();
      setIsScanning(false);
      setActiveJobId(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to cancel discovery scan.");
    }
  });

  const restoreProgramMutation = useMutation({
    mutationFn: api.restoreProgram,
    onSuccess: () => {
      toast.success("Program restored to opportunities list!");
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    }
  });

  const { data: programs = [], isLoading: isLoadingPrograms, refetch: refetchPrograms } = useQuery({
    queryKey: ['programs'],
    queryFn: api.getPrograms
  });

  const discardProgramMutation = useMutation({
    mutationFn: api.discardProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    }
  });

  const toggleInterestMutation = useMutation({
    mutationFn: api.toggleProgramInterest,
    onSuccess: (res) => {
      if (res.status === "Interested") {
        toast.success("Program added to shortlist!");
      } else {
        toast.success("Program removed from shortlist.");
      }
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
    onError: () => toast.error("Failed to update program shortlist.")
  });

  const discardFundingMutation = useMutation({
    mutationFn: api.discardFunding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scholarships'] });
    }
  });

  const blacklistUniversityMutation = useMutation({
    mutationFn: api.blacklistUniversity,
    onSuccess: () => {
      toast.success("University blacklisted!");
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['scholarships'] });
      refetchBlacklist();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to blacklist university.");
    }
  });

  const restoreUniversityMutation = useMutation({
    mutationFn: api.restoreUniversity,
    onSuccess: () => {
      toast.success("University restored!");
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      refetchBlacklist();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to restore university.");
    }
  });

  const desireMatches = scholarships.filter((s: any) => s.desire_score > 70).sort((a: any, b: any) => b.desire_score - a.desire_score);
  
  const uncheckedUnisCount = Object.entries(
    programs.filter((p: any) => p.status !== "Discarded").reduce((acc: any, curr: any) => {
      if (!acc[curr.university]) acc[curr.university] = [];
      acc[curr.university].push(curr);
      return acc;
    }, {})
  ).filter(([_, progs]: [string, any]) => progs.every((p: any) => !p.is_checked && p.status === 'Discovered')).length;

  const displayPrograms = programs.filter((p: any) => {
    if (activeCategory === 'shortlisted') {
      return p.status === 'Interested';
    } else if (activeCategory === 'targeted') {
      return p.is_targeted && p.status !== 'Discarded';
    } else {
      return p.status !== "Discarded";
    }
  }).map((p: any) => ({
    id: p.id,
    title: p.title,
    institution: p.university,
    location: p.country,
    modality: p.is_online ? "Online" : p.is_hybrid ? "Hybrid" : "In-Person",
    desireScore: p.desire_score || 0,
    probabilityScore: p.probability_score || 0,
    improvementProjection: p.improvement_projection || null,
    tuition: p.country === "Germany" ? "Free (Public)" : p.country === "Switzerland" ? "CHF 1,500 / yr" : "$25,000 / yr",
    status: p.status,
    url: p.url,
    instructionLanguages: Array.isArray(p.instruction_languages) ? p.instruction_languages : (p.instruction_languages ? (() => { try { return JSON.parse(p.instruction_languages); } catch { try { return p.instruction_languages.split(","); } catch { return []; } } })() : []),
    offersLanguageTraining: p.offers_language_training,
    foreignerFriendly: p.foreigner_friendly,
    scannedAt: p.scanned_at ? new Date(p.scanned_at) : null,
    isChecked: p.is_checked || false,
    isTargeted: p.is_targeted || false
  })).sort((a: any, b: any) => b.desireScore - a.desireScore);

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


  const handleMassScanClick = () => {
    if (!isProfileComplete) {
      setIsModalOpen(true);
    } else {
      massScanMutation.mutate();
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
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {lastScanData?.last_scan && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-card/60 backdrop-blur-sm border border-border/50 px-3 py-1.5 rounded-xl font-medium shrink-0 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              Last Scanned: {formatScanTime(lastScanData.last_scan)}
            </span>
          )}

          <div className="relative flex gap-2" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
            <button 
              onClick={handleMassScanClick}
              disabled={isScanning}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-md shrink-0 flex items-center gap-2
                ${!isProfileComplete 
                  ? 'bg-muted text-muted-foreground border border-border/80 cursor-not-allowed hover:bg-muted/80' 
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-glow active:scale-95'
                }
              `}
            >
              {!isProfileComplete && <Lock className="w-4 h-4" />}
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning Web...
                </>
              ) : "Start Discovery Scan"}
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
        </div>
      </header>

      {/* Real-time Scan Progress Bar */}
      {isScanning && (
        <div className="bg-card/70 backdrop-blur-md border border-border/80 rounded-3xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Radar className="w-4 h-4 text-primary animate-pulse" />
              {scanStatus}
            </span>
            <span className="text-sm font-extrabold text-foreground bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/25">{scanProgress}%</span>
          </div>
          
          {/* Progress bar container */}
          <div className="w-full bg-secondary/80 h-3 rounded-full overflow-hidden p-0.5 border border-border/40">
            <div 
              className="bg-gradient-to-r from-primary via-lime-400 to-primary h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(180,244,60,0.4)]"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => cancelScanMutation.mutate()}
              disabled={cancelScanMutation.isPending}
              className="font-bold text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 px-4 py-2.5 rounded-xl border border-red-500/20 active:scale-95 duration-200 flex items-center gap-1.5 disabled:opacity-50"
            >
              {cancelScanMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Cancel Search
            </button>
          </div>
        </div>
      )}

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

        {/* LANE 1: UNIVERSITY MATCHES */}
        <section className={`bg-card/40 backdrop-blur-md p-6 rounded-3xl border border-border/50 shadow-sm transition-all flex flex-col relative overflow-visible lg:col-span-2 ${!isProfileComplete ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <h2 className="text-2xl font-display text-card-foreground mb-2 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-500" />
            University Matches
            {uncheckedUnisCount > 0 && (
              <span className="text-[10px] flex items-center gap-1 font-bold bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full animate-pulse shrink-0">
                <Inbox className="w-3 h-3" />
                {uncheckedUnisCount} new
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">Target universities with matching programs based on your modality: <strong className="text-foreground">{profile?.preferred_modality || "Pending"}</strong></p>
          
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6 border-b border-border/40 pb-5">
            <div className="flex flex-wrap gap-1.5 bg-secondary/15 p-1 rounded-xl border border-border/30 w-fit shrink-0">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                  activeCategory === 'all'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Matches
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('shortlisted')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                  activeCategory === 'shortlisted'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${activeCategory === 'shortlisted' ? 'fill-rose-500 text-rose-500' : ''}`} />
                Shortlisted
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('targeted')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                  activeCategory === 'targeted'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Direct Searches
              </button>
            </div>

            {/* Combined Search & Quick Scan Bar */}
            <div className="relative flex flex-col gap-1.5 min-w-[280px] lg:w-[360px] max-w-full z-30">
              <div className="flex items-center gap-2 bg-background/50 border border-border/60 rounded-xl px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all duration-200">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Filter matches or search new uni..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="bg-transparent border-0 text-sm focus:outline-none focus:ring-0 w-full placeholder:text-muted-foreground/60 text-foreground p-0"
                />
                {selectedUnis.length > 0 && (
                  <button
                    onClick={() => targetedScanMutation.mutate(selectedUnis)}
                    disabled={isScanning}
                    className="flex items-center gap-1 bg-primary text-primary-foreground font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg hover:bg-primary/95 active:scale-95 transition-all duration-150 disabled:opacity-50 shrink-0"
                  >
                    {targetedScanMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Radar className="w-3 h-3" />
                    )}
                    Scan ({selectedUnis.length})
                  </button>
                )}
              </div>

              {/* Autocomplete suggestions dropdown */}
              {showSuggestions && (searchQuery.trim().length >= 2 || suggestions.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                  {suggestions.length === 0 && searchQuery.trim().length >= 2 ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      No universities found in ROR.
                      {searchQuery.includes(".") && (
                        <button
                          type="button"
                          onClick={() => {
                            const newUni = { name: searchQuery.trim(), domain: searchQuery.trim() };
                            if (!selectedUnis.some(x => x.domain === newUni.domain)) {
                              setSelectedUnis([...selectedUnis, newUni]);
                            }
                            setSearchQuery("");
                            setShowSuggestions(false);
                          }}
                          className="block w-full mt-2 py-1.5 px-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold transition-all"
                        >
                          Add custom domain: "{searchQuery.trim()}"
                        </button>
                      )}
                    </div>
                  ) : (
                    suggestions.map((uni) => (
                      <button
                        key={uni.name + uni.domain}
                        type="button"
                        onClick={() => {
                          if (!selectedUnis.some(x => x.domain === uni.domain)) {
                            setSelectedUnis([...selectedUnis, uni]);
                          }
                          setSearchQuery("");
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-accent text-sm text-foreground transition-all duration-150 flex items-center justify-between border-b border-border/20 last:border-b-0"
                      >
                        <span className="font-medium truncate">{uni.name}</span>
                        <span className="text-[10px] bg-secondary px-2 py-0.5 rounded text-muted-foreground truncate">{uni.domain}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Selected badges inline */}
              {selectedUnis.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 max-w-full">
                  {selectedUnis.map((uni) => (
                    <span key={uni.domain} className="inline-flex items-center gap-1 text-[10px] font-bold bg-secondary text-foreground border border-border pl-2 pr-1 py-0.5 rounded-lg shrink-0">
                      <span className="truncate max-w-[120px]">{uni.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedUnis(selectedUnis.filter(x => x.domain !== uni.domain))}
                        className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded p-0.5"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => setSelectedUnis([])}
                    className="text-[9px] font-bold text-muted-foreground hover:text-foreground underline pl-1"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <span className="text-xs text-muted-foreground font-semibold">
              Showing <strong className="text-foreground">{displayPrograms.length}</strong> matching programs
            </span>
          </div>

          <div className="space-y-6">
            {isLoadingPrograms ? (
              <div className="p-5 border border-border/50 bg-background/50 rounded-2xl space-y-3">
                <Skeleton className="h-6 w-1/3 bg-muted/60" />
                <Skeleton className="h-4 w-1/4 bg-muted/60" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-16 w-full bg-muted/60" />
                  <Skeleton className="h-16 w-full bg-muted/60" />
                </div>
              </div>
            ) : displayPrograms.length === 0 ? (
              isScanning ? (
                <div className="p-12 border border-border/40 bg-background/40 backdrop-blur-sm rounded-2xl h-full flex flex-col items-center justify-center text-center space-y-4 shadow-inner animate-pulse">
                  <div className="relative flex items-center justify-center w-16 h-16 mb-2">
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-indigo-500/40 animate-pulse" />
                    <Radar className="w-8 h-8 text-indigo-500 animate-[spin_3s_linear_infinite]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Scanning for Universities</h3>
                    <p className="text-sm text-muted-foreground max-w-[280px] mt-2">
                      Analyzing global databases for your ideal academic matches...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-12 border border-border/40 bg-background/40 backdrop-blur-sm rounded-2xl h-full flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <Search className="w-8 h-8 text-indigo-400 opacity-80" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">No Universities Discovered</h3>
                    <p className="text-sm text-muted-foreground max-w-[280px] mt-2">
                      You haven't run the Discovery Engine yet. Trigger a scan to search the web for your ideal programs.
                    </p>
                  </div>
                </div>
              )
            ) : (
              (() => {
                // Find the latest scanned_at date
                const maxScannedAt = displayPrograms.reduce((max: Date | null, p: any) => {
                  if (!p.scannedAt) return max;
                  if (!max) return p.scannedAt;
                  return p.scannedAt > max ? p.scannedAt : max;
                }, null);

                let groupedUnis = Object.entries(
                  displayPrograms.reduce((acc: any, curr: any) => {
                    if (!acc[curr.institution]) acc[curr.institution] = [];
                    acc[curr.institution].push(curr);
                    return acc;
                  }, {})
                );

                if (searchQuery.trim().length > 0) {
                  const q = searchQuery.toLowerCase().trim();
                  groupedUnis = groupedUnis.filter(([uni, progs]: [string, any]) => 
                    uni.toLowerCase().includes(q) || 
                    progs.some((p: any) => p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q))
                  );
                }

                // Sort: last scan at the top, older scans pushed to bottom
                groupedUnis.sort(([uniA, progsA]: [string, any], [uniB, progsB]: [string, any]) => {
                  const maxA = progsA.reduce((maxVal: Date | null, p: any) => !p.scannedAt ? maxVal : (!maxVal || p.scannedAt > maxVal ? p.scannedAt : maxVal), null);
                  const maxB = progsB.reduce((maxVal: Date | null, p: any) => !p.scannedAt ? maxVal : (!maxVal || p.scannedAt > maxVal ? p.scannedAt : maxVal), null);
                  
                  const isLastScanA = maxA && maxScannedAt && (maxScannedAt.getTime() - maxA.getTime()) <= 10 * 60 * 1000;
                  const isLastScanB = maxB && maxScannedAt && (maxScannedAt.getTime() - maxB.getTime()) <= 10 * 60 * 1000;

                  if (isLastScanA && !isLastScanB) return -1;
                  if (!isLastScanA && isLastScanB) return 1;

                  // Fallback: sort by highest desire score
                  const maxScoreA = Math.max(...progsA.map((p: any) => p.desireScore));
                  const maxScoreB = Math.max(...progsB.map((p: any) => p.desireScore));
                  return maxScoreB - maxScoreA;
                });

                return groupedUnis.map(([university, universityPrograms]: [string, any]) => {
                  const totalSecured = scholarships.filter((s: any) => 
                    universityPrograms.some((p: any) => p.id === s.target_program_id)
                  ).length;

                  const isUnchecked = universityPrograms.every((p: any) => !p.isChecked && p.status === 'Discovered');
                  const isTargeted = universityPrograms.some((p: any) => p.isTargeted);
                  const scannedAt = universityPrograms[0]?.scannedAt;

                  const getExpirationText = (date: Date) => {
                    const expDays = 7;
                    const expiryTime = date.getTime() + expDays * 24 * 60 * 60 * 1000;
                    const timeLeftMs = expiryTime - Date.now();
                    if (timeLeftMs <= 0) return "Expired / Purging";
                    
                    const timeLeftHours = Math.ceil(timeLeftMs / (1000 * 60 * 60));
                    if (timeLeftHours > 24) {
                      const days = Math.floor(timeLeftHours / 24);
                      return `Expires in ${days}d`;
                    }
                    return `Expires in ${timeLeftHours}h`;
                  };

                  return (
                  <div 
                    key={university} 
                    className="p-6 border border-border/60 bg-background/85 rounded-2xl hover:border-indigo-500/50 hover:bg-secondary/40 cursor-pointer transition-all group flex items-center justify-between shadow-sm hover:shadow"
                    onClick={() => {
                      setSelectedUniversityName(university);
                      setIsDrawerOpen(true);
                    }}
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground text-xl flex items-center gap-2 flex-wrap">
                        <Building2 className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 shrink-0" />
                        <span>{university}</span>
                        {isUnchecked && (
                          <span className="text-[10px] inline-flex items-center gap-1 font-extrabold bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-md animate-pulse">
                            NEW
                          </span>
                        )}
                        {isTargeted && (
                          <span className="text-[10px] inline-flex items-center gap-1 font-extrabold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                            Targeted
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Globe className="w-4 h-4 text-zinc-400" />
                          {universityPrograms[0].location}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <GraduationCap className="w-4 h-4 text-zinc-400" />
                          {universityPrograms.length} Programs
                        </div>
                        {totalSecured > 0 && (
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                            <Database className="w-4 h-4" />
                            {totalSecured} Funding Matches
                          </div>
                        )}
                        {isUnchecked && scannedAt && (
                          <div className="flex items-center gap-1 text-xs text-amber-500/80 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-md shrink-0">
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            {getExpirationText(scannedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        blacklistUniversityMutation.mutate(university);
                        toast.success(`${university} blacklisted! Undo from the bottom drawer.`);
                      }}
                      title="Blacklist University"
                      className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-95 duration-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>
                );
              })} )())}
          </div>
        </section>

      </div>



      {/* Collapsed Discrete Blacklisted Opportunities */}
      {(programs.filter((p: any) => p.status === "Discarded").length > 0 || blacklistedUniversities.length > 0) && (
        <div className="mt-12 border-t border-border/40 pt-8 animate-fade-in">
          <div className="bg-secondary/10 dark:bg-zinc-900/20 border border-border/40 rounded-3xl overflow-hidden shadow-inner">
            <button
              onClick={() => setIsBlacklistOpen(!isBlacklistOpen)}
              className="w-full flex items-center justify-between p-6 hover:bg-secondary/20 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🛡️</span>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Blacklisted Opportunities</h3>
                  <p className="text-xs text-muted-foreground">
                    {programs.filter((p: any) => p.status === "Discarded").length} programs & {blacklistedUniversities.length} universities blocked
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isBlacklistOpen ? 'rotate-90' : ''}`} />
            </button>

            {isBlacklistOpen && (
              <div className="px-6 pb-6 border-t border-border/20 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-96 overflow-y-auto">
                {/* Left Column: Programs */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <span>📋</span> Blacklisted Programs ({programs.filter((p: any) => p.status === "Discarded").length})
                  </h4>
                  {programs.filter((p: any) => p.status === "Discarded").length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 italic">No programs blacklisted.</p>
                  ) : (
                    programs.filter((p: any) => p.status === "Discarded").map((p: any) => (
                      <div key={p.id} className="flex justify-between items-center p-4 bg-background/60 border border-border/50 rounded-2xl hover:border-indigo-500/20 transition-colors gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-foreground text-sm block truncate" title={p.title}>{p.title}</span>
                          <span className="text-xs text-muted-foreground block truncate">{p.university} • {p.country}</span>
                        </div>
                        <button 
                          onClick={() => restoreProgramMutation.mutate(p.id)}
                          className="font-bold text-xs bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/25 px-4 py-2 rounded-xl border border-indigo-500/25 active:scale-95 duration-200 shrink-0"
                        >
                          Restore
                        </button>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Right Column: Universities */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <span>🏢</span> Blacklisted Universities ({blacklistedUniversities.length})
                  </h4>
                  {blacklistedUniversities.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 italic">No universities blacklisted.</p>
                  ) : (
                    blacklistedUniversities.map((u: any) => (
                      <div key={u.id} className="flex justify-between items-center p-4 bg-background/60 border border-border/50 rounded-2xl hover:border-red-500/20 transition-colors gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-foreground text-sm block truncate" title={u.name}>{u.name}</span>
                          <span className="text-[10px] text-muted-foreground block">Blocked at: {new Date(u.blacklisted_at).toLocaleDateString()}</span>
                        </div>
                        <button 
                          onClick={() => restoreUniversityMutation.mutate(u.name)}
                          className="font-bold text-xs bg-red-500/10 text-red-400 hover:bg-red-500/25 px-4 py-2 rounded-xl border border-red-500/25 active:scale-95 duration-200 shrink-0"
                        >
                          Restore
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <UniversityDetailDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        universityName={selectedUniversityName} 
      />
    </div>
  );
}
