interface PlaceholderProps {
  title: string
  description: string
  emoji: string
}
export function PlaceholderPage({ title, description, emoji }: Readonly<PlaceholderProps>) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <span className="text-6xl">{emoji}</span>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      <div className="mt-2 px-4 py-1.5 rounded-full bg-[#800020]/8 text-[#800020] text-xs font-medium">
        In sviluppo
      </div>
    </div>
  )
}
