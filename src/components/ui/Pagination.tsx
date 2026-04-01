import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  className
}: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  
  if (totalPages <= 1) return null;

  const canPrevious = currentPage > 0;
  const canNext = currentPage < totalPages - 1;

  return (
    <div className={cn("flex items-center justify-between px-2 py-4", className)}>
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canPrevious}
          className="relative inline-flex items-center rounded-xl glass-card px-4 py-2 text-sm font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 transition-all font-bold"
        >
          Precedente
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canNext}
          className="relative ml-3 inline-flex items-center rounded-xl glass-card px-4 py-2 text-sm font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 transition-all font-bold"
        >
          Successiva
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-bold text-foreground">{currentPage * pageSize + 1}</span> a{' '}
            <span className="font-bold text-foreground">
              {Math.min((currentPage + 1) * pageSize, totalCount)}
            </span> di{' '}
            <span className="font-bold text-foreground">{totalCount}</span> risultati
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-2xl glass-card p-1 shadow-sm border-black/10 dark:border-white/10" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!canPrevious}
              className="relative inline-flex items-center rounded-xl p-2 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
            >
              <span className="sr-only">Precedente</span>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            
            <div className="flex items-center px-4">
              <span className="text-sm font-black text-foreground px-3 py-1 bg-black/5 dark:bg-white/10 rounded-lg">
                Pagina {currentPage + 1} di {totalPages}
              </span>
            </div>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!canNext}
              className="relative inline-flex items-center rounded-xl p-2 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
            >
              <span className="sr-only">Successiva</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
