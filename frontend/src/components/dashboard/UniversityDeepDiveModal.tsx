import React, { useEffect, useState } from "react";
import { 
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, 
  Accordion, AccordionItem, Chip, Spinner, Card, CardBody
} from "@heroui/react";
import { api } from "../../lib/api";

interface DeepDiveData {
  university: string;
  image_url: string | null;
  description: string;
}

interface UniversityDeepDiveModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  universityName: string | null;
  programs: any[];
  scholarships: any[];
  onFindFunding: (programId: number) => void;
  isFundingLoading: number | null;
}

export default function UniversityDeepDiveModal({ 
  isOpen, 
  onOpenChange, 
  universityName, 
  programs,
  scholarships,
  onFindFunding,
  isFundingLoading
}: UniversityDeepDiveModalProps) {
  const [data, setData] = useState<DeepDiveData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && universityName) {
      setLoading(true);
      api.getUniversityDeepDive(universityName)
        .then(res => setData(res))
        .catch(err => console.error("Failed to load deep dive", err))
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [isOpen, universityName]);

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange}
      size="4xl"
      scrollBehavior="inside"
      backdrop="blur"
      classNames={{
        base: "bg-background/80 dark:bg-zinc-950/80 backdrop-blur-3xl border border-white/10 dark:border-white/5 overflow-hidden shadow-2xl",
        body: "p-0",
        header: "p-0",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="relative p-0 h-80 overflow-hidden flex flex-col justify-end">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
                  <Spinner size="lg" color="primary" />
                </div>
              ) : data?.image_url ? (
                <>
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out hover:scale-105" 
                    style={{ backgroundImage: `url(${data.image_url})` }}
                  />
                  {/* Smooth top-to-bottom fade merging into the modal background */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-background/60 to-background" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-background to-background" />
              )}
              
              <div className="relative z-10 px-8 pb-8">
                <h2 className="text-4xl lg:text-5xl font-extrabold text-foreground mb-3 tracking-tight">
                  {universityName}
                </h2>
                {programs.length > 0 && (
                  <Chip size="sm" color="primary" variant="flat" className="backdrop-blur-md border border-primary/20">
                    {programs.length} Programs Found
                  </Chip>
                )}
              </div>
            </ModalHeader>

            <ModalBody className="px-8 pb-8 gap-8 -mt-2">
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-muted/40 rounded w-3/4"></div>
                  <div className="h-4 bg-muted/40 rounded w-1/2"></div>
                </div>
              ) : (
                <p className="text-muted-foreground leading-relaxed text-lg font-medium">
                  {data?.description}
                </p>
              )}

              <div>
                <h3 className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-emerald-500">
                    Academic Opportunities
                  </span>
                </h3>
                
                <Accordion variant="shadow" className="px-0 gap-3">
                  {programs.map((p) => {
                    const programFunding = scholarships.filter(s => s.target_program_id === p.id);
                    return (
                      <AccordionItem 
                        key={p.id} 
                        aria-label={p.title}
                        title={
                          <div className="flex items-center justify-between py-1">
                            <div className="flex flex-col gap-1.5">
                              <span className="font-semibold text-lg text-foreground tracking-tight">{p.title}</span>
                              <div className="flex flex-wrap gap-2">
                                {p.is_online && <Chip size="sm" variant="flat" color="warning" className="text-[10px] h-5">Online</Chip>}
                                <Chip size="sm" variant="flat" color={p.probability_score >= 70 ? "success" : "default"} className="text-[10px] h-5 border border-success/20">
                                  Match: {p.probability_score}%
                                </Chip>
                              </div>
                            </div>
                          </div>
                        }
                        classNames={{
                          base: "bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden mb-3",
                          content: "pb-4 px-4"
                        }}
                      >
                        <div className="space-y-5">
                          <p className="text-sm text-muted-foreground leading-relaxed bg-black/5 dark:bg-black/20 p-4 rounded-xl">
                            {p.details || "No detailed curriculum information available."}
                          </p>

                          {p.steps && (
                            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                              <h5 className="font-bold text-xs uppercase tracking-wider text-indigo-500 mb-2">Application Steps</h5>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.steps}</p>
                            </div>
                          )}

                          {p.important_info && (
                            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
                              <h5 className="font-bold text-xs uppercase tracking-wider text-rose-500 mb-2">Important Requirements & Deadlines</h5>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.important_info}</p>
                            </div>
                          )}

                          {p.next_steps && (
                            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                              <h5 className="font-bold text-xs uppercase tracking-wider text-emerald-500 mb-2">Immediate Next Steps</h5>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.next_steps}</p>
                            </div>
                          )}
                          
                          {p.improvement_projection && (
                            <Card className="bg-warning-500/10 border-warning/20 border shadow-none">
                              <CardBody className="p-4 text-sm text-warning-700 dark:text-warning-400 flex flex-row gap-3 items-start">
                                <span className="text-lg">💡</span>
                                <div className="flex flex-col gap-1">
                                  <span className="font-bold text-xs uppercase tracking-wider opacity-80">Actionable Advice</span>
                                  <span>{p.improvement_projection}</span>
                                </div>
                              </CardBody>
                            </Card>
                          )}

                          <div className="pt-4 border-t border-border/40">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                              <h4 className="font-bold text-foreground text-sm tracking-wide">
                                Secured Funding ({programFunding.length})
                              </h4>
                              <Button 
                                size="sm" 
                                color="primary" 
                                variant="shadow"
                                className="font-semibold text-xs"
                                isLoading={isFundingLoading === p.id}
                                onPress={() => onFindFunding(p.id)}
                              >
                                Run Full Deep Dive
                              </Button>
                            </div>
                            
                            {programFunding.length > 0 ? (
                              <div className="grid gap-3">
                                {programFunding.map((s, idx) => (
                                  <div key={idx} className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 text-sm hover:border-emerald-500/40 transition-colors">
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1">{s.title}</span>
                                    <p className="text-emerald-600 dark:text-emerald-500/80 text-xs leading-relaxed">{s.amount || s.description}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 rounded-xl border border-dashed border-border/60 bg-muted/20 text-center">
                                <p className="text-xs text-muted-foreground font-medium">No specific funding found yet. Click the button above to launch a targeted scan.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </ModalBody>

            <ModalFooter className="border-t border-border/20 px-8 py-4">
              <Button color="default" variant="light" onPress={onClose} className="font-medium">
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
