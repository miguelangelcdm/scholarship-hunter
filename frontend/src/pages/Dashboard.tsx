export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-foreground">Discovery Dashboard</h1>
          <p className="text-muted-foreground mt-1">Review your AI-matched scholarship opportunities.</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
          Run Discovery Scan
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm transition-all hover:shadow-md">
          <h2 className="text-xl font-bold text-card-foreground mb-2 flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-500 mr-3 shadow-glow"></span>
            Desire-Based Matches
          </h2>
          <p className="text-sm text-muted-foreground mb-6">Opportunities aligned strictly with your specified fields and preferences.</p>
          <div className="space-y-4">
            <div className="p-4 border border-border/50 bg-secondary/30 rounded-xl">
              <p className="text-sm text-muted-foreground italic text-center py-4">No matches yet. Run a scan!</p>
            </div>
          </div>
        </section>

        <section className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm transition-all hover:shadow-md">
          <h2 className="text-xl font-bold text-card-foreground mb-2 flex items-center">
            <span className="w-3 h-3 rounded-full bg-emerald-500 mr-3 shadow-glow"></span>
            Probability-Based Matches
          </h2>
          <p className="text-sm text-muted-foreground mb-6">Opportunities where you have the highest statistical chance of winning based on your profile.</p>
          <div className="space-y-4">
             <div className="p-4 border border-border/50 bg-secondary/30 rounded-xl">
              <p className="text-sm text-muted-foreground italic text-center py-4">No matches yet. Run a scan!</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
