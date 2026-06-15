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
  TrendingUp
} from 'lucide-react';

export default function Profile() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'experience' | 'highlights' | 'documents'>('overview');
  
  const [formData, setFormData] = useState({
    name: "Default User",
    major: "",
    gpa: "",
    demographics: "",
    hobbies: "",
    volunteer_work: "",
    projects: "",
    experience: "",
    awards: "",
    languages: "",
    publications: "",
    financial_need: "",
    career_goals: ""
  });

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [parsingDoc, setParsingDoc] = useState<string | null>(null);
  const [overviewProcessing, setOverviewProcessing] = useState<string | null>(null);
  
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
        gpa: profile.gpa || "",
        demographics: profile.demographics || "",
        hobbies: profile.hobbies || "",
        volunteer_work: profile.volunteer_work || "",
        projects: profile.projects || "",
        experience: profile.experience || "",
        awards: profile.awards || "",
        languages: profile.languages || "",
        publications: profile.publications || "",
        financial_need: profile.financial_need || "",
        career_goals: profile.career_goals || ""
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

  // Helper document lookup
  const docMap = profile?.documents?.reduce((acc: any, doc: any) => {
    acc[doc.doc_type] = doc;
    return acc;
  }, {}) || {};

  // Dynamic Completeness Score calculation
  const calculateCompleteness = () => {
    let score = 0;
    
    // Academic (4 fields, 5% each = 20%)
    if (formData.name && formData.name.trim() !== "" && formData.name !== "Default User") score += 5;
    if (formData.major && formData.major.trim() !== "") score += 5;
    if (formData.gpa && String(formData.gpa).trim() !== "") score += 5;
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
        toast.loading("Analyzing resume text with Gemini AI & auto-filling profile...", { id: toastId });
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
    }
  };

  const handleParseDocument = async (docType: string) => {
    setParsingDoc(docType);
    const toastId = toast.loading("Gemini AI is parsing document text and auto-filling profile...");
    try {
      await api.parseDocument(docType);
      toast.success("Profile auto-filled successfully!", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err) {
      toast.error(`Failed to parse: ${err instanceof Error ? err.message : String(err)}`, { id: toastId });
    } finally {
      setParsingDoc(null);
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
      default:
        return false;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Profile Overview', icon: Compass },
    { id: 'academic', label: 'Academic Core', icon: GraduationCap },
    { id: 'experience', label: 'Experience & Goals', icon: Briefcase },
    { id: 'highlights', label: 'Highlights & Projects', icon: Award },
    { id: 'documents', label: 'Documents Checklist', icon: FileText, badge: profile?.documents?.length },
  ];

  const DOCUMENT_SLOTS = [
    { id: 'cv', label: 'CV / Resume', description: 'Required for matching. Parses academic background, work experience, projects, and skills.' },
    { id: 'recommendation_letter_1', label: 'Recommendation Letter 1', description: 'Academic recommendation from professor or project advisor.' },
    { id: 'recommendation_letter_2', label: 'Recommendation Letter 2', description: 'Academic or professional recommendation.' },
    { id: 'recommendation_letter_3', label: 'Recommendation Letter 3', description: 'Optional third recommendation letter.' },
    { id: 'bachelor_diploma', label: 'Bachelor\'s Diploma / Transcript', description: 'Proof of degree/transcript for qualification checks.' },
  ];

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground font-semibold">Loading Profile...</span>
      </div>
    );
  }

  // Calculate score rating text and styling
  const getRating = (s: number) => {
    if (s < 35) return { label: 'Initiated', color: 'text-destructive', bg: 'bg-destructive/10' };
    if (s < 70) return { label: 'Intermediate', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { label: 'Scholar Ready!', color: 'text-primary-foreground bg-primary', bg: 'bg-primary' };
  };
  const rating = getRating(score);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-foreground">Profile Manager</h1>
          <p className="text-muted-foreground mt-1">Provide comprehensive profile details and documents to maximize scholarship matching and essay quality.</p>
        </div>
        
        {docMap['cv']?.is_uploaded && (
          <button
            onClick={() => handleParseDocument('cv')}
            disabled={parsingDoc !== null}
            className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground px-5 py-2.5 rounded-xl font-semibold border border-border/80 transition-all shadow-sm active:scale-95 disabled:opacity-50"
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1 space-y-2">
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
        <main className="lg:col-span-3 bg-card p-6 sm:p-8 rounded-3xl border border-border/50 shadow-sm transition-all hover:shadow-md">
          
          {/* TAB 0: OVERVIEW LANDING SECTION */}
          {activeTab === 'overview' && (
            <div className="space-y-10">
              
              {/* Profile Health Score */}
              <section className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl bg-muted/10 border border-border/60 gap-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" /> Profile Setup Health
                  </span>
                  <h2 className="text-2xl font-bold text-foreground">Scholarship Preparedness</h2>
                  <p className="text-xs text-muted-foreground max-w-md">Complete your profile to unlock premium matches and context-rich outlines for your essay drafting.</p>
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

                  {/* Step 4: Documents */}
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
                      {isStepComplete('documents') ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">4</span>}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Documents</h4>
                      <p className="text-[10px] text-muted-foreground">CV & Diploma</p>
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
                        <span className="text-xs font-bold text-muted-foreground uppercase">Upload Resume</span>
                        {docMap['cv']?.is_uploaded && (
                          <span className="flex items-center gap-1 text-[10px] text-primary font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-foreground">CV / Resume</h4>
                      <p className="text-xs text-muted-foreground">Uploading parses your entire educational history, skills, work experience, and honors automatically using Gemini.</p>
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
            <div className="space-y-6">
              <div className="border-b border-border/50 pb-4">
                <h2 className="text-xl font-bold text-card-foreground">Academic Core & Profile Details</h2>
                <p className="text-xs text-muted-foreground mt-1">Fundamental information used for matching and application headers.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" 
                    placeholder="e.g. Jane Doe" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Major / Field of Study</label>
                  <input 
                    type="text" 
                    value={formData.major}
                    onChange={e => setFormData({...formData, major: e.target.value})}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" 
                    placeholder="e.g. Computer Science" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Cumulative GPA</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.gpa}
                    onChange={e => setFormData({...formData, gpa: e.target.value})}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" 
                    placeholder="e.g. 3.82" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Demographics & Background</label>
                  <input 
                    type="text" 
                    value={formData.demographics}
                    onChange={e => setFormData({...formData, demographics: e.target.value})}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" 
                    placeholder="e.g. First-generation, Woman in Tech, Hispanic" 
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Comma-separated traits like minority background, first-gen status, state, etc.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXPERIENCE & GOALS */}
          {activeTab === 'experience' && (
            <div className="space-y-6">
              <div className="border-b border-border/50 pb-4">
                <h2 className="text-xl font-bold text-card-foreground">Experience & Aspirations</h2>
                <p className="text-xs text-muted-foreground mt-1">Professional background and goals crucial for writing compelling personal statements.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span>Work & Research Experience</span>
                  </label>
                  <textarea 
                    value={formData.experience}
                    onChange={e => setFormData({...formData, experience: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm scrollbar-hide" 
                    placeholder="Describe internships, jobs, research assistantships, or roles you have held. List company, duration, and key projects." 
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span>Academic & Career Goals</span>
                  </label>
                  <textarea 
                    value={formData.career_goals}
                    onChange={e => setFormData({...formData, career_goals: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm scrollbar-hide" 
                    placeholder="Describe your long-term research or career goals. Why are you pursuing this field of study?" 
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>Financial Need Statement</span>
                  </label>
                  <textarea 
                    value={formData.financial_need}
                    onChange={e => setFormData({...formData, financial_need: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm scrollbar-hide" 
                    placeholder="Provide details about your financial situation, student loans, or circumstances that highlight your need for financial assistance." 
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HIGHLIGHTS & ACTIVITIES */}
          {activeTab === 'highlights' && (
            <div className="space-y-6">
              <div className="border-b border-border/50 pb-4">
                <h2 className="text-xl font-bold text-card-foreground">Personal Highlights & Activities</h2>
                <p className="text-xs text-muted-foreground mt-1">Hobbies, activities, publications, and accomplishments that showcase your well-rounded personality.</p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Volunteer Work & Community Service</label>
                    <textarea 
                      value={formData.volunteer_work}
                      onChange={e => setFormData({...formData, volunteer_work: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm scrollbar-hide" 
                      placeholder="e.g. Volunteered at local shelter, Tutored STEM to underrepresented middle schoolers." 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Hobbies & Interests</label>
                    <textarea 
                      value={formData.hobbies}
                      onChange={e => setFormData({...formData, hobbies: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm scrollbar-hide" 
                      placeholder="e.g. Competitive chess, playing violin, hiking, baking sourdough bread." 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Important Projects</label>
                  <textarea 
                    value={formData.projects}
                    onChange={e => setFormData({...formData, projects: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm scrollbar-hide" 
                    placeholder="Describe relevant projects. E.g. Capstone design project, open-source contributions, portfolio projects." 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Awards & Honors</label>
                  <textarea 
                    value={formData.awards}
                    onChange={e => setFormData({...formData, awards: e.target.value})}
                    rows={2}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm scrollbar-hide" 
                    placeholder="Dean's List (2024), Academic Merit Scholarship, Math Olympiad 3rd place." 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span>Publications & Research Papers</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.publications}
                      onChange={e => setFormData({...formData, publications: e.target.value})}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" 
                      placeholder="e.g. Co-authored IEEE paper on CV algorithms." 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Languages & Test Scores</label>
                    <input 
                      type="text" 
                      value={formData.languages}
                      onChange={e => setFormData({...formData, languages: e.target.value})}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" 
                      placeholder="e.g. English (Native), Spanish (C1), IELTS 8.5" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REQUIRED DOCUMENTS CHECKLIST */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="border-b border-border/50 pb-4">
                <h2 className="text-xl font-bold text-card-foreground">Required Documents Checklist</h2>
                <p className="text-xs text-muted-foreground mt-1">Upload files required for scholarship validation. We extract profile text dynamically from PDF and text documents.</p>
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

                        {slot.id === 'cv' && isUploaded && (
                          <button
                            onClick={() => handleParseDocument('cv')}
                            disabled={isUploading || isParsing}
                            title="Analyze this resume with Gemini and auto-fill your profile details."
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
            <div className="pt-6 mt-8 flex justify-end border-t border-border/50">
              <button 
                onClick={() => updateMutation.mutate(formData)}
                disabled={updateMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-70 flex items-center gap-2"
              >
                {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{updateMutation.isPending ? "Saving..." : "Save Profile"}</span>
              </button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
