import { useState } from 'react';

export default function Profile() {
  const [requirements, setRequirements] = useState<{name: string, val: string}[]>([]);
  const [newReqName, setNewReqName] = useState('');
  const [newReqVal, setNewReqVal] = useState('');

  const addRequirement = () => {
    if (newReqName && newReqVal) {
      setRequirements([...requirements, { name: newReqName, val: newReqVal }]);
      setNewReqName('');
      setNewReqVal('');
    }
  };

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
              <input type="text" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" placeholder="e.g. Computer Science" />
              <div className="mt-3 bg-secondary/50 p-3.5 rounded-xl border border-border/50">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-primary mr-1">Why it matters:</span> Many high-value scholarships are restricted to specific STEM or Humanities fields to promote industry growth.
                </p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Cumulative GPA</label>
              <input type="number" step="0.01" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" placeholder="e.g. 3.8" />
              <div className="mt-3 bg-secondary/50 p-3.5 rounded-xl border border-border/50">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-primary mr-1">Why it matters:</span> While not the only factor, a GPA above 3.5 drastically increases the probability of passing automated initial screenings.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Demographics */}
        <section className="space-y-5">
          <h2 className="text-xl font-bold text-card-foreground border-b border-border/50 pb-3">Demographics & Background</h2>
          
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Demographics (Comma separated)</label>
            <input type="text" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" placeholder="e.g. First-generation, Hispanic, Female in Tech" />
            <div className="mt-3 bg-secondary/50 p-3.5 rounded-xl border border-border/50">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-primary mr-1">Why it matters:</span> Organizations often create specific funds to support underrepresented groups. Listing these accurate details unlocks niche, low-competition scholarships.
              </p>
            </div>
          </div>
        </section>

        {/* Dynamic Requirements */}
        <section className="space-y-5">
          <h2 className="text-xl font-bold text-card-foreground border-b border-border/50 pb-3">Stored Specific Requirements</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Some scholarships have highly specific requirements (e.g., "Must have a 3D Modeling Portfolio"). 
            Add them here as you discover them, so the AI can automatically match you to similar opportunities.
          </p>

          <div className="space-y-3">
            {requirements.map((req, i) => (
              <div key={i} className="flex justify-between items-center bg-background p-4 rounded-xl border border-border/50 hover:border-border transition-colors">
                <div>
                  <span className="font-semibold text-foreground">{req.name}</span>
                  <span className="text-sm text-muted-foreground ml-3">({req.val})</span>
                </div>
                <button className="text-destructive text-sm font-medium hover:underline">Remove</button>
              </div>
            ))}
            {requirements.length === 0 && (
              <p className="text-sm italic text-muted-foreground text-center py-4 border border-dashed border-border/50 rounded-xl">No specific requirements stored yet.</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
            <input 
              type="text" 
              placeholder="Requirement (e.g. 3D Portfolio)" 
              value={newReqName}
              onChange={(e) => setNewReqName(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" 
            />
            <input 
              type="text" 
              placeholder="Value / Link" 
              value={newReqVal}
              onChange={(e) => setNewReqVal(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" 
            />
            <button 
              onClick={addRequirement}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6 py-2.5 rounded-xl font-semibold transition-colors"
            >
              Save Trait
            </button>
          </div>
        </section>

        <div className="pt-8 mt-8 flex justify-end border-t border-border/50">
          <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
            Save Profile
          </button>
        </div>

      </div>
    </div>
  );
}
