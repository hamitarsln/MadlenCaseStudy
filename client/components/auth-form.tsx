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
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created');
      if (data.requiresLevelTest) {
        router.push('/level-test');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 fade-in">
      <div className="flex gap-2 text-sm font-medium">
        <button type="button" onClick={() => setMode('login')} className={`flex-1 py-2 rounded-md transition ${mode==='login'?'bg-primary text-black':'bg-black/40 hover:bg-black/60'}`}>Login</button>
        <button type="button" onClick={() => setMode('register')} className={`flex-1 py-2 rounded-md transition ${mode==='register'?'bg-primary text-black':'bg-black/40 hover:bg-black/60'}`}>Register</button>
      </div>
      {mode === 'register' && (
        <div className="space-y-1">
          <label className="text-sm opacity-80">Name</label>
          <input name="name" value={form.name} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 focus:border-primary outline-none" />
        </div>
      )}
      <div className="space-y-1">
        <label className="text-sm opacity-80">Email</label>
        <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 focus:border-primary outline-none" />
      </div>
      <div className="space-y-1">
        <label className="text-sm opacity-80">Password</label>
        <input name="password" type="password" value={form.password} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 focus:border-primary outline-none" />
      </div>
      <button disabled={loading} className="btn-primary w-full h-11 rounded-md font-semibold tracking-wide">
        {loading ? '...' : (mode === 'login' ? 'Login' : 'Create Account')}
      </button>
    </form>
  );
}
