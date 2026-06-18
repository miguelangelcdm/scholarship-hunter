import { useState, useRef } from "react";
import { WorldMap, regions } from "react-svg-worldmap";
import { toast } from "sonner";
import { Globe, MapPin, X, Laptop, Building2, Plane, Plus, Trash2, Search, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIZED_TAGS: Record<string, { tags: string[]; color: string }> = {
  "Academic Disciplines": {
    tags: ["STEM", "Computer Science", "Engineering", "Medicine & Biotech", "Business & Finance", "Arts & Design", "Social Sciences", "Humanities", "Environmental Studies"],
    color: "linear-gradient(135deg, #3b82f6, #8b5cf6)"
  },
  "Funding Preferences": {
    tags: ["Full Tuition", "Living Stipend", "Travel Grants", "Research Fellowships", "Merit-based", "Need-based", "Housing Allowance"],
    color: "linear-gradient(135deg, #10b981, #059669)"
  },
  "Eligibility Categories": {
    tags: ["International Students", "Women in STEM", "Underrepresented Groups", "First-Generation", "LGBTQ+", "Bilingual / Language Specific"],
    color: "linear-gradient(135deg, #f59e0b, #d97706)"
  },
  "Interests & Tech": {
    tags: ["Artificial Intelligence", "Sustainability", "Renewable Energy", "Public Health", "Global Policy", "Entrepreneurship", "Space Exploration", "Creative Writing"],
    color: "linear-gradient(135deg, #ec4899, #f43f5e)"
  }
};

const EXPANDED_TAGS: string[] = [
  "Data Science", "Robotics", "Marine Biology", "Fine Arts", "Cybersecurity", "Blockchain", "Economics", "Law & Human Rights", "Psychology", "Sustainable Agriculture", "Creative Coding", "Architecture"
];

// Simplified continent list for brevity
const CONTINENTS: Record<string, string[]> = {
  "North America": ["United States", "Canada", "Mexico", "Cuba", "Jamaica"],
  "Europe": ["United Kingdom", "Germany", "France", "Spain", "Italy", "Netherlands", "Switzerland", "Sweden", "Norway"],
  "Asia": ["Japan", "China", "India", "South Korea", "Singapore", "Malaysia", "Indonesia", "Vietnam", "Taiwan"],
  "South America": ["Brazil", "Argentina", "Colombia", "Chile", "Peru"],
  "Oceania": ["Australia", "New Zealand", "Fiji"],
  "Africa": ["South Africa", "Egypt", "Nigeria", "Kenya", "Morocco", "Ghana"]
};

export default function PreferencesTab({ formData, setFormData, isAutofilling }: any) {
  const { theme, resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark" || theme === "dark";

  const selectedLocations = (() => {
    if (!formData.target_countries) return [];
    try {
      const parsed = JSON.parse(formData.target_countries);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const selectedTags = formData.target_tags
    ? formData.target_tags.split(",").map((t: string) => t.trim()).filter((t: string) => t.length > 0)
    : [];

  const [tempLoc, setTempLoc] = useState({ continent: '', country: '', region: '' });
  const [customTagInput, setCustomTagInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const updateLocations = (newLocs: any[]) => {
    setFormData((prev: any) => ({
      ...prev,
      target_countries: JSON.stringify(newLocs)
    }));
  };

  const updateTags = (newTags: string[]) => {
    setFormData((prev: any) => ({
      ...prev,
      target_tags: newTags.join(", ")
    }));
  };

  const mapData = regions.map(r => ({
    country: r.code.toLowerCase(),
    value: selectedLocations.some(l => l.country.toLowerCase() === r.name.toLowerCase()) ? 1 : 0
  }));

  const handleCountryStyle = (context: any) => {
    const isSelected = selectedLocations.some(l => l.country.toLowerCase() === context.countryName.toLowerCase()) || 
                       (tempLoc.country && tempLoc.country.toLowerCase() === context.countryName.toLowerCase());
    if (isSelected) return { fill: "#84cc16", stroke: "#4d7c0f", strokeWidth: 1.5, opacity: 1 };
    return { fill: isDarkMode ? "#27272a" : "#e4e4e7", stroke: isDarkMode ? "#52525b" : "#a1a1aa", strokeWidth: 1.0, opacity: 1 };
  };

  const handleCountryClick = (context: any) => {
    const countryName = context.countryName;
    setTempLoc({ continent: "Other / All", country: countryName, region: "" });
    toast.info(`Selected ${countryName}. Click 'Add Location' to save.`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* SECTION: Delivery & Objectives */}
      <section className="space-y-6">
        <div className="border-b border-border/50 pb-4">
          <h2 className="text-xl font-bold text-card-foreground">Delivery & Objectives</h2>
          <p className="text-xs text-muted-foreground mt-1">Specify how you want to study and your ultimate career goals.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-muted-foreground uppercase">Preferred Modality</label>
            <Select 
              value={formData.preferred_modality || ""} 
              onValueChange={v => setFormData({...formData, preferred_modality: v})}
              disabled={isAutofilling}
            >
              <SelectTrigger className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm hover:bg-muted/40">
                <SelectValue placeholder="How do you want to study?" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border/85 rounded-xl">
                <SelectItem value="Online"><div className="flex items-center gap-2"><Laptop className="w-4 h-4"/> Online / Remote</div></SelectItem>
                <SelectItem value="Hybrid"><div className="flex items-center gap-2"><Laptop className="w-4 h-4"/> Hybrid</div></SelectItem>
                <SelectItem value="In-Person (Local)"><div className="flex items-center gap-2"><Building2 className="w-4 h-4"/> In-Person (Local)</div></SelectItem>
                <SelectItem value="In-Person (Abroad)"><div className="flex items-center gap-2"><Plane className="w-4 h-4"/> In-Person (Abroad)</div></SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-muted-foreground uppercase">Primary Goal</label>
            <Select 
              value={formData.primary_goal || ""} 
              onValueChange={v => setFormData({...formData, primary_goal: v})}
              disabled={isAutofilling}
            >
              <SelectTrigger className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm hover:bg-muted/40">
                <SelectValue placeholder="What is the ultimate objective?" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border/85 rounded-xl">
                <SelectItem value="Local Growth">Grow in Current Career Locally</SelectItem>
                <SelectItem value="Entrepreneurship">Start a Business</SelectItem>
                <SelectItem value="Emigrate">Emigrate / Settle Abroad</SelectItem>
                <SelectItem value="Brain-Circulation">Acquire Intl. Experience & Return Home</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="block text-xs font-bold text-muted-foreground uppercase">Diaspora & Networks (Optional)</label>
            <input
              type="text"
              value={formData.target_diaspora_regions || ""}
              onChange={e => setFormData({...formData, target_diaspora_regions: e.target.value})}
              disabled={isAutofilling}
              placeholder="e.g., I have family in Germany, or culturally tied to Spain..."
              className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
          </div>
        </div>
      </section>

      {/* SECTION: Geographic Preferences */}
      <section className="space-y-6 pt-4 border-t border-border/50">
        <div className="border-b border-border/50 pb-4">
          <h2 className="text-xl font-bold text-card-foreground">Geographic Targets</h2>
          <p className="text-xs text-muted-foreground mt-1">Select the countries you are targeting for studies or relocation.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="bg-muted/5 border border-border/40 rounded-2xl p-3 overflow-hidden flex items-center justify-center min-h-[300px]">
            <WorldMap
              color="#84cc16"
              backgroundColor="transparent"
              borderColor={isDarkMode ? "#3f3f46" : "#d4d4d8"}
              size="responsive"
              data={mapData}
              onClickFunction={handleCountryClick}
              styleFunction={handleCountryStyle}
            />
          </div>

          <div className="space-y-4 bg-background/30 p-4 rounded-2xl border border-border/30 flex flex-col">
            <div className="flex flex-col gap-2">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase">Add Location manually</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempLoc.country}
                  onChange={e => setTempLoc({ continent: 'Other / All', country: e.target.value, region: '' })}
                  disabled={isAutofilling}
                  placeholder="e.g. Canada"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!tempLoc.country) return;
                    if (selectedLocations.some(l => l.country.toLowerCase() === tempLoc.country.toLowerCase())) {
                      toast.error("Location already added.");
                      return;
                    }
                    updateLocations([...selectedLocations, { continent: tempLoc.continent, country: tempLoc.country, region: '' }]);
                    setTempLoc({ continent: '', country: '', region: '' });
                    toast.success("Added target location.");
                  }}
                  disabled={!tempLoc.country || isAutofilling}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground px-4 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex-1">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-2">Selected Targets</label>
              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-3 border border-border/50 rounded-xl bg-background/50 scrollbar-thin min-h-[100px]">
                {selectedLocations.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic my-auto">No locations selected.</span>
                ) : (
                  selectedLocations.map((loc, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-secondary/80 text-foreground border border-border/60 px-2.5 py-1 rounded-lg text-xs font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{loc.country}</span>
                      <button
                        type="button"
                        onClick={() => updateLocations(selectedLocations.filter((_, i) => i !== idx))}
                        className="hover:text-destructive transition-colors ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Tags & Interests */}
      <section className="space-y-6 pt-4 border-t border-border/50">
        <div className="border-b border-border/50 pb-4">
          <h2 className="text-xl font-bold text-card-foreground">Interests & Tags</h2>
          <p className="text-xs text-muted-foreground mt-1">Select tags to narrow down your scholarship and program matches.</p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 p-4 border border-border/50 rounded-xl bg-background/50 min-h-[60px]">
            {selectedTags.length === 0 ? (
              <span className="text-xs text-muted-foreground italic my-auto">No tags selected. Click topics below.</span>
            ) : (
              selectedTags.map((tag) => (
                <div key={tag} className="flex items-center gap-1.5 bg-primary/10 text-foreground border border-primary/20 px-3 py-1.5 rounded-full text-xs font-semibold">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>{tag}</span>
                  <button onClick={() => updateTags(selectedTags.filter(t => t !== tag))} className="hover:text-destructive ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(CATEGORIZED_TAGS).map(([category, { tags, color }]) => (
              <div key={category} className="space-y-3">
                <h4 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wide border-b border-border/20 pb-1">{category}</h4>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) updateTags(selectedTags.filter(t => t !== tag));
                          else updateTags([...selectedTags, tag]);
                        }}
                        className={`flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border transition duration-200 select-none 
                          ${isSelected ? 'bg-primary/10 border-primary text-foreground font-semibold' : 'bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground'}`}
                      >
                        <div className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: color }} />
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!customTagInput.trim()) return;
                    if (!selectedTags.includes(customTagInput.trim())) updateTags([...selectedTags, customTagInput.trim()]);
                    setCustomTagInput("");
                  }
                }}
                disabled={isAutofilling}
                placeholder="Type custom tag & press Enter..."
                className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => {
                  if (!customTagInput.trim()) return;
                  if (!selectedTags.includes(customTagInput.trim())) updateTags([...selectedTags, customTagInput.trim()]);
                  setCustomTagInput("");
                }}
                disabled={isAutofilling}
                className="bg-secondary hover:bg-secondary/80 border border-border text-foreground px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                Add Tag
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
