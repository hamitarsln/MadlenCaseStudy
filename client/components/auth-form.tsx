"use client";
import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '../stores/session';

const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).optional(),
});

type Mode = 'login' | 'register';

export function AuthForm() {
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const session = useSessionStore();
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = AuthSchema.safeParse({ ...form, name: mode === 'register' ? form.name : undefined });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, name: form.name })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Auth failed');
      session.setSession(data.token, data.user);
      toast.success(mode === 'login' ? 'Hoş geldin!' : 'Hesap oluşturuldu');
      if (data.requiresLevelTest) {
        router.push('/level-test');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 fade-in">
      <div className="flex gap-2 text-sm font-medium" role="tablist" aria-label="Auth tabs">
        <button type="button" aria-selected={mode==='login'} role="tab" onClick={() => setMode('login')} className={`flex-1 py-2 rounded-md font-semibold transition outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:ring-offset-white/10 ${mode==='login'?'bg-primary text-neutral-900 shadow-sm':'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-black/40 dark:text-white/70 dark:hover:bg-black/60'}`}>Giriş Yap</button>
        <button type="button" aria-selected={mode==='register'} role="tab" onClick={() => setMode('register')} className={`flex-1 py-2 rounded-md font-semibold transition outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:ring-offset-white/10 ${mode==='register'?'bg-primary text-neutral-900 shadow-sm':'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-black/40 dark:text-white/70 dark:hover:bg-black/60'}`}>Kayıt Ol</button>
      </div>
      {mode === 'register' && (
        <div className="space-y-1">
          <label className="text-xs font-medium tracking-wide text-neutral-600 dark:text-white/70" htmlFor="name">Ad Soyad</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} className="w-full rounded-md px-3 py-2 bg-white/910 dark:bg-white/5 border border-neutral-300 dark:border-white/10 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-white/30 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs font-medium tracking-wide text-neutral-600 dark:text-white/70" htmlFor="email">E-posta</label>
        <input id="email" name="email" type="email" value={form.email} onChange={handleChange} className="w-full rounded-md px-3 py-2 bg-white/90 dark:bg-white/5 border border-neutral-300 dark:border-white/10 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-white/30 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium tracking-wide text-neutral-600 dark:text-white/70" htmlFor="password">Şifre</label>
        <input id="password" name="password" type="password" value={form.password} onChange={handleChange} className="w-full rounded-md px-3 py-2 bg-white/90 dark:bg-white/5 border border-neutral-300 dark:border-white/10 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-white/30 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>
      <button disabled={loading} className="w-full h-11 rounded-md font-semibold tracking-wide bg-primary text-neutral-900 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_4px_12px_-2px_rgba(0,0,0,0.25),0_0_20px_-2px_rgba(255,196,0,0.6)] hover:brightness-105 transition focus:outline-none focus:ring-2 focus:ring-primary/50">{loading ? '...' : (mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur')}</button>
    </form>
  );
}
