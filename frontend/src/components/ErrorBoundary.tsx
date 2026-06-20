import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in application boundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
          {/* Subtle background glow effect */}
          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="bg-card/85 backdrop-blur-md border border-border/80 shadow-2xl rounded-3xl p-8 max-w-lg w-full relative z-10 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-destructive/20 shadow-inner">
              <AlertTriangle className="w-8 h-8 text-destructive animate-pulse" />
            </div>

            <h1 className="text-3xl font-display font-extrabold text-foreground mb-3">
              Application Error
            </h1>
            
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Something went wrong while rendering this view. The discovery engine components are safely isolated, and you can reload the app below.
            </p>

            {this.state.error && (
              <div className="mb-6 text-left">
                <div className="bg-muted/50 border border-border/60 rounded-xl p-4 overflow-auto max-h-48 text-xs font-mono text-muted-foreground shadow-inner">
                  <p className="font-bold text-destructive mb-1">{this.state.error.name}: {this.state.error.message}</p>
                  {this.state.error.stack && (
                    <p className="opacity-80 whitespace-pre-wrap mt-1">{this.state.error.stack}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary via-lime-400 to-primary text-primary-foreground py-3 px-6 rounded-xl font-extrabold transition-all shadow-glow hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(180,244,60,0.3)] border border-primary/20 active:scale-95 duration-200"
              >
                <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
                <span>Reload Application</span>
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground py-3 px-6 rounded-xl font-extrabold transition-all border border-border active:scale-95 duration-200"
              >
                <Home className="w-4 h-4" />
                <span>Go to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
