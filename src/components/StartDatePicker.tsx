'use client';

import { useState } from 'react';

const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function parse(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function mondayOf(d: Date) {
  const out = new Date(d);
  const dow = out.getUTCDay();
  out.setUTCDate(out.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return out;
}

const fmt = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;

/**
 * Selector de inicio que muestra en qué lunes empieza realmente la
 * semana 1, para que no queden competencias con una semana de desfase.
 */
export default function StartDatePicker({
  defaultValue, weeks,
}: { defaultValue: string; weeks: number }) {
  const [value, setValue] = useState(defaultValue);
  const [total, setTotal] = useState(weeks);

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const monday = valid ? mondayOf(parse(value)) : null;
  const sunday = monday ? new Date(monday.getTime() + 6 * 86_400_000) : null;
  const end = monday ? new Date(monday.getTime() + (total * 7 - 1) * 86_400_000) : null;
  const shifted = monday && valid && monday.toISOString().slice(0, 10) !== value;

  return (
    <>
      <div>
        <label className="label" htmlFor="start_date">Fecha de inicio</label>
        <input id="start_date" name="start_date" type="date" className="field" required
          value={value} onChange={e => setValue(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="total_weeks">Duración (semanas)</label>
        <input id="total_weeks" name="total_weeks" type="number" className="field" required
          min={1} max={52} value={total}
          onChange={e => setTotal(Math.max(1, Number(e.target.value) || 1))} />
      </div>

      {monday && sunday && end && (
        <div className="col-span-2 rounded-xl bg-ice-sunk px-3.5 py-2.5">
          <p className="text-[0.8125rem] text-ink-soft">
            <span className="font-semibold text-ink">Semana 1:</span>{' '}
            lunes {fmt(monday)} 00:00 → domingo {fmt(sunday)} 23:59.
            {' '}Termina el {fmt(end)}.
          </p>
          {shifted && (
            <p className="mt-1 text-[0.6875rem] text-ink-faint">
              Elegiste un día a mitad de semana, así que la semana 1 parte el lunes anterior.
              Si querías empezar la semana siguiente, elige ese lunes.
            </p>
          )}
        </div>
      )}
    </>
  );
}
