"use client";
import { useEffect, useState } from 'react';
import { useSessionStore, authHeader } from '../../stores/session';
import { Heading, Card, useTheme } from '../../components/theme-provider';
import { LoadingSpinner, PageLoader } from '../../components/loading';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Send, BookOpen, Plus, Trash2, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { MessageFormatter } from '../../components/message-formatter';

interface ChatMsg { message: string; isUser: boolean; timestamp?: string; }
interface Word { _id: string; word: string; meaning: string; translation: string; level: string; }
interface Channel { id: string; title: string; updatedAt?: string; createdAt?: string; }

export default function Dashboard() {
  const { user, hydrated } = useSessionStore();
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [words, setWords] = useState<Word[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<string | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const { theme, toggle } = useTheme();
  const [adaptiveStatus, setAdaptiveStatus] = useState<{buffer:number; target:string; dyn?:string}>({buffer:0,target:'present_simple'});

  useEffect(() => {
    if (!hydrated || !user) return;
    
    setPageLoading(true);
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/chat/channels`, { headers: authHeader() as Record<string,string> });
        if (!res.ok) throw new Error(`Kanallar HTTP ${res.status}`);
        const d = await res.json();
        if (d.success) {
          const list: Channel[] = d.channels.map((c: any) => ({ id: c._id || c.id, title: c.title, updatedAt: c.updatedAt, createdAt: c.createdAt }));
            setChannels(list);
          const stored = localStorage.getItem('madlen-current-channel');
          const initial = (stored && list.find(c => c.id === stored)) ? stored : (list[0]?.id || null);
          setCurrentChannel(initial);
        } else {
          throw new Error(d.message || 'Kanallar alınamadı');
        }
      } catch (e: any) {
        console.error('Channels fetch failed', e);
        toast.error(e.message || 'Kanallar yüklenemedi');
      }
      
      try {
        const wr = await fetch(`${apiBase}/api/words/${user.level}?limit=8`, { cache: 'no-store' });
        if (!wr.ok) throw new Error(`Kelimeler HTTP ${wr.status}`);
        const wd = await wr.json();
        if (wd.success) setWords(wd.words);
      } catch (e: any) {
        console.error('Words fetch failed', e);
      }
      
      setPageLoading(false);
    })();
  }, [hydrated, user]);

  useEffect(() => {
    if (!currentChannel || !user) { setChat([]); return; }
    localStorage.setItem('madlen-current-channel', currentChannel);
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/chat/channels/${currentChannel}`, { headers: authHeader() as Record<string,string> });
        if (!res.ok) throw new Error(`Mesajlar HTTP ${res.status}`);
        const d = await res.json();
        if (d.success) setChat(d.channel.messages); else throw new Error(d.message || 'Mesajlar alınamadı');
      } catch (e: any) {
        console.error('Channel messages fetch failed', e);
        toast.error(e.message || 'Mesajlar yüklenemedi');
      }
    })();
  }, [currentChannel, user]);

  useEffect(()=>{
    if (!user) return;
    (async ()=>{
      try {
        const r = await fetch(`${apiBase}/api/users/me`, { headers: authHeader() as Record<string,string> });
        if (r.ok) {
          const d = await r.json();
          if (d.success && d.user) {
            setAdaptiveStatus({ 
              buffer: d.user.levelBuffer || 0, 
              target: d.user.currentTargetStructure || 'present_simple', 
              dyn: d.user.dynamicLevel 
            });
          }
        }
      } catch {}
    })();
  },[user]);

  async function createChannel() {
    try {
      const res = await fetch(`${apiBase}/api/chat/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeader() as Record<string,string>) },
        body: JSON.stringify({ title: 'Yeni Sohbet' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      const newChan: Channel = { id: data.channel.id, title: data.channel.title };
      setChannels(c => [newChan, ...c]);
      setCurrentChannel(newChan.id);
      setChat([]);
    } catch (e: any) {
      toast.error(e.message || 'Kanal oluşturulamadı');
    }
  }

  async function deleteChannel(id: string) {
    if (!confirm('Bu sohbet kanalını silmek istiyor musun?')) return;
    try {
      const res = await fetch(`${apiBase}/api/chat/channels/${id}`, { method: 'DELETE', headers: authHeader() as Record<string,string> });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setChannels(c => c.filter(ch => ch.id !== id));
      if (currentChannel === id) {
        const next = channels.find(ch => ch.id !== id)?.id || null;
        setCurrentChannel(next);
        setChat([]);
      }
    } catch (e: any) {
      toast.error(e.message || 'Silinemedi');
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const content = input;
    setChat(c => [...c, { message: content, isUser: true }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeader() as Record<string,string>) },
        body: JSON.stringify({ 
          message: content, 
          channelId: currentChannel,
          suggestedWords: words.slice(0, 4).map(w => w.word) 
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      if (data.level && data.dynamicLevel) {
        const store = useSessionStore.getState();
        if (store.user) {
          store.setSession(store.token!, { ...store.user, level: data.level, dynamicLevel: data.dynamicLevel });
        }
      }
      if (!currentChannel && data.channelId) {
        setCurrentChannel(data.channelId);
      }
      setChannels(prev => {
        const id = data.channelId || currentChannel!;
        const existing = prev.find(c => c.id === id);
        if (existing) {
          const updated = prev.map(c => c.id === id ? { ...c, title: data.title || c.title, updatedAt: new Date().toISOString() } : c);
          const target = updated.find(c => c.id === id)!;
          return [target, ...updated.filter(c => c.id !== id)];
        } else {
          return [{ id, title: data.title || 'Yeni Sohbet', updatedAt: new Date().toISOString() }, ...prev];
        }
      });
      setChat(c => [...c, { message: data.response, isUser: false }]);
    } catch (e: any) {
      toast.error(e.message || 'Sohbet hatası');
      setChat(c => c.slice(0, -1)); 
    } finally { setLoading(false); }
  }

  if (!hydrated) return <PageLoader text="Uygulama yükleniyor..." />;
  if (!user) return <PageLoader text="Oturum kontrol ediliyor..." />;
  if (pageLoading) return <PageLoader text="Pano yükleniyor..." />;

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-16">
      {/* Navbar */}
      <div className="flex items-center justify-between mb-8 -mt-6 md:-mt-10 pb-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium text-primary">Madlen</Link>
          <Link href="/progress" className="text-xs px-3 py-1 rounded bg-black/40 border border-white/10 hover:border-primary/60 flex items-center gap-1"><BarChart3 size={14}/> İlerleme</Link>
          <Link href="/learning" className="text-xs px-3 py-1 rounded bg-black/40 border border-white/10 hover:border-primary/60 flex items-center gap-1"><BookOpen size={14}/> Öğrenme</Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] text-white/50 flex flex-col items-end leading-tight">
            <span>Level: <span className="text-primary font-semibold">{user.level}</span></span>
            {user.dynamicLevel && user.dynamicLevel !== user.level && (
              <span>Dinamik: <span className="text-primary/70 font-medium">{user.dynamicLevel}</span></span>
            )}
          </div>
        </div>
      </div>

      <header className="flex flex-col md:flex-row gap-6 md:items-end justify-between mb-8">
        <div>
          <Heading className="mb-2">Merhaba, {user.name.split(' ')[0]}</Heading>
          <p className="text-white/60 text-sm">Seviye: <span className="text-primary font-medium">{user.level}</span>{user.dynamicLevel && user.dynamicLevel !== user.level && <span className="ml-2 text-xs text-white/40">(Dinamik: {user.dynamicLevel})</span>}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-white/50">
            {adaptiveStatus.buffer !== undefined && (
              <span>Buffer: <span className={adaptiveStatus.buffer >= 0 ? 'text-primary' : 'text-red-400'}>{adaptiveStatus.buffer.toFixed(1)}/10</span></span>
            )}
            <div className="flex items-center gap-1"><span className="uppercase tracking-wide">Buffer</span>
              <span className="relative w-32 h-2 bg-white/10 rounded overflow-hidden">
                <span className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${Math.min(100, Math.max(0, ((adaptiveStatus.buffer||0)+10)/20*100))}%` }} />
              </span>
              <span className="text-primary/80 font-semibold">{adaptiveStatus.buffer.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1"><span>Hedef Yapı:</span><span className="text-primary font-medium">{adaptiveStatus.target}</span></div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 w-full md:w-auto text-center">
          <Stat icon={<BookOpen size={18} />} label="Öğrenilen Kelime" value={user.progress?.wordsLearned ?? 0} />
        </div>
      </header>

      <div className="grid lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 flex flex-col h-[620px] overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Sohbetler</h2>
            <button onClick={createChannel} className="text-xs px-2 py-1 bg-primary text-dark rounded flex items-center gap-1 hover:bg-primary-400 transition"><Plus size={14}/> Yeni</button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {channels.length === 0 && <div className="text-xs text-neutral-500 dark:text-white/40 py-4">Henüz sohbet yok</div>}
            {channels.map(ch => (
              <div key={ch.id} className={`group relative text-xs rounded-md p-2 border cursor-pointer flex items-center gap-2 transition-colors ${ch.id === currentChannel ? 'bg-primary text-dark border-primary':'bg-[var(--bg-muted)]/70 dark:bg-black/30 border-[var(--border)] dark:border-white/10 hover:border-primary/40'}`} onClick={() => setCurrentChannel(ch.id)}>
                <span className="line-clamp-2 flex-1 text-left">{ch.title}</span>
                <button onClick={(e)=>{e.stopPropagation(); deleteChannel(ch.id);}} className="opacity-0 group-hover:opacity-100 text-neutral-500 dark:text-black/50 hover:text-black transition">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Chat */}
        <Card className="lg:col-span-2 flex flex-col h-[620px]">
          <h2 className="font-semibold mb-3">AI Sohbet</h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {chat.map((m,i) => (
              <motion.div key={i} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed shadow-sm transition-colors ${m.isUser ? 'ml-auto bg-primary text-dark shadow-neon':'bg-[var(--bg-muted)] dark:bg-white/5 border border-[var(--border)] dark:border-white/10'}`}>
                <MessageFormatter content={m.message} isUser={m.isUser} />
              </motion.div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-white/40">
                <LoadingSpinner size="sm" />
                <span>AI yazıyor...</span>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=> e.key==='Enter' && sendMessage()} placeholder="Soru sor veya konuş..." className="flex-1 bg-[var(--bg-muted)]/80 dark:bg-black/40 border border-[var(--border)] dark:border-white/10 rounded-md px-3 py-3 focus:border-primary outline-none transition-colors" />
            <button onClick={sendMessage} disabled={loading || !currentChannel && channels.length>6} title={!currentChannel && channels.length>6 ? 'Önce kanal oluştur' : ''} className="btn-primary w-12 h-12 rounded-md flex items-center justify-center">{loading ? <LoadingSpinner size="sm" /> : <Send size={18} />}</button>
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-1">
          <Card>
            <h2 className="font-semibold mb-4">Önerilen Kelimeler</h2>
            <div className="grid grid-cols-2 gap-3">
              {words.map(w => (
                <div key={w._id} className="group rounded-md p-3 border border-[var(--border)] dark:border-white/10 hover:border-primary/60 transition text-sm bg-[var(--bg-muted)]/60 dark:bg-black/40">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-primary-600 dark:text-primary-400">{w.word}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary-700 dark:text-primary-200 dark:bg-primary-500/20">{w.level}</span>
                  </div>
                  <p className="text-neutral-600 dark:text-white/60 line-clamp-2">{w.meaning}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="font-semibold mb-2">Motivasyon</h2>
            <p className="text-sm text-neutral-700 dark:text-white/70">Hedefini koru! Her gün az da olsa konuşarak ilerle. Yeni kelimeler sohbet içinde işaretlenecek.</p>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-[var(--bg-muted)]/70 dark:bg-black/40 rounded-xl px-4 py-3 border border-[var(--border)] dark:border-white/10 transition-colors">
      <div className="flex items-center justify-center gap-1 text-primary mb-1 text-xs">{icon}{label}</div>
      <div className="font-semibold text-lg">{value}</div>
    </div>
  );
}
