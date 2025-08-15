"use client";
import { useEffect, useState, useRef, useMemo } from 'react';
import { useSessionStore, authHeader } from '../../stores/session';
import { Heading, Card, useTheme } from '../../components/theme-provider';
import { LoadingSpinner, PageLoader } from '../../components/loading';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Send, BookOpen, Plus, Trash2, BarChart3, Settings2, TrendingUp, PieChart, Menu, X as Close } from 'lucide-react';
import Link from 'next/link';
import { MessageFormatter } from '../../components/message-formatter';
import { DailyGoalsForm } from '../../components/daily-goals-form';

interface ChatMsg { message: string; isUser: boolean; timestamp?: string; }
interface Word { _id: string; word: string; meaning: string; translation: string; level: string; }
interface Channel { id: string; title: string; updatedAt?: string; createdAt?: string; }

export default function Dashboard() {
  const { user, hydrated } = useSessionStore();
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatLoading,setChatLoading] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [words, setWords] = useState<Word[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<string | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const { theme, toggle } = useTheme();
  const [adaptiveStatus, setAdaptiveStatus] = useState<{buffer:number; target:string; dyn?:string}>({buffer:0,target:'present_simple'});
  const [metricsWindow, setMetricsWindow] = useState<any[]>([]); // recent adaptive metrics history
  const [wordStats, setWordStats] = useState<{ levels?: any[]; categories?: any[] }>({});
  const [showChannelsMobile,setShowChannelsMobile] = useState(false);
  const [daily,setDaily] = useState<any>(null);
  const [showGoalsEdit, setShowGoalsEdit] = useState(false);
  const [channelFilter,setChannelFilter] = useState('');
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const channelSearchRef = useRef<HTMLInputElement | null>(null);
  const scrollLockRef = useRef(false); // future use if we add manual scroll lock
  const filteredChannels = useMemo(()=> {
    if (!channelFilter.trim()) return channels;
    const q = channelFilter.toLowerCase();
    return channels.filter(c => c.title.toLowerCase().includes(q));
  },[channels, channelFilter]);

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
    setChatLoading(true);
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/chat/channels/${currentChannel}`, { headers: authHeader() as Record<string,string> });
        if (!res.ok) throw new Error(`Mesajlar HTTP ${res.status}`);
        const d = await res.json();
        if (d.success) setChat(d.channel.messages); else throw new Error(d.message || 'Mesajlar alınamadı');
      } catch (e: any) {
        console.error('Channel messages fetch failed', e);
        toast.error(e.message || 'Mesajlar yüklenemedi');
      } finally {
        setChatLoading(false);
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
        // debug adaptive for metrics window & sparkline
        try {
          const drw = await fetch(`${apiBase}/api/users/me?debug=1`, { headers: authHeader() as Record<string,string> });
          if (drw.ok) {
            const jd = await drw.json();
            if (jd.success && jd.user?.debugAdaptive?.metricsWindow) {
              setMetricsWindow(jd.user.debugAdaptive.metricsWindow);
            }
          }
        } catch {}
        const dr = await fetch(`${apiBase}/api/users/me/daily`, { headers: authHeader() as Record<string,string> });
        if (dr.ok) {
          const dd = await dr.json();
          if (dd.success) setDaily(dd.daily);
        }
        // word stats summary for dashboard mini analytics
        try {
          const ws = await fetch(`${apiBase}/api/words/stats/summary`);
          if (ws.ok) {
            const wj = await ws.json();
            if (wj.success) setWordStats({ levels: wj.levels, categories: wj.categories });
          }
        } catch {}
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
    const content = input.trim();
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

  // Always keep chat scrolled to bottom on new messages (requested behavior)
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    // Force to bottom
    // Using requestAnimationFrame to ensure DOM updated after new message render
    requestAnimationFrame(() => {
      try { el.scrollTop = el.scrollHeight; } catch {}
    });
  }, [chat, loading]);

  // Keyboard shortcuts (Ctrl+K focus chat, / focus channel search, Esc blur)
  useEffect(()=>{
    function handler(e: KeyboardEvent){
      if (e.ctrlKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); chatInputRef.current?.focus(); }
      else if (e.key === '/' && document.activeElement !== channelSearchRef.current) { e.preventDefault(); channelSearchRef.current?.focus(); }
      else if (e.key === 'Escape') { (document.activeElement as HTMLElement)?.blur(); }
    }
    window.addEventListener('keydown', handler);
    return ()=> window.removeEventListener('keydown', handler);
  },[]);

  if (!hydrated) return <PageLoader text="Uygulama yükleniyor..." />;
  if (!user) return <PageLoader text="Oturum kontrol ediliyor..." />;
  if (pageLoading) return <PageLoader text="Pano yükleniyor..." />;

  // derive sparkline arrays
  const grammarSeries = metricsWindow.map(m=> m.grammar).filter(n=> typeof n === 'number');
  const vocabSeries = metricsWindow.map(m=> m.vocab).filter(n=> typeof n === 'number');
  const fluencySeries = metricsWindow.map(m=> m.fluency).filter(n=> typeof n === 'number');
  const lastMetric = metricsWindow.slice(-1)[0] || {};
  const levelTotals = (wordStats.levels||[]).reduce((acc:any,c:any)=> acc + (c.count||0),0);

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-16">
      {/* Navbar */}
      <div className="flex items-center justify-between mb-8 -mt-6 md:-mt-10 pb-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium text-primary hover:brightness-110 transition">Madlen</Link>
          <Link href="/progress" className="text-xs px-3 py-1 rounded bg-black/40 border border-white/10 hover:border-primary/60 flex items-center gap-1"><BarChart3 size={14}/> İlerleme</Link>
          <Link href="/learning" className="text-xs px-3 py-1 rounded bg-black/40 border border-white/10 hover:border-primary/60 flex items-center gap-1"><BookOpen size={14}/> Öğrenme</Link>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggle} aria-label="Tema değiştir" className="text-[10px] px-2 py-1 rounded bg-black/40 border border-white/10 hover:border-primary/60">{theme==='dark'?'🌙':'🌞'}</button>
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
            {daily && (
              <div className="flex items-center gap-2 bg-black/30 border border-white/10 px-2 py-1 rounded">
                <span className="text-[9px] uppercase tracking-wide text-white/40">Günlük</span>
                <span className="text-[10px]">{daily.progress.messages}/{daily.goals.messages} msg • {daily.progress.words}/{daily.goals.words} kelime</span>
                <span className="text-[10px] text-primary">🔥 {daily.streak}</span>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full md:w-auto text-center min-w-[280px]">
          <Stat icon={<BookOpen size={16} />} label="Kelimeler" value={user.progress?.wordsLearned ?? 0} />
          <Stat icon={<TrendingUp size={16} />} label="Son Gramer" value={Number(lastMetric.grammar||0).toFixed(1) as any} />
          <Stat icon={<BarChart3 size={16} />} label="Sohbet" value={user.progress?.totalChatMessages ?? 0} />
        </div>
      </header>

      {/* Adaptive Skill Metrics */}
      <section className="grid md:grid-cols-3 gap-6 mb-10">
        <SkillCard title="Gramer" series={grammarSeries} current={lastMetric.grammar} accent="from-pink-500/60 to-pink-400/30" />
        <SkillCard title="Kelime" series={vocabSeries} current={lastMetric.vocab} accent="from-amber-500/60 to-amber-400/30" />
        <SkillCard title="Akıcılık" series={fluencySeries} current={lastMetric.fluency} accent="from-emerald-500/60 to-emerald-400/30" />
      </section>

      {/* Word Repository Stats */}
      {wordStats.levels && wordStats.categories && (
        <section className="mb-12 grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <h2 className="font-semibold mb-4 flex items-center gap-2 text-sm"><PieChart size={16}/> Kelime Havuzu Dağılımı</h2>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {wordStats.levels.sort((a:any,b:any)=> a.level.localeCompare(b.level)).map((l:any)=> {
                const pct = levelTotals? (l.count/levelTotals)*100:0;
                return (
                  <div key={l.level} className="bg-[var(--bg-muted)]/60 dark:bg-black/40 px-3 py-3 rounded border border-[var(--border)] dark:border-white/10">
                    <div className="flex items-center justify-between text-xs mb-1"><span className="font-medium">{l.level}</span><span className="text-white/40">{l.count}</span></div>
                    <div className="h-2 w-full bg-black/30 rounded overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary/70 to-primary/40" style={{ width: pct+'%' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-white/40 mb-2">En Popüler Kategoriler</div>
            <div className="flex flex-wrap gap-2">
              {wordStats.categories.slice(0,10).map((c:any)=> (
                <span key={c.category} className="text-[10px] px-2 py-1 rounded-full bg-black/40 border border-white/10 text-white/60 hover:text-primary transition">{c.category} <span className="text-primary/70">{c.count}</span></span>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="font-semibold mb-4 text-sm">Özet</h2>
            <ul className="space-y-2 text-[11px] text-white/60">
              <li className="flex justify-between"><span>Toplam Aktif Kelime</span><span className="text-primary font-medium">{levelTotals}</span></li>
              <li className="flex justify-between"><span>Son Gramer Skoru</span><span className="text-primary/80">{Number(lastMetric.grammar||0).toFixed(2)}</span></li>
              <li className="flex justify-between"><span>Son Kelime Skoru</span><span className="text-primary/80">{Number(lastMetric.vocab||0).toFixed(2)}</span></li>
              <li className="flex justify-between"><span>Son Akıcılık</span><span className="text-primary/80">{Number(lastMetric.fluency||0).toFixed(2)}</span></li>
              <li className="flex justify-between"><span>Aktif Hedef Yapı</span><span className="text-primary/70">{adaptiveStatus.target}</span></li>
            </ul>
          </Card>
        </section>
      )}

      <div className="grid lg:grid-cols-4 gap-6 items-start">
        {/* Mobile channel toggle */}
        <div className="lg:hidden flex justify-between items-center -mt-4 mb-2 w-full">
          <button onClick={()=> setShowChannelsMobile(v=>!v)} className="text-xs px-3 py-2 rounded bg-black/40 border border-white/10 flex items-center gap-1" aria-label="Kanalları göster/gizle">
            {showChannelsMobile ? <Close size={14}/> : <Menu size={14}/> } Kanallar
          </button>
          <button onClick={createChannel} className="text-xs px-3 py-2 bg-primary text-dark rounded flex items-center gap-1" aria-label="Yeni sohbet oluştur"><Plus size={14}/> Yeni</button>
        </div>
        <Card className={`lg:col-span-1 flex flex-col overflow-hidden transition-all ${showChannelsMobile? 'block':'hidden lg:flex'} max-h-[60vh] lg:h-[620px]`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Sohbetler</h2>
            <button onClick={createChannel} className="hidden lg:inline-flex text-xs px-2 py-1 bg-primary text-dark rounded items-center gap-1 hover:bg-primary-400 transition" aria-label="Yeni sohbet"><Plus size={14}/> Yeni</button>
          </div>
          <div className="mb-2 relative">
            <input ref={channelSearchRef} placeholder="/ Kanal ara" className="w-full text-[11px] px-2.5 py-1.5 rounded bg-black/30 border border-white/10 focus:border-primary outline-none" value={channelFilter} onChange={e=> setChannelFilter(e.target.value)} aria-label="Kanal ara" />
            {channelFilter && (
              <button onClick={()=> setChannelFilter('')} className="absolute right-1 top-1 text-[10px] px-1 rounded bg-black/40 hover:bg-black/60">×</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scroll" role="list" aria-label="Sohbet listesi">
            {filteredChannels.length === 0 && <div className="text-xs text-neutral-500 dark:text-white/40 py-4">
              {channels.length === 0 ? 'Henüz sohbet yok. Yeni butonuyla başla.' : 'Eşleşen sohbet yok.'}
            </div>}
            {filteredChannels.map(ch => (
              <div
                key={ch.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e)=> (e.key==='Enter'||e.key===' ') && setCurrentChannel(ch.id)}
                className={`group relative text-xs rounded-md p-2 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/60 flex items-center gap-2 transition-colors ${ch.id === currentChannel ? 'bg-primary text-dark border-primary':'bg-[var(--bg-muted)]/70 dark:bg-black/30 border-[var(--border)] dark:border-white/10 hover:border-primary/40'}`}
                onClick={() => setCurrentChannel(ch.id)}
                aria-label={`Sohbet ${ch.title}`}
              >
                <span className="line-clamp-2 flex-1 text-left">{ch.title}</span>
                <button onClick={(e)=>{e.stopPropagation(); deleteChannel(ch.id);}} className="opacity-0 group-hover:opacity-100 text-neutral-500 dark:text-black/50 hover:text-black transition focus:opacity-100 focus:outline-none" aria-label="Sohbeti sil">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Chat */}
        <Card className="lg:col-span-2 flex flex-col h-[60vh] lg:h-[640px] relative">
          <h2 className="font-semibold mb-3">AI Sohbet</h2>
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scroll pb-24" aria-live="polite">
            {chatLoading && chat.length===0 && (
              <div className="flex flex-col gap-3 py-6">
                {Array.from({length:4}).map((_,i)=>(
                  <div key={i} className={`h-10 w-2/3 rounded-md bg-gradient-to-r from-white/10 to-white/5 animate-pulse ${i%2? 'ml-auto w-1/2':''}`}></div>
                ))}
              </div>
            )}
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
            {!loading && !chatLoading && chat.length===0 && (
              <div className="text-[11px] text-white/40 pt-6">Henüz mesaj yok. Sağdaki önerilen kelimelerden bazılarını kullanarak ilk mesajını yaz.</div>
            )}
          </div>
          <div className="absolute left-0 right-0 bottom-0 p-3 bg-gradient-to-t from-black/60 via-black/40 to-transparent backdrop-blur-sm">
            <div className="flex gap-2">
              <input ref={chatInputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=> {
                if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }} placeholder="Mesaj yaz... (Ctrl+K odak)" className="flex-1 bg-[var(--bg-muted)]/80 dark:bg-black/60 border border-[var(--border)] dark:border-white/10 rounded-md px-3 py-3 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-colors" aria-label="Mesaj" />
              <button onClick={sendMessage} disabled={loading || (!currentChannel && channels.length>6)} title={!currentChannel && channels.length>6 ? 'Önce kanal oluştur' : 'Gönder'} className="btn-primary w-12 h-12 rounded-md flex items-center justify-center focus:ring-2 focus:ring-primary/50 disabled:opacity-50" aria-label="Gönder">{loading ? <LoadingSpinner size="sm" /> : <Send size={18} />}</button>
            </div>
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
          {daily && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm">Günlük Hedef</h2>
                <button onClick={()=> setShowGoalsEdit(v=>!v)} className="text-xs px-2 py-1 rounded bg-black/40 border border-white/10 hover:border-primary/60 flex items-center gap-1">
                  <Settings2 size={12}/> {showGoalsEdit? 'Kapat':'Düzenle'}
                </button>
              </div>
              {!showGoalsEdit && (
                <div className="space-y-3 text-[10px] text-white/60">
                  <div className="space-y-1">
                    <div className="flex justify-between"><span>Mesaj</span><span>{daily.progress.messages}/{daily.goals.messages}</span></div>
                    <ProgressBar value={daily.progress.messages} goal={daily.goals.messages} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span>Kelimeler</span><span>{daily.progress.words}/{daily.goals.words}</span></div>
                    <ProgressBar value={daily.progress.words} goal={daily.goals.words} />
                  </div>
                  <div className="pt-1 flex items-center justify-between"><span>Streak</span><span className="text-primary font-semibold">{daily.streak} 🔥</span></div>
                  {daily.errorProfile && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {Object.entries(daily.errorProfile).map(([k,v]) => (
                        <div key={k} className="flex items-center justify-between bg-black/30 rounded px-2 py-1 border border-white/5"><span>{k}</span><span className="text-primary font-medium">{v as any}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {showGoalsEdit && (
                <DailyGoalsForm apiBase={apiBase} initial={daily.goals} onUpdate={(g)=> setDaily((d:any)=> ({...d, goals:g}))} />
              )}
            </Card>
          )}
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

function ProgressBar({ value, goal }: { value:number; goal:number }) {
  const pct = Math.min(100, (value/goal)*100);
  return (
    <div className="h-2 w-full bg-black/40 rounded overflow-hidden relative">
      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70" style={{ width: pct+'%' }} />
    </div>
  );
}

// Mini skill card with sparkline
function SkillCard({ title, series, current, accent }: { title:string; series:number[]; current:number; accent:string }) {
  return (
    <Card className="relative overflow-hidden">
  <div className={`absolute inset-0 opacity-40 bg-gradient-to-br pointer-events-none mix-blend-overlay rounded-xl ${accent}`} />
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="text-primary text-xs font-semibold">{current ? Number(current).toFixed(2): '--'}</span>
      </div>
      <Sparkline data={series} height={48} />
      <div className="mt-2 flex gap-2 text-[10px] text-white/40">
        <span>Min {series.length? Math.min(...series).toFixed(1):'-'}</span>
        <span>Max {series.length? Math.max(...series).toFixed(1):'-'}</span>
        <span>Ort {series.length? (series.reduce((a,b)=>a+b,0)/series.length).toFixed(1):'-'}</span>
      </div>
    </Card>
  );
}

function Sparkline({ data, height=40, stroke='#22d3ee' }: { data:number[]; height?:number; stroke?:string }) {
  if (!data || data.length === 0) return <div className="h-[48px] flex items-center justify-center text-[10px] text-white/30">Veri yok</div>;
  const w = 160;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = (max - min) || 1;
  const points = data.map((v,i)=> {
    const x = (i/(data.length-1))*w;
    const y = height - ((v - min)/range)*height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full h-12 overflow-visible">
      <polyline fill="none" stroke={stroke} strokeWidth={2} points={points} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v,i)=> {
        const x = (i/(data.length-1))*w;
        const y = height - ((v - min)/range)*height;
        return <circle key={i} cx={x} cy={y} r={2} fill={stroke} className="opacity-70" />;
      })}
    </svg>
  );
}
