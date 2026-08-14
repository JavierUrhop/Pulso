export default function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
      <p className="text-[13px] text-red-800">{message}</p>
    </div>
  );
}
