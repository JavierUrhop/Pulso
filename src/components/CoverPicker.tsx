'use client';

import { useState } from 'react';

/** Selector de portada con vista previa. La imagen viaja en el formulario. */
export default function CoverPicker({ current }: { current?: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div>
      <p className="label">Foto de portada (opcional)</p>
      <div className="flex items-center gap-3">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-ice-sunk">
          {(preview || current) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview || current!} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <label className="btn cursor-pointer">
          {current || preview ? 'Cambiar' : 'Elegir imagen'}
          <input type="file" name="cover" accept="image/*" className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : null);
            }} />
        </label>
      </div>
    </div>
  );
}
