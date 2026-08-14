'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui';
import type { Participant } from '@/lib/types';

export default function ProfileForm({
  competitionId, participant,
}: { competitionId: string; participant: Participant }) {
  const router = useRouter();
  const [name, setName] = useState(participant.display_name);
  const [nickname, setNickname] = useState(participant.nickname ?? '');
  const [avatar, setAvatar] = useState(participant.avatar_url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function uploadAvatar(file: File) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${competitionId}/${participant.id}-${Date.now()}.${ext}`;

    const up = await supabase.storage.from('avatars').upload(path, file);
    if (up.error) { setBusy(false); return setError('No se pudo subir la foto.'); }

    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from('participants')
      .update({ avatar_url: url }).eq('id', participant.id);

    setBusy(false);
    if (error) return setError(error.message);
    setAvatar(url);
    router.refresh();
  }

  async function save() {
    if (!name.trim()) return setError('El nombre no puede quedar vacío.');
    setBusy(true);
    setError(null);
    const { error } = await createClient().from('participants').update({
      display_name: name.trim(),
      nickname: nickname.trim() || null,
    }).eq('id', participant.id);

    setBusy(false);
    if (error) return setError(error.message);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar url={avatar} name={name} size={64} />
        <label className="btn cursor-pointer">
          {avatar ? 'Cambiar foto' : 'Subir foto'}
          <input type="file" accept="image/*" className="hidden" disabled={busy}
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
        </label>
      </div>

      <div>
        <label className="label" htmlFor="name">Nombre</label>
        <input id="name" className="field" value={name} maxLength={60}
          onChange={e => { setName(e.target.value); setSaved(false); setError(null); }} />
      </div>

      <div>
        <label className="label" htmlFor="nick">Apodo <span className="text-ink-faint">(opcional)</span></label>
        <input id="nick" className="field" value={nickname} maxLength={30}
          onChange={e => { setNickname(e.target.value); setSaved(false); }}
          placeholder="Como quieres que te vean" />
      </div>

      {error && <p className="text-[13px] text-red-700">{error}</p>}
      {saved && <p className="text-[13px] text-ink-soft">Cambios guardados.</p>}

      <button className="btn btn-primary w-full" onClick={save} disabled={busy}>
        {busy ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  );
}
