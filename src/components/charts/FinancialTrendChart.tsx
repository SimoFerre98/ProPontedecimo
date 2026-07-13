import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts'
import type { FinancialTrend } from '@/services/paymentService'
import { Info } from 'lucide-react'

interface FinancialTrendChartProps {
  data: FinancialTrend
}

export function FinancialTrendChart({ data }: Readonly<FinancialTrendChartProps>) {
  const { months } = data

  if (!months || months.length === 0) {
    return (
      <div className="glass-card rounded-[2rem] p-8 text-center flex flex-col items-center justify-center min-h-[300px] border border-black/10 dark:border-white/10">
        <Info className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-bold text-foreground mb-1 uppercase tracking-wider italic">
          Nessun dato finanziario
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Non ci sono pagamenti registrati per la stagione selezionata. Aggiungi delle quote associative per vedere l'andamento finanziario.
        </p>
      </div>
    )
  }

  // Helper per formattare i mesi (es. "2026-09" -> "SET")
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    const formatted = date.toLocaleDateString('it-IT', { month: 'short' })
    return formatted.replace('.', '').toUpperCase()
  }

  // Trova il mese corrente per la linea "OGGI"
  const currentMonthStr = new Date().toISOString().substring(0, 7) // "YYYY-MM"
  const showTodayLine = months.some((m) => m.month === currentMonthStr)

  return (
    <div className="chart-card glass-card border border-black/10 dark:border-white/10 p-6 rounded-[2rem] relative overflow-hidden group">
      {/* Background glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px] opacity-10 bg-primary group-hover:opacity-20 transition-opacity" />
      
      <div className="chart-head flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 relative z-10">
        <div className="chart-title-block">
          <h3 className="text-lg font-black text-foreground uppercase tracking-tight italic">
            Incassato <span className="text-gold not-italic">vs</span> Previsto
          </h3>
          <p className="text-[11px] text-muted-foreground font-semibold">
            Ripartizione mensile — quote correnti, insoluti pregressi recuperati e rate ancora da incassare
          </p>
        </div>
        <div className="chart-legend flex items-center gap-4 text-xs font-bold text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-white/5 border border-dashed border-white/30" />
            <span>Previsto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500" />
            <span>Quota Incassata</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gold" />
            <span>Insoluti Recuperati</span>
          </div>
        </div>
      </div>

      <div className="h-[300px] w-full relative z-10 select-none">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={months}
            margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
            barGap={6}
          >
            <CartesianGrid
              vertical={false}
              stroke="currentColor"
              className="text-black/[0.05] dark:text-white/[0.05]"
            />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700 }}
              className="text-muted-foreground/70"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => (value >= 1000 ? `${value / 1000}k` : value)}
              tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700 }}
              className="text-muted-foreground/70"
            />
            <Tooltip
              cursor={{ fill: 'currentColor', className: 'text-black/[0.02] dark:text-white/[0.02]' }}
              contentStyle={{
                background: 'oklch(0.205 0 0 / 0.9)',
                border: '1px solid oklch(1 0 0 / 0.1)',
                borderRadius: '1rem',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600
              }}
              formatter={(value, name) => {
                const formattedVal = `€ ${Number(value).toLocaleString('it-IT')}`
                if (name === 'previsto_eur') return [formattedVal, 'Previsto']
                if (name === 'incassato_quota_eur') return [formattedVal, 'Quota Incassata']
                if (name === 'incassato_insoluti_eur') return [formattedVal, 'Insoluti Recuperati']
                return [formattedVal, String(name)]
              }}
              labelFormatter={(label) => `Mese: ${formatMonth(String(label))}`}
            />
            {showTodayLine && (
              <ReferenceLine
                x={currentMonthStr}
                stroke="var(--gold)"
                strokeDasharray="4 3"
                label={{
                  value: 'OGGI',
                  position: 'top',
                  fill: 'var(--gold)',
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: '0.05em'
                }}
              />
            )}
            <Bar
              dataKey="previsto_eur"
              fill="rgba(148, 163, 184, 0.05)"
              stroke="rgba(148, 163, 184, 0.25)"
              strokeDasharray="3 2"
              strokeWidth={1}
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="incassato_quota_eur"
              stackId="incassato"
              fill="var(--emerald)"
              radius={[0, 0, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="incassato_insoluti_eur"
              stackId="incassato"
              fill="var(--gold)"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-foot-note flex items-center gap-2 mt-4 pt-4 border-t border-black/5 dark:border-white/5 text-[11px] font-semibold text-muted-foreground">
        <Info className="w-4 h-4 text-gold flex-shrink-0" />
        <span>Il divario tra barra Previsto e barra Incassato (Quota + Insoluti) rappresenta le rate future e l'insoluto residuo.</span>
      </div>
    </div>
  )
}
