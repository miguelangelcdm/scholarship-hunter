import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  User, 
  GraduationCap, 
  Briefcase, 
  Award, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  Sparkles, 
  Loader2, 
  BookOpen,
  DollarSign,
  Target,
  Compass,
  ArrowRight,
  TrendingUp,
  Globe
} from 'lucide-react';
import PreferencesTab from "@/components/profile/PreferencesTab";
import LanguageManager from "@/components/profile/LanguageManager";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionItem } from "@heroui/react";
import { Checkbox, Input, Textarea } from "@heroui/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { CATEGORIZED_MAJORS } from "@/lib/majors";
export default function Profile() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'experience' | 'highlights' | 'documents' | 'preferences'>('overview');
  
  const [formData, setFormData] = useState({
    name: "Default User",
    major: "",
    target_areas: "",
    degree_level: "",
    has_dependents: false,
    gpa: "",
    demographics: "",
    hobbies: "",
    volunteer_work: "",
    projects: "",
    experience: "",
    awards: "",
    languages: "",
    nationalities: "",
    publications: "",
    financial_need: "",
    career_goals: "",
    target_countries: "",
    undesired_countries: "",
    target_continents: "",
    undesired_continents: "",
    target_tags: "",
    preferred_modality: "",
    primary_goal: "",
    target_diaspora_regions: "",
    target_degree_level: "Masters",
    target_study_type: "Taught"
  });

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [parsingDoc, setParsingDoc] = useState<string | null>(null);
  const [overviewProcessing, setOverviewProcessing] = useState<string | null>(null);
  const [isAutofilling, setIsAutofilling] = useState(false);
  
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const overviewInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile
  });

  useEffect(() => {
    if (profile && !profile.detail) {
      setFormData({
        name: profile.name || "",
        major: profile.major || "",
        target_areas: profile.target_areas || "",
        degree_level: profile.degree_level || "",
        has_dependents: profile.has_dependents || false,
        gpa: profile.gpa || "",
        demographics: profile.demographics || "",
        hobbies: profile.hobbies || "",
        volunteer_work: profile.volunteer_work || "",
        projects: profile.projects || "",
        experience: profile.experience || "",
        awards: profile.awards || "",
        languages: profile.languages || "",
        nationalities: profile.nationalities || "",
        publications: profile.publications || "",
        financial_need: profile.financial_need || "",
        career_goals: profile.career_goals || "",
        target_countries: profile.target_countries || "",
        undesired_countries: profile.undesired_countries || "",
        target_continents: profile.target_continents || "",
        undesired_continents: profile.undesired_continents || "",
        target_tags: profile.target_tags || "",
        preferred_modality: profile.preferred_modality || "",
        primary_goal: profile.primary_goal || "",
        target_diaspora_regions: profile.target_diaspora_regions || "",
        target_degree_level: profile.target_degree_level || "Masters",
        target_study_type: profile.target_study_type || "Taught"
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: () => {
      toast.success("Profile saved securely.");
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => toast.error("Failed to save profile.")
  });

  const [suggestedPivots, setSuggestedPivots] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('scholarship_suggested_pivots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('scholarship_suggested_pivots', JSON.stringify(suggestedPivots));
  }, [suggestedPivots]);

  const suggestPivotsMutation = useMutation({
    mutationFn: async () => {
      if (!formData.major) throw new Error("Major is required");
      const res = await fetch(`http://localhost:8000/profile/suggest-pivots?major=${encodeURIComponent(formData.major)}&career_goals=${encodeURIComponent(formData.career_goals)}`);
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      return res.json();
    },
    onSuccess: (data) => {
      setSuggestedPivots(data.suggestions || []);
      toast.success("AI generated pivot suggestions!");
    },
    onError: () => toast.error("Failed to generate suggestions. Ensure local AI is running.")
  });

  // Helper document lookup
  const docMap = profile?.documents?.reduce((acc: any, doc: any) => {
    acc[doc.doc_type] = doc;
    return acc;
  }, {}) || {};

  // Dynamic Completeness Score calculation
  const calculateCompleteness = () => {
    let score = 0;
    
    // Core (20 points)
    if (formData.name && formData.name !== "Default User") score += 5;
    if (formData.major && formData.major.trim() !== "") score += 5;
    if (formData.target_areas && formData.target_areas.trim() !== "") score += 5;
    if (formData.degree_level && formData.degree_level.trim() !== "") score += 5;
    if (formData.demographics && formData.demographics.trim() !== "") score += 5;
    
    // Experience (3 fields, 10% each = 30%)
    if (formData.experience && formData.experience.trim() !== "") score += 10;
    if (formData.career_goals && formData.career_goals.trim() !== "") score += 10;
    if (formData.financial_need && formData.financial_need.trim() !== "") score += 10;
    
    // Highlights (6 fields, 5% each = 30%)
    if (formData.volunteer_work && formData.volunteer_work.trim() !== "") score += 5;
    if (formData.hobbies && formData.hobbies.trim() !== "") score += 5;
    if (formData.projects && formData.projects.trim() !== "") score += 5;
    if (formData.awards && formData.awards.trim() !== "") score += 5;
    if (formData.languages && formData.languages.trim() !== "") score += 5;
    if (formData.publications && formData.publications.trim() !== "") score += 5;
    
    // Documents (2 key docs, 10% each = 20%)
    if (docMap['cv']?.is_uploaded) score += 10;
    if (docMap['bachelor_diploma']?.is_uploaded) score += 10;
    
    // Preferences (Modality and Target Countries)
    const hasModality = !!formData.preferred_modality;
    const hasTargets = !!(formData.target_countries && formData.target_countries !== "[]" && formData.target_countries !== "");
    
    if (hasModality) score += 10;
    if (hasTargets) score += 10;
    
    score = Math.min(score, 100);
    
    // Cap score at 60% if critical matching preferences are missing
    if (!hasModality || !hasTargets) {
      score = Math.min(score, 60);
    }
    
    return score;
  };

  const score = calculateCompleteness();

  const handleFileUpload = async (docType: string, e: React.ChangeEvent<HTMLInputElement>, isOverview = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['pdf', 'txt', 'docx'].includes(fileExt)) {
      toast.error("Invalid file format. Please upload PDF, TXT or DOCX");
      return;
    }

    if (isOverview) {
      setOverviewProcessing(docType);
    } else {
      setUploadingDoc(docType);
    }

    const toastId = toast.loading(`Uploading ${file.name}...`);
    try {
      await api.uploadDocument(docType, file);
      
      // If uploading CV from Overview, run AI autofill immediately in 1 click
      if (isOverview && docType === 'cv') {
        setIsAutofilling(true);
        toast.loading("Analyzing resume text with Scout AI & auto-filling profile...", { id: toastId });
        await api.parseDocument('cv');
        toast.success("Resume uploaded and profile successfully auto-filled!", { id: toastId });
      } else {
        toast.success(`${docType.replace(/_/g, ' ').toUpperCase()} uploaded successfully!`, { id: toastId });
        if (docType === 'cv') {
          toast.info("CV uploaded! Click 'AI Autofill Profile' next to your CV to extract your details.", { duration: 7000 });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err) {
      toast.error(`Process failed: ${err instanceof Error ? err.message : String(err)}`, { id: toastId });
    } finally {
      setUploadingDoc(null);
      setOverviewProcessing(null);
      setIsAutofilling(false);
    }
  };

  const handleParseDocument = async (docType: string) => {
    setParsingDoc(docType);
    setIsAutofilling(true);
    const toastId = toast.loading("Scout AI is parsing document text and auto-filling profile...");
    try {
      await api.parseDocument(docType);
      toast.success("Profile auto-filled successfully!", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err) {
      toast.error(`Failed to parse: ${err instanceof Error ? err.message : String(err)}`, { id: toastId });
    } finally {
      setParsingDoc(null);
      setIsAutofilling(false);
    }
  };

  const triggerFileSelect = (docType: string, isOverview = false) => {
    if (isOverview) {
      overviewInputRefs.current[docType]?.click();
    } else {
      fileInputRefs.current[docType]?.click();
    }
  };

  // Stepper completion checks
  const isStepComplete = (step: 'academic' | 'experience' | 'highlights' | 'documents') => {
    switch (step) {
      case 'academic':
        return !!(formData.name && formData.name !== "Default User" && formData.major && formData.gpa);
      case 'experience':
        return !!(formData.experience && formData.career_goals);
      case 'highlights':
        return !!(formData.volunteer_work && formData.projects);
      case 'documents':
        return !!(docMap['cv']?.is_uploaded && docMap['bachelor_diploma']?.is_uploaded);
      case 'preferences':
        return !!(formData.preferred_modality && formData.primary_goal);
      default:
        return false;
    }
  };

  const handleDemographicClick = (trait: string) => {
    const traits = formData.demographics
      ? formData.demographics.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];
    
    if (traits.includes(trait)) {
      const filtered = traits.filter(t => t !== trait);
      setFormData({ ...formData, demographics: filtered.join(", ") });
    } else {
      setFormData({ ...formData, demographics: [...traits, trait].join(", ") });
    }
  };

  const tabs = [
    { id: 'overview', label: 'Profile Overview', icon: Compass },
    { id: 'academic', label: 'Academic Core', icon: GraduationCap },
    { id: 'experience', label: 'Experience & Goals', icon: Briefcase },
    { id: 'highlights', label: 'Highlights & Projects', icon: Award },
    { id: 'preferences', label: 'Preferences & Goals', icon: Globe },
    { id: 'documents', label: 'Documents Checklist', icon: FileText, badge: profile?.documents?.length },
  ];

  const DOCUMENT_SLOTS = [
    { id: 'linkedin_pdf', label: 'LinkedIn PDF Export', description: 'Export your profile as PDF from LinkedIn. Highly structured, excellent for extracting professional experience and skills.' },
    { id: 'cv', label: 'CV or Formal Resume', description: 'Formal resume for sending out applications. Can also be parsed by AI.' },
    { id: 'recommendation_letter_1', label: 'Recommendation Letter 1', description: 'Academic recommendation from professor or project advisor.' },
    { id: 'recommendation_letter_2', label: 'Recommendation Letter 2', description: 'Academic or professional recommendation.' },
    { id: 'recommendation_letter_3', label: 'Recommendation Letter 3', description: 'Optional third recommendation letter.' },
    { id: 'bachelor_diploma', label: 'Bachelor\'s Diploma / Transcript', description: 'Proof of degree/transcript for qualification checks. Note: Native language diplomas may require official translation for foreign institutions.' },
    { id: 'semester_transcripts', label: 'Semester Transcripts / List of Marks', description: 'Upload cycle or semester marks. Note: Even if you provide a diploma now, an official list of marks/transcript WILL be required later in the application process for most universities.' },
    { id: 'language_certifications', label: 'Language Certifications', description: 'Upload TOEFL, IELTS, DELE, or other language proficiency certificates.' },
  ];

  if (isProfileLoading) {
    return (
      <div className="space-y-8 animate-fade-in pb-12">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-10 w-40 rounded-xl" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Navigation Sidebar Skeleton */}
          <aside className="lg:col-span-1 space-y-2">
            <div className="flex lg:flex-col gap-2 bg-card/50 p-2 rounded-2xl border border-border/40">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent">
                  <Skeleton className="w-4 h-4 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </aside>

          {/* Form Content Panel Skeleton */}
          <main className="lg:col-span-3 bg-card p-6 sm:p-8 rounded-3xl border border-border/50 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl bg-muted/10 border border-border/60 gap-6">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-7 w-64" />
                <Skeleton className="h-3 w-80 max-w-full" />
              </div>
              <Skeleton className="w-24 h-24 rounded-full" />
            </div>

            <div className="space-y-4">
              <Skeleton className="h-4 w-28" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-dashed border-border/80 space-y-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
                <div className="p-6 rounded-2xl border border-dashed border-border/80 space-y-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Calculate score rating text and styling
  const getRating = (s: number) => {
    const isPrefComplete = formData.preferred_modality && formData.target_countries && formData.target_countries !== "[]" && formData.target_countries !== "";
    if (!isPrefComplete) {
      return { label: 'Awaiting Preferences', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    }
    if (s < 50) return { label: 'Initiated', color: 'text-destructive', bg: 'bg-destructive/10' };
    if (s < 80) return { label: 'Pathfinder Active', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { label: 'Pathfinder Ready!', color: 'text-primary-foreground bg-primary', bg: 'bg-primary' };
  };
  const rating = getRating(score);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <header className="sticky top-[72px] z-30 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-background/40 backdrop-blur-md py-4 mb-8 border-b border-border/30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 transition-all duration-200">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-foreground">Profile Manager</h1>
          <p className="text-muted-foreground mt-1">Provide comprehensive profile details and preferences to maximize academic matching and career migration paths.</p>
        </div>
        
        {docMap['cv']?.is_uploaded && (
          <button
            onClick={() => handleParseDocument('cv')}
            disabled={parsingDoc !== null || isAutofilling}
            className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground px-5 py-2.5 rounded-xl font-semibold border border-border/80 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {parsingDoc === 'cv' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Extracting with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span>AI Autofill from CV</span>
              </>
            )}
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1 space-y-2 lg:sticky lg:top-[220px]">
          <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 bg-card/50 p-2 rounded-2xl border border-border/40 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all whitespace-nowrap lg:w-full select-none
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Form Content Panel */}
        <main className="relative lg:col-span-4 bg-card p-6 sm:p-8 rounded-3xl border border-border/50 shadow-sm transition-all hover:shadow-md -mr-4 sm:-mr-6 lg:-mr-8">
          
          {isAutofilling && ['academic', 'experience', 'highlights'].includes(activeTab) && (
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[1.5px] rounded-3xl z-50 flex flex-col items-center p-6 text-center animate-fade-in">
              <div className="sticky top-[50vh] -translate-y-1/2 bg-card/90 border border-border/80 p-8 rounded-2xl shadow-xl max-w-md space-y-4 flex flex-col items-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center border border-primary/30 relative z-10 animate-bounce">
                    <Sparkles className="w-8 h-8 text-primary-foreground animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <span>Scout AI Autofilling</span>
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Scout AI is analyzing your CV to extract and structure your profile details. 
                  Form fields are temporarily locked during this process.
                </p>
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing document text...</span>
                </div>
              </div>
            </div>
          )}
          
          {/* TAB 0: OVERVIEW LANDING SECTION */}
          {activeTab === 'overview' && (
            <div className="space-y-10 animate-tab-content">
              
              {/* Profile Health Score */}
              <section className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl bg-muted/10 border border-border/60 gap-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" /> Profile Setup Health
                  </span>
                  <h2 className="text-2xl font-bold text-foreground">Pathfinder Preparedness</h2>
                  <p className="text-xs text-muted-foreground max-w-md">Complete your profile and preferences to unlock the Discovery Engine matches and calculate your Relocation Feasibility score.</p>
                </div>
                
                <div className="flex flex-col items-center justify-center text-center p-4 min-w-[150px]">
                  <div className="relative flex items-center justify-center">
                    {/* Dynamic Circle Progress */}
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" className="text-border" fill="transparent" />
                      <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" className="text-primary transition-all duration-500 ease-out" 
                        fill="transparent"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * score) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-2xl font-extrabold text-foreground">{score}%</span>
                  </div>
                  <span className={`mt-3 px-3 py-1 rounded-full text-[10px] font-extrabold border ${rating.color === 'text-primary-foreground bg-primary' ? 'bg-primary text-primary-foreground' : `${rating.color} ${rating.bg} border-current`}`}>
                    {rating.label}
                  </span>
                </div>
              </section>

              {/* Progress Stepper with click nodes */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Setup Progress</h3>
                
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-6 md:gap-0 pt-4 px-2">
                  
                  {/* Background Line (Desktop Only) */}
                  <div className="absolute top-[28px] left-[5%] right-[5%] h-1 bg-border/60 z-0 hidden md:block" />
                  
                  {/* Step 1: Academic */}
                  <button 
                    onClick={() => setActiveTab('academic')} 
                    className="flex md:flex-col items-center gap-4 md:gap-2 text-left md:text-center z-10 group cursor-pointer focus:outline-none"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border shadow-sm select-none
                      ${isStepComplete('academic')
                        ? 'bg-primary border-primary text-primary-foreground scale-105'
                        : 'bg-background border-border text-muted-foreground group-hover:border-primary/50'
                      }`}
                    >
                      {isStepComplete('academic') ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">1</span>}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Academic Core</h4>
                      <p className="text-[10px] text-muted-foreground">GPA, Major & Name</p>
                    </div>
                  </button>

                  {/* Step 2: Experience */}
                  <button 
                    onClick={() => setActiveTab('experience')} 
                    className="flex md:flex-col items-center gap-4 md:gap-2 text-left md:text-center z-10 group cursor-pointer focus:outline-none"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border shadow-sm select-none
                      ${isStepComplete('experience')
                        ? 'bg-primary border-primary text-primary-foreground scale-105'
                        : 'bg-background border-border text-muted-foreground group-hover:border-primary/50'
                      }`}
                    >
                      {isStepComplete('experience') ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">2</span>}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Aspirations</h4>
                      <p className="text-[10px] text-muted-foreground">Experience & Goals</p>
                    </div>
                  </button>

                  {/* Step 3: Highlights */}
                  <button 
                    onClick={() => setActiveTab('highlights')} 
                    className="flex md:flex-col items-center gap-4 md:gap-2 text-left md:text-center z-10 group cursor-pointer focus:outline-none"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border shadow-sm select-none
                      ${isStepComplete('highlights')
                        ? 'bg-primary border-primary text-primary-foreground scale-105'
                        : 'bg-background border-border text-muted-foreground group-hover:border-primary/50'
                      }`}
                    >
                      {isStepComplete('highlights') ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">3</span>}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Highlights</h4>
                      <p className="text-[10px] text-muted-foreground">Projects & Activities</p>
                    </div>
                  </button>

                  {/* Step 4: Preferences */}
                  <button 
                    onClick={() => setActiveTab('preferences')} 
                    className="flex md:flex-col items-center gap-4 md:gap-2 text-left md:text-center z-10 group cursor-pointer focus:outline-none hidden lg:flex"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border shadow-sm select-none
                      ${isStepComplete('preferences')
                        ? 'bg-primary border-primary text-primary-foreground scale-105'
                        : 'bg-background border-border text-muted-foreground group-hover:border-primary/50'
                      }`}
                    >
                      {isStepComplete('preferences') ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">4</span>}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Preferences</h4>
                      <p className="text-[10px] text-muted-foreground">Location & Modality</p>
                    </div>
                  </button>

                  {/* Step 5: Documents */}
                  <button 
                    onClick={() => setActiveTab('documents')} 
                    className="flex md:flex-col items-center gap-4 md:gap-2 text-left md:text-center z-10 group cursor-pointer focus:outline-none"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border shadow-sm select-none
                      ${isStepComplete('documents')
                        ? 'bg-primary border-primary text-primary-foreground scale-105'
                        : 'bg-background border-border text-muted-foreground group-hover:border-primary/50'
                      }`}
                    >
                      {isStepComplete('documents') ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">5</span>}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Documents</h4>
                      <p className="text-[10px] text-muted-foreground">Resume/LinkedIn & Diploma</p>
                    </div>
                  </button>

                </div>
              </section>

              {/* Call-to-Action Quick Upload Section */}
              <section className="space-y-4 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">🚀 AI Quick Start Autofill</h3>
                  <span className="text-[11px] text-primary font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-primary animate-pulse" /> Saves ~20 mins of typing
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Quick CV Card */}
                  <div className={`p-6 rounded-2xl border transition-all flex flex-col justify-between h-56
                    ${docMap['cv']?.is_uploaded
                      ? 'bg-card border-border/60 hover:border-primary/30' 
                      : 'bg-muted/10 border-dashed border-border/80 hover:bg-muted/20'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Upload Resume or LinkedIn PDF</span>
                        {docMap['cv']?.is_uploaded && (
                          <span className="flex items-center gap-1 text-[10px] text-primary font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-foreground">CV, Resume, or LinkedIn PDF</h4>
                      <p className="text-xs text-muted-foreground">Uploading parses your entire educational history, skills, work experience, and honors automatically using Scout AI.</p>
                      {docMap['cv']?.is_uploaded && (
                        <div className="text-[10px] font-mono text-muted-foreground border border-border/60 rounded px-2 py-0.5 inline-block bg-background">
                          {docMap['cv'].filename}
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-4 flex items-center gap-2">
                      <input 
                        type="file"
                        ref={el => overviewInputRefs.current['cv'] = el}
                        onChange={(e) => handleFileUpload('cv', e, true)}
                        className="hidden"
                        accept=".pdf,.txt,.docx"
                      />
                      <button
                        onClick={() => triggerFileSelect('cv', true)}
                        disabled={overviewProcessing !== null}
                        className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border w-full transition-all active:scale-[0.98] disabled:opacity-50
                          ${docMap['cv']?.is_uploaded
                            ? 'bg-background hover:bg-muted text-foreground border-border'
                            : 'bg-primary hover:bg-primary/95 text-primary-foreground border-primary shadow-sm'
                          }`}
                      >
                        {overviewProcessing === 'cv' ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{docMap['cv']?.is_uploaded ? 'Re-upload & Parse' : 'Upload & Auto-fill'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quick Diploma Card */}
                  <div className={`p-6 rounded-2xl border transition-all flex flex-col justify-between h-56
                    ${docMap['bachelor_diploma']?.is_uploaded
                      ? 'bg-card border-border/60 hover:border-primary/30' 
                      : 'bg-muted/10 border-dashed border-border/80 hover:bg-muted/20'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Academic Proof</span>
                        {docMap['bachelor_diploma']?.is_uploaded && (
                          <span className="flex items-center gap-1 text-[10px] text-primary font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-foreground">Bachelor's Diploma</h4>
                      <p className="text-xs text-muted-foreground">Upload your academic transcript or bachelor's diploma to complete required file verification checks.</p>
                      {docMap['bachelor_diploma']?.is_uploaded && (
                        <div className="text-[10px] font-mono text-muted-foreground border border-border/60 rounded px-2 py-0.5 inline-block bg-background">
                          {docMap['bachelor_diploma'].filename}
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-4 flex items-center gap-2">
                      <input 
                        type="file"
                        ref={el => overviewInputRefs.current['bachelor_diploma'] = el}
                        onChange={(e) => handleFileUpload('bachelor_diploma', e, true)}
                        className="hidden"
                        accept=".pdf,.txt,.docx"
                      />
                      <button
                        onClick={() => triggerFileSelect('bachelor_diploma', true)}
                        disabled={overviewProcessing !== null}
                        className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border w-full transition-all active:scale-[0.98] disabled:opacity-50
                          ${docMap['bachelor_diploma']?.is_uploaded
                            ? 'bg-background hover:bg-muted text-foreground border-border'
                            : 'bg-primary hover:bg-primary/95 text-primary-foreground border-primary shadow-sm'
                          }`}
                      >
                        {overviewProcessing === 'bachelor_diploma' ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>{docMap['bachelor_diploma']?.is_uploaded ? 'Replace Diploma' : 'Upload Diploma'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              </section>

              {/* Bottom Quick-Link CTA */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setActiveTab('academic')}
                  className="flex items-center gap-2 text-xs font-bold text-primary hover:underline hover:translate-x-0.5 transition-all select-none"
                >
                  <span>Start Manual Setup</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

          {/* TAB 1: ACADEMIC & CORE */}
          {activeTab === 'academic' && (
            <div className="space-y-6 animate-tab-content">
              <div className="border-b border-border/50 pb-4">
                <h2 className="text-xl font-bold text-card-foreground">Academic Core & Profile Details</h2>
                <p className="text-xs text-muted-foreground mt-1">Fundamental information used for matching and application headers.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Full Name</label>
                  <Input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    isDisabled={isAutofilling}
                    placeholder="e.g. Jane Doe" 
                    classNames={{ inputWrapper: "bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary shadow-sm", input: "text-sm text-foreground" }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Current Background (Major)</label>
                  <div className="flex gap-2">
                    <div className="w-1/3">
                      <Select 
                        value={formData.degree_level || ""} 
                        onValueChange={v => setFormData({...formData, degree_level: v})}
                        disabled={isAutofilling}
                      >
                        <SelectTrigger className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm hover:bg-muted/40 h-[42px]">
                          <SelectValue placeholder="Degree" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border border-border/85 rounded-xl">
                          <SelectItem value="Bachelors">Bachelors</SelectItem>
                          <SelectItem value="Masters">Masters</SelectItem>
                          <SelectItem value="PhD">PhD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-2/3">
                      <Select 
                        value={formData.major || ""} 
                        onValueChange={v => setFormData({...formData, major: v})}
                        disabled={isAutofilling}
                      >
                        <SelectTrigger className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm hover:bg-muted/40 h-[42px]">
                          <SelectValue placeholder="Select your Major..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card border border-border/85 rounded-xl max-h-[300px]">
                          {Object.entries(CATEGORIZED_MAJORS).map(([category, majors]) => (
                            <SelectGroup key={category}>
                              <SelectLabel className="text-xs font-bold opacity-70 bg-secondary/30 px-2 py-1 rounded mb-1 mt-2">{category}</SelectLabel>
                              {majors.map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">This is what you have already studied. The AI will use this to determine eligibility for Masters/PhDs.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Target Degree Level</label>
                  <Select 
                    value={formData.target_degree_level || "Masters"} 
                    onValueChange={v => setFormData({...formData, target_degree_level: v})}
                    disabled={isAutofilling}
                  >
                    <SelectTrigger className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm hover:bg-muted/40 h-[42px]">
                      <SelectValue placeholder="Target Degree" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border border-border/85 rounded-xl">
                      <SelectItem value="Bachelors">Bachelors</SelectItem>
                      <SelectItem value="Masters">Masters</SelectItem>
                      <SelectItem value="PGDip">Postgrad Diploma (PGDip)</SelectItem>
                      <SelectItem value="PhD">PhD / Doctorate</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">Select the level of study you want the scan to search for.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Target Study Type</label>
                  <Select 
                    value={formData.target_study_type || "Taught"} 
                    onValueChange={v => setFormData({...formData, target_study_type: v})}
                    disabled={isAutofilling}
                  >
                    <SelectTrigger className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm hover:bg-muted/40 h-[42px]">
                      <SelectValue placeholder="Study Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border border-border/85 rounded-xl">
                      <SelectItem value="Taught">Taught (Coursework / Projects)</SelectItem>
                      <SelectItem value="Research">Research (Thesis / MPhil / PhD)</SelectItem>
                      <SelectItem value="Any">Any Study Type</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">Specify if you want coursework-only taught programs or research tracks.</p>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-foreground">Target Disciplines</label>
                    <button
                      type="button"
                      onClick={() => suggestPivotsMutation.mutate()}
                      disabled={!formData.major || suggestPivotsMutation.isPending}
                      className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {suggestPivotsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {suggestPivotsMutation.isPending ? "Generating..." : (suggestedPivots.length > 0 ? "Generate More" : "AI Suggest Pivots")}
                    </button>
                  </div>
                  
                  <div className="p-4 bg-secondary/30 border border-border/50 rounded-xl min-h-[100px] flex flex-col gap-5">
                    {/* Active Areas */}
                    {formData.target_areas && (
                      <div>
                        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5 opacity-90"><CheckCircle2 className="w-3 h-3 text-primary" /> Active Targets</h4>
                        <div className="flex flex-wrap gap-2">
                          {formData.target_areas.split(',').map(s => s.trim()).filter(Boolean).map((area, idx) => (
                            <button
                              key={`active-${idx}`}
                              type="button"
                              onClick={() => {
                                let areas = formData.target_areas.split(',').map(s => s.trim()).filter(Boolean);
                                areas = areas.filter(a => a.toLowerCase() !== area.toLowerCase());
                                setFormData({...formData, target_areas: areas.join(', ')});
                              }}
                              className="chip text-[11px] py-1.5 px-3 rounded-lg border transition-all active:scale-[0.98] bg-primary/20 border-primary/50 text-primary font-medium flex items-center gap-1"
                            >
                              {area} <span className="opacity-60 hover:opacity-100">&times;</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Suggested Areas (Unselected) */}
                    {suggestedPivots.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5 opacity-80"><Sparkles className="w-3 h-3" /> Brainstorm Pool</h4>
                        <div className="flex flex-wrap gap-2">
                          {suggestedPivots
                            .filter(pivot => !(formData.target_areas || "").toLowerCase().includes(pivot.toLowerCase()))
                            .map((pivot, idx) => (
                            <button
                              key={`suggested-${idx}`}
                              type="button"
                              onClick={() => {
                                let areas = formData.target_areas ? formData.target_areas.split(',').map(s => s.trim()).filter(Boolean) : [];
                                areas.push(pivot);
                                setFormData({...formData, target_areas: areas.join(', ')});
                              }}
                              className="chip text-[11px] py-1.5 px-3 rounded-lg border transition-all active:scale-[0.98] bg-background hover:bg-secondary border-border text-muted-foreground hover:text-foreground shadow-sm"
                            >
                              + {pivot}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {!formData.target_areas && suggestedPivots.length === 0 && !suggestPivotsMutation.isPending && (
                       <p className="text-xs text-muted-foreground text-center italic m-auto opacity-70">
                         Click "AI Suggest Pivots" to brainstorm degree ideas based on your major.
                       </p>
                    )}
                    {suggestPivotsMutation.isPending && (
                       <p className="text-xs text-muted-foreground text-center italic m-auto opacity-70 flex items-center gap-2">
                         <Loader2 className="w-3 h-3 animate-spin" /> Brainstorming career pivots...
                       </p>
                    )}
                  </div>
                  
                  <p className="text-[10px] text-muted-foreground mt-2">These are the actual fields you want to study next. The AI Scout will prioritize finding programs that match your selected chips.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Cumulative GPA / Class Rank</label>
                  <Input 
                    value={formData.gpa}
                    onChange={e => setFormData({...formData, gpa: e.target.value})}
                    isDisabled={isAutofilling}
                    placeholder="e.g. 3.82 or Top 5%" 
                    classNames={{ inputWrapper: "bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary shadow-sm", input: "text-sm text-foreground" }}
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["Top 5%", "Top 10%", "Top 20%", "1st Class Honours", "Summa Cum Laude"].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        disabled={isAutofilling}
                        onClick={() => setFormData({ ...formData, gpa: suggestion })}
                        className="chip bg-secondary/80 hover:bg-muted text-muted-foreground hover:text-foreground text-[10px] py-1 px-2.5 rounded-lg border border-border transition-all active:scale-[0.98]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">If your country uses a different grading system, select or type your relative class rank or academic honors.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Demographics & Background</label>
                  <Input 
                    value={formData.demographics}
                    onChange={e => setFormData({...formData, demographics: e.target.value})}
                    isDisabled={isAutofilling}
                    placeholder="e.g. First-generation, Woman in Tech, Hispanic" 
                    classNames={{ inputWrapper: "bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary shadow-sm", input: "text-sm text-foreground" }}
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["First-Gen", "Woman in STEM", "Minority Background", "LGBTQ+", "Low-Income", "Bilingual", "Rural Area", "Disabled", "First-Generation College", "Neurodivergent"].map((trait) => {
                      const isActive = formData.demographics
                        ?.split(",")
                        .map((t: string) => t.trim())
                        .includes(trait);
                      return (
                        <button
                          key={trait}
                          type="button"
                          disabled={isAutofilling}
                          onClick={() => handleDemographicClick(trait)}
                          className={`chip text-[10px] py-1 px-2.5 rounded-lg border transition-all active:scale-[0.98] ${
                            isActive
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary/80 hover:bg-muted text-muted-foreground hover:text-foreground border-border"
                          }`}
                        >
                          {trait}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Select demographic chips or type custom traits separated by commas.</p>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-semibold text-foreground mb-2">Nationalities / Citizenships</label>
                  <Input 
                    value={formData.nationalities}
                    onChange={e => setFormData({...formData, nationalities: e.target.value})}
                    isDisabled={isAutofilling}
                    placeholder="e.g. Colombian, Italian" 
                    classNames={{ inputWrapper: "bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary shadow-sm", input: "text-sm text-foreground" }}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Comma-separated list of your official citizenships. Crucial for matching regional or bilateral scholarships.</p>
                </div>

                <div className="col-span-1 md:col-span-2 mt-2">
                  <label className="flex items-start space-x-3 p-4 bg-secondary/30 hover:bg-secondary/50 transition-colors rounded-xl border border-border cursor-pointer group">
                    <div className="flex items-center h-full pt-0.5">
                      <input 
                        type="checkbox" 
                        checked={formData.has_dependents}
                        onChange={e => setFormData({...formData, has_dependents: e.target.checked})}
                        disabled={isAutofilling}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary focus:ring-2 disabled:opacity-50 cursor-pointer accent-primary transition-all"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">I have a family or dependents</span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        We will prioritize programs offering family housing, childcare subsidies, and family-friendly financial aid.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXPERIENCE & GOALS */}
          {activeTab === 'experience' && (
            <div className="space-y-6 animate-tab-content">
              <div className="border-b border-border/50 pb-4">
                <h2 className="text-xl font-bold text-card-foreground">Experience & Aspirations</h2>
                <p className="text-xs text-muted-foreground mt-1">Professional background and goals crucial for writing compelling personal statements.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span>Work & Research Experience</span>
                    </label>
                    <button 
                      type="button" 
                      onClick={() => {
                         try {
                           let arr = formData.experience ? JSON.parse(formData.experience) : [];
                           if (!Array.isArray(arr)) arr = [];
                           setFormData({...formData, experience: JSON.stringify([...arr, { company: '', role: '', startMonth: '', startYear: '', endMonth: '', endYear: '', isCurrentRole: false, employmentType: 'Full-time', location: '', multinational_roots: '', description: '' }])});
                         } catch(e) {
                           setFormData({...formData, experience: JSON.stringify([{ company: 'Previous Experience', role: '', startMonth: '', startYear: '', endMonth: '', endYear: '', isCurrentRole: false, employmentType: 'Full-time', location: '', multinational_roots: '', description: formData.experience||'' }, { company: '', role: '', startMonth: '', startYear: '', endMonth: '', endYear: '', isCurrentRole: false, employmentType: 'Full-time', location: '', multinational_roots: '', description: '' }])});
                         }
                      }}
                      disabled={isAutofilling}
                      className="text-[10px] bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded-lg border border-border/80 transition-colors font-semibold shadow-sm active:scale-95"
                    >
                      + Add Experience
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {(() => {
                       let arr: any[] = [];
                       try {
                         if (formData.experience) {
                           const p = JSON.parse(formData.experience);
                           arr = Array.isArray(p) ? p : [];
                         }
                       } catch (e) {
                         if (formData.experience) {
                           arr = [{ company: 'Legacy Entry', role: '', startMonth: '', startYear: '', endMonth: '', endYear: '', isCurrentRole: false, employmentType: 'Full-time', location: '', multinational_roots: '', description: formData.experience }];
                         }
                       }
                       if (arr.length === 0) {
                         return <div className="p-4 border border-dashed border-border rounded-xl bg-muted/10 flex items-center justify-center"><p className="text-xs text-muted-foreground italic">No experience added yet. Click above to add.</p></div>;
                       }

                        return (
<Accordion variant="splitted" selectionMode="multiple">
                           {arr.map((item, idx) => (
                             <AccordionItem
                               key={idx}
                               aria-label={item.company || `Experience ${idx + 1}`}
                               title={item.company || `New Experience`}
                               subtitle={item.role || "Role not specified"}
                             >
                               <div className="flex flex-col gap-4 pb-4">
                                 <div className="flex justify-end">
                                   <button 
                                     type="button"
                                     onClick={() => {
                                       const newArr = [...arr];
                                       newArr.splice(idx, 1);
                                       setFormData({...formData, experience: JSON.stringify(newArr)});
                                     }}
                                     disabled={isAutofilling}
                                     className="flex items-center justify-center w-6 h-6 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 transition-colors"
                                     title="Remove experience"
                                   >
                                     <span className="text-sm leading-none font-medium mb-0.5">&times;</span>
                                   </button>
                                 </div>

                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                   <Input 
                                     label="Company / Organization" labelPlacement="outside"
                                     variant="bordered"
                                     value={item.company || ''} 
                                     onChange={(e) => {
                                       const newArr = [...arr];
                                       newArr[idx] = { ...newArr[idx], company: e.target.value };
                                       setFormData({...formData, experience: JSON.stringify(newArr)});
                                     }}
                                     isDisabled={isAutofilling}
                                     placeholder="e.g. Paysafe"
                                   />
                                   <Input 
                                     label="Role / Title" labelPlacement="outside"
                                     variant="bordered"
                                     value={item.role || ''} 
                                     onChange={(e) => {
                                       const newArr = [...arr];
                                       newArr[idx] = { ...newArr[idx], role: e.target.value };
                                       setFormData({...formData, experience: JSON.stringify(newArr)});
                                     }}
                                     isDisabled={isAutofilling}
                                     placeholder="e.g. IT Ops System Engineer"
                                   />
                                 </div>

                                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                   <div className="flex flex-col gap-2">
                                     <label className="text-small text-foreground-500">Employment Type</label>
                                     <Select 
                                       value={item.employmentType || 'Full-time'} 
                                       onValueChange={(val) => {
                                         const newArr = [...arr];
                                         newArr[idx] = { ...newArr[idx], employmentType: val };
                                         setFormData({...formData, experience: JSON.stringify(newArr)});
                                       }}
                                       disabled={isAutofilling}
                                     >
                                       <SelectTrigger className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm hover:bg-muted/40 h-[42px]">
                                         <SelectValue placeholder="Type" />
                                       </SelectTrigger>
                                       <SelectContent className="bg-card border border-border/85 rounded-xl">
                                         <SelectItem value="Full-time">Full-time</SelectItem>
                                         <SelectItem value="Part-time">Part-time</SelectItem>
                                         <SelectItem value="Freelance">Freelance</SelectItem>
                                         <SelectItem value="Internship">Internship</SelectItem>
                                       </SelectContent>
                                     </Select>
                                   </div>

                                   <div className="flex flex-col gap-2">
                                     <label className="text-small text-foreground-500">Start Date</label>
                                     <div className="flex gap-2">
                                       <Select 
                                         value={item.startMonth ? String(item.startMonth).padStart(2, '0') : undefined} 
                                         onValueChange={(val) => {
                                           const newArr = [...arr];
                                           newArr[idx] = { ...newArr[idx], startMonth: val };
                                           setFormData({...formData, experience: JSON.stringify(newArr)});
                                         }}
                                         disabled={isAutofilling}
                                       >
                                         <SelectTrigger className="w-full bg-background border border-border/50 rounded-xl px-3 py-3 text-sm hover:bg-muted/40 h-[42px]">
                                           <SelectValue placeholder="Mo" />
                                         </SelectTrigger>
                                         <SelectContent className="bg-card border border-border/85 rounded-xl max-h-60">
                                           {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                         </SelectContent>
                                       </Select>
                                       <Select 
                                         value={item.startYear ? String(item.startYear) : undefined} 
                                         onValueChange={(val) => {
                                           const newArr = [...arr];
                                           newArr[idx] = { ...newArr[idx], startYear: val };
                                           setFormData({...formData, experience: JSON.stringify(newArr)});
                                         }}
                                         disabled={isAutofilling}
                                       >
                                         <SelectTrigger className="w-full bg-background border border-border/50 rounded-xl px-3 py-3 text-sm hover:bg-muted/40 h-[42px]">
                                           <SelectValue placeholder="Yr" />
                                         </SelectTrigger>
                                         <SelectContent className="bg-card border border-border/85 rounded-xl max-h-60">
                                           {Array.from({length: 40}, (_, i) => String(new Date().getFullYear() - i)).map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                         </SelectContent>
                                       </Select>
                                     </div>
                                   </div>

                                   <div className="flex flex-col gap-2">
                                     <div className="flex items-center justify-between">
                                       <label className="text-small text-foreground-500">End Date</label>
                                       <Checkbox 
                                         isSelected={item.isCurrentRole || false}
                                         onValueChange={(val) => {
                                           const newArr = [...arr];
                                           newArr[idx] = { ...newArr[idx], isCurrentRole: val };
                                           setFormData({...formData, experience: JSON.stringify(newArr)});
                                         }}
                                         isDisabled={isAutofilling}
                                         size="sm"
                                       >
                                         <span className="text-[10px] text-foreground-500">Current Role</span>
                                       </Checkbox>
                                     </div>
                                     <div className="flex gap-2">
                                       <Select 
                                         value={item.endMonth ? String(item.endMonth).padStart(2, '0') : undefined} 
                                         onValueChange={(val) => {
                                           const newArr = [...arr];
                                           newArr[idx] = { ...newArr[idx], endMonth: val };
                                           setFormData({...formData, experience: JSON.stringify(newArr)});
                                         }}
                                         disabled={isAutofilling || item.isCurrentRole}
                                       >
                                         <SelectTrigger className="w-full bg-background border border-border/50 rounded-xl px-3 py-3 text-sm hover:bg-muted/40 h-[42px]">
                                           <SelectValue placeholder="Mo" />
                                         </SelectTrigger>
                                         <SelectContent className="bg-card border border-border/85 rounded-xl max-h-60">
                                           {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                         </SelectContent>
                                       </Select>
                                       <Select 
                                         value={item.endYear ? String(item.endYear) : undefined} 
                                         onValueChange={(val) => {
                                           const newArr = [...arr];
                                           newArr[idx] = { ...newArr[idx], endYear: val };
                                           setFormData({...formData, experience: JSON.stringify(newArr)});
                                         }}
                                         disabled={isAutofilling || item.isCurrentRole}
                                       >
                                         <SelectTrigger className="w-full bg-background border border-border/50 rounded-xl px-3 py-3 text-sm hover:bg-muted/40 h-[42px]">
                                           <SelectValue placeholder="Yr" />
                                         </SelectTrigger>
                                         <SelectContent className="bg-card border border-border/85 rounded-xl max-h-60">
                                           {Array.from({length: 40}, (_, i) => String(new Date().getFullYear() - i)).map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                         </SelectContent>
                                       </Select>
                                     </div>
                                   </div>
                                   <Input 
                                     label="Location" labelPlacement="outside"
                                     variant="bordered"
                                     value={item.location || ''} 
                                     onChange={(e) => {
                                       const newArr = [...arr];
                                       newArr[idx] = { ...newArr[idx], location: e.target.value };
                                       setFormData({...formData, experience: JSON.stringify(newArr)});
                                     }}
                                     isDisabled={isAutofilling}
                                     placeholder="e.g. Lima, Peru"
                                   />
                                   <Input 
                                     label="Company Origins / Roots" labelPlacement="outside"
                                     variant="bordered"
                                     value={item.multinational_roots || ''} 
                                     onChange={(e) => {
                                       const newArr = [...arr];
                                       newArr[idx] = { ...newArr[idx], multinational_roots: e.target.value };
                                       setFormData({...formData, experience: JSON.stringify(newArr)});
                                     }}
                                     isDisabled={isAutofilling}
                                     placeholder="e.g. United Kingdom"
                                     title="The origin country or headquarters of the company. Vital for matching bilateral scholarships."
                                   />
                                 </div>

                                 <Textarea 
                                   label="Description" labelPlacement="outside"
                                   variant="bordered"
                                   value={item.description || ''} 
                                   onChange={(e) => {
                                     const newArr = [...arr];
                                     newArr[idx] = { ...newArr[idx], description: e.target.value };
                                     setFormData({...formData, experience: JSON.stringify(newArr)});
                                   }}
                                   isDisabled={isAutofilling}
                                   minRows={3}
                                   placeholder="- Monitoreo de la infraestructura TI..."
                                 />
                               </div>
                             </AccordionItem>
                           ))}
                         </Accordion>
                        );
                    })()}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span>Academic & Career Goals</span>
                  </label>
                  <Textarea 
                    value={formData.career_goals}
                    onChange={e => setFormData({...formData, career_goals: e.target.value})}
                    isDisabled={isAutofilling}
                    minRows={4}
                    placeholder="Describe your long-term research or career goals. Why are you pursuing this field of study?" 
                    classNames={{ inputWrapper: "bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary shadow-sm", input: "text-sm text-foreground" }}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>Financial Need Statement</span>
                  </label>
                  <Textarea 
                    value={formData.financial_need}
                    onChange={e => setFormData({...formData, financial_need: e.target.value})}
                    isDisabled={isAutofilling}
                    minRows={3}
                    placeholder="Provide details about your financial situation, student loans, or circumstances that highlight your need for financial assistance." 
                    classNames={{ inputWrapper: "bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary shadow-sm", input: "text-sm text-foreground" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HIGHLIGHTS & ACTIVITIES */}
          {activeTab === 'highlights' && (
            <div className="space-y-6 animate-tab-content">
              <div className="border-b border-border/50 pb-4">
                <h2 className="text-xl font-bold text-card-foreground">Personal Highlights & Activities</h2>
                <p className="text-xs text-muted-foreground mt-1">Hobbies, activities, publications, and accomplishments that showcase your well-rounded personality.</p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Volunteer Work & Community Service</label>
                    <Textarea 
                      value={formData.volunteer_work}
                      onChange={e => setFormData({...formData, volunteer_work: e.target.value})}
                      isDisabled={isAutofilling}
                      minRows={3}
                      placeholder="e.g. Volunteered at local shelter, Tutored STEM to underrepresented middle schoolers." 
                      classNames={{ inputWrapper: "bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary shadow-sm", input: "text-sm text-foreground" }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Hobbies & Interests</label>
                    <Textarea 
                      value={formData.hobbies}
                      onChange={e => setFormData({...formData, hobbies: e.target.value})}
                      isDisabled={isAutofilling}
                      minRows={3}
                      placeholder="e.g. Competitive chess, playing violin, hiking, baking sourdough bread." 
                      classNames={{ inputWrapper: "bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary shadow-sm", input: "text-sm text-foreground" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Important Projects</label>
                  <Textarea 
                    value={formData.projects}
                    onChange={e => setFormData({...formData, projects: e.target.value})}
                    isDisabled={isAutofilling}
                    minRows={3}
                    placeholder="Describe relevant projects. E.g. Capstone design project, open-source contributions, portfolio projects." 
                    classNames={{ inputWrapper: "bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary shadow-sm", input: "text-sm text-foreground" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Awards & Honors</label>
                  <Textarea 
                    value={formData.awards}
                    onChange={e => setFormData({...formData, awards: e.target.value})}
                    isDisabled={isAutofilling}
                    minRows={2}
                    placeholder="Dean's List (2024), Academic Merit Scholarship, Math Olympiad 3rd place." 
                    classNames={{ inputWrapper: "bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary shadow-sm", input: "text-sm text-foreground" }}
                  />
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span>Publications & Research Papers</span>
                    </label>
                    <Input 
                      value={formData.publications}
                      onChange={e => setFormData({...formData, publications: e.target.value})}
                      isDisabled={isAutofilling}
                      placeholder="e.g. Co-authored IEEE paper on CV algorithms." 
                      classNames={{ inputWrapper: "bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary shadow-sm", input: "text-sm text-foreground" }}
                    />
                  </div>

                  <div className="pt-6 border-t border-border/40">
                    <LanguageManager 
                      languages={formData.languages} 
                      onChange={(newLangs) => setFormData({...formData, languages: newLangs})}
                      isAutofilling={isAutofilling}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PREFERENCES & GOALS */}
          {activeTab === 'preferences' && (
            <PreferencesTab 
              formData={formData} 
              setFormData={setFormData} 
              isAutofilling={isAutofilling} 
            />
          )}

          {/* TAB 4: REQUIRED DOCUMENTS CHECKLIST */}
          {activeTab === 'documents' && (
            <div className="space-y-6 animate-tab-content">
              <div className="border-b border-border/50 pb-4">
                <h2 className="text-xl font-bold text-card-foreground">Required Documents Checklist</h2>
                <p className="text-xs text-muted-foreground mt-1">Upload files required for scholarship validation. We extract profile text dynamically from PDF and text documents.</p>
                
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    <strong>Translation Advisory:</strong> If your Bachelor's Diploma or Transcript is in your native language, it is highly recommended to obtain an official certified translation (e.g., into English) early. Most international institutions will require translated transcripts for admissions and financial aid matching.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {DOCUMENT_SLOTS.map((slot) => {
                  const doc = docMap[slot.id];
                  const isUploaded = !!doc?.is_uploaded;
                  const isUploading = uploadingDoc === slot.id;
                  const isParsing = parsingDoc === slot.id;

                  return (
                    <div 
                      key={slot.id} 
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border transition-all gap-4
                        ${isUploaded 
                          ? 'bg-card border-border/60 hover:bg-muted/10' 
                          : 'bg-muted/20 border-dashed border-border/80 hover:bg-muted/30'
                        }`}
                    >
                      {/* Left: Info */}
                      <div className="space-y-1 max-w-lg">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-foreground">{slot.label}</h3>
                          {isUploaded ? (
                            <span className="flex items-center gap-1 bg-primary/20 text-foreground px-2 py-0.5 text-[10px] font-bold rounded-full border border-primary/20">
                              <CheckCircle2 className="w-3 h-3 text-primary-foreground bg-primary rounded-full" />
                              <span>Done</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 bg-amber-500/15 text-amber-500 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold rounded-full border border-amber-500/10">
                              <AlertCircle className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{slot.description}</p>
                        {isUploaded && (
                          <div className="text-[11px] text-muted-foreground bg-background border border-border/60 rounded px-2.5 py-1 inline-block mt-2 font-mono">
                            File: {doc.filename}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <input
                          type="file"
                          ref={el => fileInputRefs.current[slot.id] = el}
                          onChange={(e) => handleFileUpload(slot.id, e)}
                          className="hidden"
                          accept=".pdf,.txt,.docx"
                        />
                        
                        <button
                          onClick={() => triggerFileSelect(slot.id)}
                          disabled={isUploading || isParsing}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all select-none
                            ${isUploaded
                              ? 'bg-background hover:bg-muted text-foreground border-border'
                              : 'bg-primary hover:bg-primary/95 text-primary-foreground border-primary shadow-sm active:scale-95'
                            }`}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>{isUploaded ? 'Replace' : 'Upload'}</span>
                            </>
                          )}
                        </button>

                        {(slot.id === 'cv' || slot.id === 'linkedin_pdf' || slot.id === 'bachelor_diploma') && isUploaded && (
                          <button
                            onClick={() => handleParseDocument(slot.id)}
                            disabled={isUploading || isParsing}
                            title={`Analyze this ${slot.id === 'cv' ? 'resume' : slot.id === 'linkedin_pdf' ? 'LinkedIn export' : 'diploma'} with Scout AI and auto-fill your profile details.`}
                            className="flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 rounded-xl text-xs font-bold border border-border/80 transition-all select-none active:scale-95 disabled:opacity-50"
                          >
                            {isParsing ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                <span>Autofilling...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                                <span>AI Extract</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Save Action Panel */}
          {activeTab !== 'documents' && activeTab !== 'overview' && (
            <>
              <div className="mt-8 border-t border-border/50" />
              <div className="sticky bottom-6 z-40 flex justify-end mt-6 pointer-events-none">
                <button 
                  onClick={() => updateMutation.mutate(formData)}
                  disabled={updateMutation.isPending || isAutofilling}
                  className="pointer-events-auto bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-bold transition-all shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 border border-primary/20"
                >
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{updateMutation.isPending ? "Saving..." : "Save Profile"}</span>
                </button>
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}
