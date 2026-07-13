import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Errore non gestito catturato dall\'ErrorBoundary:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-background">
          <div className="glass-card rounded-[2rem] p-8 max-w-md w-full text-center border border-[var(--rose)]/20">
            <div className="w-16 h-16 rounded-full bg-[var(--rose)]/10 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-[var(--rose)]" />
            </div>
            <h1 className="text-lg font-black text-foreground uppercase tracking-tight italic mb-2">
              Qualcosa è andato storto
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Si è verificato un errore imprevisto nell'applicazione. Ricarica la pagina per continuare.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
            >
              <RotateCw className="w-4 h-4" />
              Ricarica pagina
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
