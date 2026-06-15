export default function Tracker() {
  const columns = ["To Apply", "Drafting (AI)", "Applied", "Won", "Rejected"];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6 animate-fade-in">
      <header className="shrink-0 mb-2">
        <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-foreground">Application Tracker</h1>
        <p className="text-muted-foreground mt-1">Manage your active scholarships and draft essays with AI.</p>
      </header>

      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex space-x-6 min-w-max h-full">
          {columns.map((col, index) => (
            <div key={index} className="w-[340px] bg-secondary/30 rounded-2xl border border-border/50 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm font-bold text-card-foreground flex justify-between items-center">
                {col}
                <span className="bg-background text-muted-foreground text-xs font-semibold px-2.5 py-1 rounded-full border border-border/50">
                  {index === 0 ? 1 : index === 1 ? 1 : 0}
                </span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                
                {/* Mock Card 1 */}
                {index === 0 && (
                  <div className="bg-card p-5 rounded-xl shadow-sm border border-border hover:border-primary/50 transition-all cursor-grab group">
                    <h3 className="font-bold text-card-foreground group-hover:text-primary transition-colors">Women in Tech Fund</h3>
                    <div className="flex items-center text-sm text-muted-foreground mt-2 font-medium">
                      <span className="text-3xl font-display tracking-tight text-foreground">$5,000</span>
                      <span className="mx-2">•</span>
                      <span>Due in 5 days</span>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-md">98% Match</span>
                    </div>
                  </div>
                )}
                
                {/* Mock Card 2 */}
                {index === 1 && (
                  <div className="bg-card p-5 rounded-xl shadow-sm border border-border hover:border-primary/50 transition-all cursor-grab group relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                    <h3 className="font-bold text-card-foreground group-hover:text-primary transition-colors">STEM Leadership Grant</h3>
                    <div className="flex items-center text-sm text-muted-foreground mt-2 font-medium">
                      <span className="text-3xl font-display tracking-tight text-foreground">$2,500</span>
                      <span className="mx-2">•</span>
                      <span>Due in 12 days</span>
                    </div>
                    <button className="mt-5 w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center border border-blue-500/20">
                      <span className="mr-2">✨</span> Open AI Drafter
                    </button>
                  </div>
                )}

              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
