export default function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-xl border border-teamA/25 bg-teamA-soft px-3.5 py-2.5">
      <p className="text-[13px] text-teamA-ink">{message}</p>
    </div>
  );
}
