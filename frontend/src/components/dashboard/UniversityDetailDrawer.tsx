import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Accordion, AccordionItem, Chip, Spinner, Card, CardBody } from "@heroui/react";
import { X, Building2, Globe, Database, Heart, ShieldAlert, CheckCircle2, Loader2, Link as LinkIcon, Compass, MapPin } from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "sonner";

interface DeepDiveData {
  university: string;
  image_url: string | null;
  description: string;
  location?: string;
  strengths?: string;
  international_insights?: string;
  general_info_url?: string | null;
}

interface UniversityDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  universityName: string;
}

export default function UniversityDetailDrawer({ isOpen, onClose, universityName }: UniversityDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [isFundingLoading, setIsFundingLoading] = useState<number | null>(null);

  // Fetch University Profile Summary
  const { data: profileData, isLoading: isLoadingProfile, refetch } = useQuery<DeepDiveData>({
    queryKey: ["universityDeepDive", universityName],
    queryFn: () => universityName ? api.getUniversityDeepDive(universityName) : Promise.reject("No name"),
    enabled: isOpen && !!universityName,
  });

  // Fetch all programs (filtered locally for this university)
  const { data: programs = [], isLoading: isLoadingPrograms } = useQuery({
    queryKey: ["programs"],
    queryFn: api.getPrograms,
    enabled: isOpen,
  });

  // Fetch all scholarships (filtered locally for university programs)
  const { data: scholarships = [], isLoading: isLoadingScholarships } = useQuery({
    queryKey: ["scholarships"],
    queryFn: api.getFunding,
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen && universityName) {
      refetch();
    }
  }, [isOpen, universityName]);

  const universityPrograms = programs.filter((p: any) => p.university === universityName);

  // Mutations
  const toggleInterestMutation = useMutation({
    mutationFn: api.toggleProgramInterest,
    onSuccess: (res) => {
      if (res.status === "Interested") {
        toast.success("Program added to shortlist!");
      } else {
        toast.success("Program removed from shortlist.");
      }
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
    onError: () => toast.error("Failed to update program shortlist.")
  });

  const discardProgramMutation = useMutation({
    mutationFn: api.discardProgram,
    onSuccess: () => {
      toast.success("Opportunity moved to blacklist!");
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
    onError: () => toast.error("Failed to blacklist program.")
  });

  const blacklistUniversityMutation = useMutation({
    mutationFn: api.blacklistUniversity,
    onSuccess: () => {
      toast.success(`${universityName} blacklisted!`);
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      onClose();
    },
    onError: () => toast.error("Failed to blacklist university.")
  });

  // Esc keyboard close helper
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const universityPhoto = profileData?.image_url || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80";

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Slide-out side drawer container */}
      <div 
        className={`fixed inset-y-0 right-0 w-full sm:w-[520px] bg-background/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-l border-white/10 dark:border-white/5 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        
        {/* Header toolbar */}
        <div className="absolute top-4 right-4 z-50">
          <Button 
            isIconOnly 
            variant="flat"
            className="rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 hover:scale-105 active:scale-95 transition-all"
            onPress={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable contents */}
        <div className="flex-1 overflow-y-auto relative scrollbar-thin">
          
          {/* Hero background inside the drawer */}
          <div className="relative h-64 overflow-hidden pointer-events-none z-0">
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out scale-[1.01]" 
              style={{ backgroundImage: `url(${universityPhoto})` }}
            />
            {/* Transparent-to-dark gradient masking */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background dark:via-zinc-950/40 dark:to-zinc-950" />
          </div>

          {/* Body content */}
          <div className="px-6 pb-20 relative z-10 -mt-20">
            
            {/* Title Block */}
            <div className="mb-6">
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight drop-shadow-sm leading-tight mb-2">
                {universityName}
              </h2>
              <div className="flex flex-wrap gap-2 items-center">
                {profileData?.location && (
                  <Chip size="sm" variant="flat" color="secondary" startContent={<MapPin className="w-3.5 h-3.5" />} className="text-xs px-2 py-0.5 font-semibold">
                    {profileData.location}
                  </Chip>
                )}
                <Chip size="sm" color="primary" variant="flat" className="backdrop-blur-md border border-primary/20 text-xs px-2 py-0.5 font-bold">
                  {universityPrograms.length} Match(es)
                </Chip>
              </div>
            </div>

            {isLoadingProfile ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Spinner size="md" color="primary" />
                <span className="text-muted-foreground text-xs animate-pulse">Loading University Profile...</span>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* University profile description card */}
                <Card className="bg-zinc-900/35 border border-white/5 shadow-sm backdrop-blur-md rounded-2xl p-5">
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1.5">University Profile</h3>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {profileData?.description}
                      </p>
                    </div>
                    
                    {profileData?.strengths && (
                      <div className="space-y-1">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Institutional Strengths</h4>
                        <p className="text-xs text-foreground leading-relaxed">{profileData.strengths}</p>
                      </div>
                    )}

                    {profileData?.international_insights && (
                      <div className="space-y-1">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">International Student Insights</h4>
                        <p className="text-xs text-foreground leading-relaxed">{profileData.international_insights}</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Quick Actions Panel */}
                <div className="grid grid-cols-2 gap-3">
                  {profileData?.general_info_url && (
                    <Button 
                      className="bg-secondary hover:bg-secondary/80 text-foreground py-2.5 rounded-xl font-bold text-xs border border-border/40 transition-all shadow-sm flex items-center gap-1.5"
                      onPress={() => window.open(profileData.general_info_url!, "_blank")}
                      startContent={<LinkIcon className="w-3.5 h-3.5" />}
                    >
                      Official Page
                    </Button>
                  )}
                  <Button
                    color="danger"
                    variant="flat"
                    className="font-bold border border-danger/10 py-2.5 rounded-xl text-xs shadow-sm flex items-center gap-1.5"
                    onPress={() => {
                      if (confirm(`Are you sure you want to blacklist all matches for ${universityName}?`)) {
                        blacklistUniversityMutation.mutate(universityName);
                      }
                    }}
                    startContent={<ShieldAlert className="w-3.5 h-3.5" />}
                  >
                    Blacklist Uni
                  </Button>
                </div>

                {/* Programs lists */}
                <div className="space-y-4 pt-4 border-t border-border/30">
                  <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                    <span>Opportunity Details</span>
                  </h3>

                  <Accordion variant="splitted" className="px-0 gap-3">
                    {universityPrograms.map((p: any) => {
                      const programFunding = scholarships.filter(s => s.target_program_id === p.id);
                      const isOnline = p.is_online;
                      const isHybrid = p.is_hybrid;
                      
                      return (
                        <AccordionItem 
                          key={p.id}
                          aria-label={p.title}
                          title={
                            <div className="flex flex-col gap-1 py-1 w-full pr-2 text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-foreground tracking-tight line-clamp-1">{p.title}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleInterestMutation.mutate(p.id);
                                  }}
                                  className="p-1 hover:bg-zinc-800/40 rounded-full transition-colors active:scale-95 duration-100"
                                >
                                  <Heart 
                                    className={`w-[14px] h-[14px] transition-all duration-200 ${
                                      p.status === "Interested" 
                                        ? "fill-rose-500 text-rose-500 scale-110" 
                                        : "text-muted-foreground hover:text-rose-400"
                                    }`} 
                                  />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {isOnline && <Chip size="sm" variant="flat" color="warning" className="text-[9px] h-5 px-1 py-0">Online</Chip>}
                                {isHybrid && <Chip size="sm" variant="flat" color="primary" className="text-[9px] h-5 px-1 py-0">Hybrid</Chip>}
                                <Chip size="sm" variant="flat" color={(p.probability_score ?? 0) >= 70 ? "success" : "default"} className="text-[9px] h-5 px-1 py-0 border-none font-bold">
                                  Match: {p.probability_score ? `${p.probability_score}%` : "N/A"}
                                </Chip>
                              </div>
                            </div>
                          }
                          classNames={{
                            base: "bg-white/60 dark:bg-zinc-900/40 backdrop-blur-md border border-white/20 dark:border-white/5 shadow-sm rounded-xl overflow-hidden hover:bg-white/80 dark:hover:bg-zinc-900/60 transition-colors",
                            content: "pb-4 px-4 pt-1 text-xs"
                          }}
                        >
                          <div className="space-y-4">
                            <p className="text-xs text-muted-foreground leading-relaxed bg-black/5 dark:bg-black/20 p-3 rounded-lg">
                              {p.details || "No detailed curriculum information available."}
                            </p>

                            {p.url && (
                              <div className="p-2 rounded-lg bg-muted/10 border border-border/30 flex items-center gap-2">
                                <span className="text-xs">🔗</span>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-[8px] uppercase tracking-wider text-muted-foreground">Scanned Source URL</span>
                                  <a 
                                    href={p.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline truncate"
                                  >
                                    {p.url}
                                  </a>
                                </div>
                              </div>
                            )}

                            {p.steps && (
                              <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                                <h5 className="font-bold text-[9px] uppercase tracking-wider text-indigo-500 mb-1">Application Steps</h5>
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{p.steps}</p>
                              </div>
                            )}

                            {p.important_info && (
                              <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                                <h5 className="font-bold text-[9px] uppercase tracking-wider text-rose-500 mb-1">Important Info & Deadlines</h5>
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{p.important_info}</p>
                              </div>
                            )}

                            {p.next_steps && (
                              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                <h5 className="font-bold text-[9px] uppercase tracking-wider text-emerald-500 mb-1">Immediate Next Steps</h5>
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{p.next_steps}</p>
                              </div>
                            )}
                            
                            {p.improvement_projection && (
                              <Card className="bg-warning-500/5 border-warning/10 border shadow-none">
                                <CardBody className="p-3 text-xs text-warning-700 dark:text-warning-400 flex flex-row gap-2 items-start">
                                  <span className="text-sm">💡</span>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-[9px] uppercase tracking-wider opacity-85">Actionable Advice</span>
                                    <span>{p.improvement_projection}</span>
                                  </div>
                                </CardBody>
                              </Card>
                            )}

                            <div className="pt-3 border-t border-border/30">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <h4 className="font-bold text-foreground text-xs">
                                  Secured Funding ({programFunding.length})
                                </h4>
                                <div className="flex gap-1.5">
                                  <Button 
                                    size="sm" 
                                    color="danger" 
                                    variant="flat"
                                    className="font-semibold text-[10px] h-7 px-2 border border-danger/10"
                                    onPress={() => discardProgramMutation.mutate(p.id)}
                                  >
                                    Not Interested
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    color="success" 
                                    variant="flat"
                                    className="font-semibold text-[10px] h-7 px-2 border border-success/10 bg-success/5 hover:bg-success/15"
                                    isLoading={isFundingLoading === p.id}
                                    onPress={async () => {
                                      setIsFundingLoading(p.id);
                                      toast.info(`Running full deep dive for program and funding...`);
                                      try {
                                        await Promise.all([
                                          api.deepScanProgram(p.id),
                                          api.findFunding(p.id)
                                        ]);
                                        toast.success("Deep scan and funding search complete!");
                                        queryClient.invalidateQueries({ queryKey: ['scholarships'] });
                                        queryClient.invalidateQueries({ queryKey: ['programs'] });
                                      } catch (e) {
                                        toast.error("Failed to complete deep dive.");
                                      } finally {
                                        setIsFundingLoading(null);
                                      }
                                    }}
                                  >
                                    Deep Scan
                                  </Button>
                                </div>
                              </div>

                              {programFunding.length > 0 ? (
                                <div className="space-y-2">
                                  {programFunding.map((s: any) => (
                                    <div key={s.id} className="p-3 rounded-lg border border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                                      <div className="flex justify-between items-start gap-3">
                                        <h5 className="font-bold text-xs text-foreground leading-snug">{s.title}</h5>
                                        <Chip size="sm" color="success" variant="flat" className="text-[9px] h-5 px-1">{s.amount || "Full Tuition"}</Chip>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-muted-foreground italic">No secured funding found. Click 'Deep Scan' above to scan.</p>
                              )}
                            </div>
                          </div>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
