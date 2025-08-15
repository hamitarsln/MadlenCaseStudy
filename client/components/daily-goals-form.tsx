"use client";
import { useState } from 'react';
import { toast } from 'sonner';
import { authHeader } from '../stores/session';

export function DailyGoalsForm({ apiBase, initial, onUpdate }:{ apiBase:string; initial?:{words:number;messages:number}; onUpdate?:(g:{words:number;messages:number})=>void }) {
  const [words,setWords] = useState(initial?.words ?? 15);
  const [messages,setMessages] = useState(initial?.messages ?? 20);
  const [saving,setSaving] = useState(false);

  async function save(){
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/users/me/daily/goals`, {
        method:'PUT',
        headers:{ 'Content-Type':'application/json', ...(authHeader() as any) },
        body: JSON.stringify({ words, messages })
      });
      const data = await res.json();
      if(!data.success) throw new Error(data.message);
      toast.success('Hedefler güncellendi');
      onUpdate && onUpdate(data.goals);
    } catch(e:any){
      toast.error(e.message || 'Kaydedilemedi');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <label className="space-y-1">
          <span className="block text-[10px] uppercase tracking-wide text-white/40">Günlük Kelime</span>
          <input type="number" min={1} max={200} value={words} onChange={e=> setWords(parseInt(e.target.value)||1)} className="w-full rounded bg-black/40 border border-white/10 px-2 py-1 focus:border-primary outline-none" />
        </label>
        <label className="space-y-1">
          <span className="block text-[10px] uppercase tracking-wide text-white/40">Günlük Mesaj</span>
          <input type="number" min={1} max={500} value={messages} onChange={e=> setMessages(parseInt(e.target.value)||1)} className="w-full rounded bg-black/40 border border-white/10 px-2 py-1 focus:border-primary outline-none" />
        </label>
      </div>
      <button disabled={saving} onClick={save} className="w-full h-8 rounded bg-primary text-neutral-900 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
        {saving ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </div>
  );
}
