import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function Profile() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "Default User",
    major: "",
    gpa: "",
    demographics: ""
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile
  });

  useEffect(() => {
    if (profile && !profile.detail) {
      setFormData({
        name: profile.name || "",
        major: profile.major || "",
        gpa: profile.gpa || "",
        demographics: profile.demographics || ""
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <header className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-foreground">Profile Manager</h1>
        <p className="text-muted-foreground mt-1">Optimize your profile to increase your probability matches.</p>
      </header>

      <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm space-y-10 transition-all hover:shadow-md">
        
        {/* Core Info */}
        <section className="space-y-5">
          <h2 className="text-xl font-bold text-card-foreground border-b border-border/50 pb-3">Academic Core</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                placeholder="e.g. 3.8" 
              />
            </div>
          </div>
        </section>

        {/* Demographics */}
        <section className="space-y-5">
          <h2 className="text-xl font-bold text-card-foreground border-b border-border/50 pb-3">Demographics & Background</h2>
          
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Demographics (Comma separated)</label>
            <input 
              type="text" 
              value={formData.demographics}
              onChange={e => setFormData({...formData, demographics: e.target.value})}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" 
              placeholder="e.g. First-generation, Hispanic, Female in Tech" 
            />
          </div>
        </section>

        <div className="pt-8 mt-8 flex justify-end border-t border-border/50">
          <button 
            onClick={() => updateMutation.mutate(formData)}
            disabled={updateMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            {updateMutation.isPending ? "Saving..." : "Save Profile"}
          </button>
        </div>

      </div>
    </div>
  );
}
