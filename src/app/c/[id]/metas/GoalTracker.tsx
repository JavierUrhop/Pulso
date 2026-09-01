'use client';

import { useState } from 'react';
import { Avatar, CategoryChip } from '@/components/ui';
import type { GoalWeek } from '@/lib/scoring';
import type { Team, Category } from '@/lib/types';

interface Row {
  id: string;
  name: string;
  avatarUrl: string | null;
  team: Team;
  category: Category;
  isMe: boolean;
  goal: number;
  progress: number;
  remaining: number;
  threshold: number;
  weeks: GoalWeek[];
}

const STATUS = {
  cumplida: { dot: 'bg-crimson', label: 'Meta cumplida' },
  superada: { dot: 'bg-plum', label: 'Meta superada' },
  sube:     { dot: 'bg-win', label: 'Subió la meta' },
  no:       { dot: 'bg-line', label: 'No alcanzó' },
  excluida: { dot: 'bg-ice-sunk ring-1 ring-inset ring-line', label: 'Semana no contada' },
} as const;

export default function GoalTracker({
  rows, maxWeekly, currentWeek,
}: { rows: Row[]; maxWeekly: number; currentWeek: number }) {
  const [open, setOpen] = useState<string | null>(rows.find(r => r.isMe)?.id ?? null);

  const closest = rows.filter(r => r.remaining === 1 && r.goal < maxWeekly);

  return (
    <>
      {closest.length > 0 && (
        <div className="mb-4 rounded-xl border border-win/30 bg-win/10 px-3.5 py-3">
          <p className="eyebrow mb-0.5 text-win">A una semana de subir</p>
          <p className="text-[0.8125rem] text-ink">
            {closest.map(r => r.name).join(', ')}
            {closest.length === 1 ? ' sube su meta' : ' suben su meta'} si esta semana
            vuelven a lograrla.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {rows.map(r => {
          const expanded = open === r.id;
          const atCeiling = r.goal >= maxWeekly;

          return (
            <li key={r.id} className="card overflow-hidden">
              <button
                onClick={() => setOpen(expanded ? null : r.id)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-ice-sunk">
                <span className={`team-bar ${r.team === 'A' ? 'bg-teamA' : 'bg-teamB'}`} />
                <Avatar url={r.avatarUrl} name={r.name} size={36} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    {r.isMe && <span className="chip bg-navy-800 text-white">Tú</span>}
                  </div>

                  {/* Contador visual hacia la próxima subida */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex gap-1" role="img"
                      aria-label={`${r.progress} de ${r.threshold} semanas logradas`}>
                      {Array.from({ length: r.threshold }, (_, i) => (
                        <span key={i}
                          className={`h-2.5 w-2.5 rounded-full transition ${
                            i < r.progress ? 'bg-win'
                              : 'border border-dashed border-line bg-transparent'}`} />
                      ))}
                    </div>
                    <span className="text-[0.6875rem] text-ink-faint">
                      {atCeiling ? 'meta al máximo'
                        : r.remaining === 0 ? 'sube esta semana'
                        : `faltan ${r.remaining}`}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="score font-display text-lg font-bold leading-none">{r.goal}</p>
                  <p className="text-[0.5625rem] uppercase tracking-[0.06em] text-ink-faint">
                    por semana
                  </p>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-line bg-ice-sunk/60 px-3 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <CategoryChip category={r.category} />
                    <span className="text-[0.6875rem] text-ink-faint">
                      Semana a semana
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {r.weeks.map(w => {
                      const st = STATUS[w.status];
                      return (
                        <div key={w.week}
                          title={`Semana ${w.week}: ${w.count}/${w.goal} · ${st.label}`}
                          className={`flex min-w-[3.25rem] flex-col items-center rounded-lg
                            border px-2 py-1.5 ${
                            w.week === currentWeek
                              ? 'border-navy-600 bg-white' : 'border-line bg-white'}`}>
                          <span className="text-[0.5625rem] font-bold uppercase text-ink-faint">
                            S{w.week}
                          </span>
                          <span className={`my-1 h-2.5 w-2.5 rounded-full ${st.dot}`} />
                          <span className="score text-[0.625rem] font-bold text-ink-soft">
                            {w.status === 'excluida' ? '—' : `${w.count}/${w.goal}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-2.5">
                    {(['cumplida', 'superada', 'sube', 'no', 'excluida'] as const).map(k => (
                      <span key={k} className="inline-flex items-center gap-1.5 text-[0.625rem] text-ink-faint">
                        <span className={`h-2 w-2 rounded-full ${STATUS[k].dot}`} />
                        {STATUS[k].label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
