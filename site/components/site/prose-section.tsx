export function ProseSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 border-t border-border pt-6">
      <h2 className="font-display text-3xl leading-none text-foreground">{title}</h2>
      <div className="mt-4 space-y-3 text-base text-foreground">{children}</div>
    </section>
  );
}
