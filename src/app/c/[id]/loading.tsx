/**
 * Esqueleto que aparece al instante mientras el servidor arma la pantalla.
 * Sin esto, tocar una pestaña parece que no hace nada hasta que llega la
 * respuesta, y la app se siente trabada.
 */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="-mx-4 -mt-5 mb-4 bg-navy-grad px-4 pb-5 pt-6
                      [padding-top:calc(1.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="h-6 w-24 rounded bg-white/20" />
            <div className="h-5 w-20 rounded-full bg-white/15" />
          </div>
          <div className="mx-auto mt-5 h-3 w-40 rounded bg-white/15" />
          <div className="mt-4 grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="mx-auto h-3 w-16 rounded bg-white/15" />
              <div className="mx-auto h-10 w-20 rounded bg-white/20" />
            </div>
            <div className="space-y-2">
              <div className="mx-auto h-3 w-16 rounded bg-white/15" />
              <div className="mx-auto h-10 w-20 rounded bg-white/20" />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-1.5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-12 rounded-lg bg-line/70" />
        ))}
      </div>

      {[...Array(2)].map((_, s) => (
        <div key={s} className="card mb-3 overflow-hidden">
          <div className="h-10 bg-ice-sunk" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-t border-line px-3 py-3">
              <div className="h-9 w-9 shrink-0 rounded-full bg-line/70" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 rounded bg-line/70" />
                <div className="h-2 w-full rounded bg-line/50" />
              </div>
              <div className="h-5 w-8 rounded bg-line/70" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
