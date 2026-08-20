export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="-mx-4 -mt-5 mb-5 bg-navy-grad px-4 pb-5 pt-6
                      [padding-top:calc(1.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-white/20" />
            <div className="space-y-2">
              <div className="h-6 w-36 rounded bg-white/20" />
              <div className="h-3 w-24 rounded bg-white/15" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-white/10" />
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-line/50" />)}
      </div>
    </div>
  );
}
