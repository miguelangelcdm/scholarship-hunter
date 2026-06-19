import { useState } from "react";
import { Plus, X, Globe } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COMMON_LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese",
  "Mandarin Chinese", "Japanese", "Korean", "Russian", "Arabic", "Hindi",
  "Turkish", "Dutch", "Polish", "Swedish", "Norwegian", "Finnish",
  "Danish", "Hebrew", "Vietnamese", "Other"
];

const CEFR_LEVELS = [
  { value: "Native", label: "Native Speaker" },
  { value: "C2", label: "C2 (Proficient)" },
  { value: "C1", label: "C1 (Advanced)" },
  { value: "B2", label: "B2 (Upper Intermediate)" },
  { value: "B1", label: "B1 (Intermediate)" },
  { value: "A2", label: "A2 (Elementary)" },
  { value: "A1", label: "A1 (Beginner)" }
];

interface LanguageItem {
  language: string;
  is_native: boolean;
  level: string;
}

interface LanguageManagerProps {
  languages: string;
  onChange: (newValue: string) => void;
  isAutofilling?: boolean;
}

export default function LanguageManager({ languages, onChange, isAutofilling }: LanguageManagerProps) {
  const [selectedLang, setSelectedLang] = useState<string>("");
  const [customLang, setCustomLang] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");

  // Parse languages from JSON string
  let langArray: LanguageItem[] = [];
  try {
    if (languages) {
      const parsed = JSON.parse(languages);
      langArray = Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    if (languages && languages.trim() !== "") {
      langArray = [{ language: languages, is_native: true, level: "Native" }];
    }
  }

  const handleAdd = () => {
    let finalLang = selectedLang;
    if (selectedLang === "Other") {
      finalLang = customLang.trim();
    }

    if (!finalLang) {
      toast.error("Please select or enter a language.");
      return;
    }
    if (!selectedLevel) {
      toast.error("Please select a proficiency level.");
      return;
    }

    // Check duplicate
    const exists = langArray.some(
      (item) => item.language.toLowerCase() === finalLang.toLowerCase()
    );
    if (exists) {
      toast.warning(`${finalLang} is already added.`);
      return;
    }

    const newItem: LanguageItem = {
      language: finalLang,
      is_native: selectedLevel === "Native",
      level: selectedLevel
    };

    const newArray = [...langArray, newItem];
    onChange(JSON.stringify(newArray));

    // Reset fields
    setSelectedLang("");
    setCustomLang("");
    setSelectedLevel("");
    toast.success(`Added ${finalLang} / ${selectedLevel}`);
  };

  const handleRemove = (index: number) => {
    const itemToRemove = langArray[index];
    const newArray = langArray.filter((_, idx) => idx !== index);
    onChange(JSON.stringify(newArray));
    toast.info(`Removed ${itemToRemove.language}`);
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center gap-2 mb-1">
        <Globe className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Spoken & Written Languages</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end w-full">
        {/* Language select */}
        <div className={`space-y-1.5 ${selectedLang === "Other" ? "sm:col-span-4" : "sm:col-span-5"}`}>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Language</label>
          <Select 
            value={selectedLang} 
            onValueChange={(val) => {
              setSelectedLang(val);
              if (val !== "Other") setCustomLang("");
            }}
            disabled={isAutofilling}
          >
            <SelectTrigger className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm hover:bg-muted/40 h-11 transition-all">
              <SelectValue placeholder="Choose language..." />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border/85 rounded-xl max-h-60">
              {COMMON_LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom language input */}
        {selectedLang === "Other" && (
          <div className="space-y-1.5 sm:col-span-3">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Specify Language</label>
            <input
              type="text"
              value={customLang}
              onChange={(e) => setCustomLang(e.target.value)}
              placeholder="e.g. Swahili, Catalan"
              disabled={isAutofilling}
              className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary h-11 transition-all placeholder:text-muted-foreground/60 text-foreground"
            />
          </div>
        )}

        {/* Level select */}
        <div className={`space-y-1.5 ${selectedLang === "Other" ? "sm:col-span-3" : "sm:col-span-5"}`}>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Proficiency</label>
          <Select 
            value={selectedLevel} 
            onValueChange={setSelectedLevel}
            disabled={isAutofilling}
          >
            <SelectTrigger className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm hover:bg-muted/40 h-11 transition-all">
              <SelectValue placeholder="Choose proficiency..." />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border/85 rounded-xl">
              {CEFR_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Add button */}
        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAutofilling || !selectedLang || (selectedLang === "Other" && !customLang.trim()) || !selectedLevel}
            className="w-full h-11 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl text-xs transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20 border border-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Chips */}
      <div className="pt-2">
        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Added Languages</label>
        {langArray.length === 0 ? (
          <div className="p-4 border border-dashed border-border rounded-2xl bg-muted/10 flex items-center justify-center">
            <p className="text-xs text-muted-foreground italic">No languages added yet. Use the fields above to add languages.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {langArray.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-2 bg-muted/30 hover:bg-muted/50 text-foreground border border-border/60 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-[1.01]"
              >
                <span>{item.language} / {item.level}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  disabled={isAutofilling}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-1 focus:outline-none p-0.5 rounded hover:bg-destructive/10"
                  title={`Remove ${item.language}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
