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
        base: "bg-white/5 dark:bg-black/40 backdrop-blur-3xl border border-white/10 dark:border-white/5 overflow-hidden",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="relative p-0 h-64 overflow-hidden">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
                  <Spinner size="lg" color="primary" />
                </div>
              ) : data?.image_url ? (
                <>
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out" 
                    style={{ backgroundImage: `url(${data.image_url})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
              )}
              
              <div className="absolute bottom-6 left-6 right-6">
                <h2 className="text-4xl font-bold text-white mb-2 drop-shadow-md">
                  {universityName}
                </h2>
                {programs.length > 0 && (
                  <Chip size="sm" color="success" variant="flat" className="backdrop-blur-md">
                    {programs.length} Programs Found
                  </Chip>
                )}
              </div>
            </ModalHeader>

            <ModalBody className="p-6 gap-6">
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-3/4"></div>
                  <div className="h-4 bg-white/10 rounded w-1/2"></div>
                </div>
              ) : (
                <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-lg">
                  {data?.description}
                </p>
              )}

              <h3 className="text-xl font-semibold mt-4 text-zinc-800 dark:text-white">
                Academic Programs & Opportunities
              </h3>
              
              <Accordion variant="splitted" className="px-0">
                {programs.map((p) => {
                  const programFunding = scholarships.filter(s => s.target_program_id === p.id);
                  return (
                    <AccordionItem 
                      key={p.id} 
                      aria-label={p.title}
                      title={
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-lg">{p.title}</span>
                            <div className="flex gap-2">
                              {p.is_online && <Chip size="sm" variant="flat" color="warning">Online</Chip>}
                              <Chip size="sm" variant="dot" color={p.probability_score >= 70 ? "success" : "warning"}>
                                Match: {p.probability_score}%
                              </Chip>
                            </div>
                          </div>
                        </div>
                      }
                      classNames={{
                        base: "bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-sm",
                      }}
                    >
                      <div className="p-2 space-y-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {p.details || "No details available."}
                        </p>
                        
                        {p.improvement_projection && (
                          <Card className="bg-warning/10 border-warning/20 border">
                            <CardBody className="p-3 text-sm text-warning-600 dark:text-warning-400 flex flex-row gap-2 items-start">
                              <span className="text-xl">⚠️</span>
                              <span>{p.improvement_projection}</span>
                            </CardBody>
                          </Card>
                        )}

                        <div className="flex items-center justify-between mt-4">
                          <h4 className="font-semibold text-zinc-800 dark:text-zinc-200">
                            Secured Funding ({programFunding.length})
                          </h4>
                          <Button 
                            size="sm" 
                            color="primary" 
                            variant="flat"
                            isLoading={isFundingLoading === p.id}
                            onPress={() => onFindFunding(p.id)}
                          >
                            Scan Financial Aid
                          </Button>
                        </div>
                        
                        {programFunding.length > 0 ? (
                          <div className="grid gap-2">
                            {programFunding.map((s, idx) => (
                              <div key={idx} className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
                                <span className="font-medium text-green-700 dark:text-green-400">{s.title}</span>
                                <p className="text-green-600 dark:text-green-500/70 mt-1">{s.amount || s.description}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-500 italic">No specific funding found yet. Run a scan to discover options.</p>
                        )}
                      </div>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </ModalBody>

            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Close Deep Dive
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
