export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6" aria-busy="true">
      <div className="h-4 w-32 rounded bg-secondary" />
      <div className="mt-5 h-12 w-2/3 rounded bg-secondary" />
      <div className="mt-6 h-5 w-full rounded bg-secondary" />
      <div className="mt-2 h-5 w-5/6 rounded bg-secondary" />
      <div className="mt-12 h-8 w-40 rounded bg-secondary" />
      <div className="mt-4 flex gap-2">
        <div className="h-10 w-28 rounded-full bg-secondary" />
        <div className="h-10 w-36 rounded-full bg-secondary" />
        <div className="h-10 w-24 rounded-full bg-secondary" />
      </div>
    </div>
  );
}
