import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React ErrorBoundary Caught Failure:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090e] text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-xl bg-slate-900/90 border border-rose-500/40 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Super Admin Portal - Runtime Notice</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">An unexpected execution boundary condition occurred.</p>
              </div>
            </div>

            {this.state.error && (
              <div className="mb-4 p-4 bg-pm-input border border-pm-border rounded-xl overflow-x-auto">
                <div className="text-xs font-mono text-rose-400 font-bold mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </div>
                {this.state.errorInfo && (
                  <pre className="text-[0.7rem] font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap mt-2">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg"
            >
              <RefreshCw className="w-4 h-4 animate-spin-slow" /> Reload Super Admin Portal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
