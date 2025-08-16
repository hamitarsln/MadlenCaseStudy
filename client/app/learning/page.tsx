"use client";
import { useEffect, useState, useCallback } from 'react';
import { Heading, Card } from '../../components/theme-provider';
import { useSessionStore, authHeader } from '../../stores/session';
import { PageLoader, LoadingSpinner } from '../../components/loading';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, RefreshCw, Play, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface QueueWord { id:string; word:string; meaning:string; translation:string; level:string; mastery:number; review:boolean; nextReviewAt?:string; interval?:number; }

export default function LearningHubPage(){
  const { user, hydrated } = useSessionStore();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const [queue,setQueue] = useState<QueueWord[]>([]);
  const [stats,setStats] = useState<any>(null);
  const [search,setSearch] = useState('');
  const [loading,setLoading] = useState(false);
  const [reviewing,setReviewing] = useState<QueueWord|null>(null);
  const [showAnswer,setShowAnswer] = useState(false);
  const [adding,setAdding] = useState(false);

  const loadQueue = useCallback(()=>{
    if(!user) return;
    setLoading(true);
    fetch(`${apiBase}/api/words/learning/queue`, { headers: authHeader() as any })
      .then(async r => {
        let data=null; try { data = await r.json(); } catch{}
        if (!r.ok || !data?.success) {
          throw new Error(data?.message || 'Queue fetch failed');
        }
        return data;
      })
      .then(d=>{ setQueue(d.queue); })
      .catch(err=> { console.error(err); toast.error('Kuyruk yüklenemedi'); })
      .finally(()=> setLoading(false));
  },[user]);

  useEffect(()=>{ if(hydrated && user) { loadQueue(); fetchStats(); } },[hydrated,user,loadQueue]);

  async function fetchStats(){
    try {
      const r = await fetch(`${apiBase}/api/words/stats/summary`);
      if(!r.ok) return; const d = await r.json(); if(d.success) setStats(d);
    } catch{}
  }

  async function performSearch(e:React.FormEvent){
    e.preventDefault();
    if(!search.trim()) { loadQueue(); return; }
    try {
      const r = await fetch(`${apiBase}/api/words?search=${encodeURIComponent(search)}&level=${user?.level}`);
      const d = await r.json();
      if(d.success){
        const mapped = d.words.map((w:any)=> ({ id:w._id, word:w.word, meaning:w.meaning, translation:w.translation, level:w.level, mastery:0, review:false }));
        setQueue(q=>[...mapped.slice(0,12)]);
      }
    } catch{ toast.error('Arama başarısız'); }
  }

  function startReview(w:QueueWord){
    setReviewing(w); setShowAnswer(false);
  }

  async function mark(correct:boolean){
    if(!reviewing) return;
    if (!reviewing.review) {
      setAdding(true);
      try {
        const res = await fetch(`${apiBase}/api/words/learning/start`, { method:'POST', headers:{ 'Content-Type':'application/json', ...(authHeader() as any)}, body: JSON.stringify({ wordId: reviewing.id }) });
        const d = await res.json();
        if(!d.success) throw new Error(d.message);
        toast.success('Kelime eklendi');
      } catch(e:any){
        toast.error(e.message || 'Eklenemedi');
      } finally { setAdding(false); }
      loadQueue();
      setReviewing(null);
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/words/learning/review`, { method:'POST', headers:{ 'Content-Type':'application/json', ...(authHeader() as any)}, body: JSON.stringify({ wordId: reviewing.id, correct }) });
      const d = await res.json();
      if(!d.success) throw new Error(d.message);
      toast.success(correct ? 'Doğru' : 'Tekrar dene');
      loadQueue();
      setReviewing(null);
    } catch(e:any){ toast.error(e.message || 'İşlenemedi'); }
  }

  if(!hydrated) return <PageLoader text="Yükleniyor" />;
  if(!user) return <PageLoader text="Giriş gerekli" />;

  return (
    <div className="flex">
      {/* Sidebar (same style as dashboard basic) */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-white/10 min-h-screen sticky top-0 px-5 py-8 gap-6 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-2">
          <Link href="/" className="text-sm font-semibold tracking-wide gradient-text">Madlen</Link>
        </div>
        <nav className="flex flex-col gap-1 text-[12px]">
          <Link href="/dashboard" className="px-3 py-2 rounded-md hover:bg-white/5 transition text-white/60">Pano</Link>
          <Link href="/learning" className="px-3 py-2 rounded-md hover:bg-white/5 transition text-white/70" aria-current="page">Öğrenme</Link>
          <Link href="/progress" className="px-3 py-2 rounded-md hover:bg-white/5 transition text-white/60">İlerleme</Link>
        </nav>
        <div className="mt-auto text-[10px] text-white/30 leading-relaxed">
          <p className="mb-2 font-semibold text-white/40">İpucu</p>
          Kısayol: Ctrl+K sohbet odağı (pano). Günlük tekrarlarını burada yönet.
        </div>
      </aside>
      <main className="flex-1 max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
        <div className="space-y-2">
          <Heading className="leading-tight">Öğrenme Merkezi</Heading>
          <p className="text-xs text-white/50 max-w-md">Günlük tekrar kuyruğu, yeni kelimeler ve arama ile kelime hazneni genişlet. Spaced repetition algoritması doğru cevaplarda aralığı uzatır.</p>
          <form onSubmit={performSearch} className="flex items-center gap-2 pt-2">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Kelime ara..." className="text-xs px-3 py-2 rounded-md bg-black/30 border border-white/10 focus:border-primary outline-none w-56" />
            <button type="submit" className="text-xs px-3 py-2 rounded bg-primary text-black hover:bg-primary-400">Ara</button>
            <button type="button" onClick={()=>{ setSearch(''); loadQueue(); }} className="text-xs px-2 py-2 rounded bg-black/40 border border-white/10 hover:border-primary/50">Sıfırla</button>
          </form>
        </div>
        <Link href="/dashboard" className="text-xs px-4 py-2 rounded-md bg-black/40 border border-white/10 hover:border-primary/60 self-start md:self-auto">Pano</Link>
      </div>
      <div className="grid xl:grid-cols-4 gap-8">
        <Card className="xl:col-span-3 p-6 md:p-8 flex flex-col h-[680px]">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-sm tracking-wide uppercase text-white/70">Kuyruk & Yeni Kelimeler</h2>
            <div className="flex items-center gap-2">
              <button onClick={loadQueue} className="text-[11px] flex items-center gap-1 px-2.5 py-1.5 rounded bg-primary text-black hover:bg-primary-400">
                <RefreshCw size={14}/> Yenile
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 custom-scroll grid sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
            {loading && <div className="col-span-full flex justify-center py-10"><LoadingSpinner size="lg" /></div>}
            {!loading && queue.length === 0 && <div className="col-span-full text-xs text-white/40">Sonuç yok.</div>}
            {queue.map(w => (
              <motion.div key={w.id} layout className={`group relative rounded-lg p-4 border text-xs space-y-2 backdrop-blur-sm transition ${w.review? 'border-primary/50 bg-primary/5':'border-white/10 bg-black/30 hover:border-primary/40'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm tracking-wide text-primary-300">{w.word}</div>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-primary/15 text-primary-400 border border-primary/30">{w.level}</span>
                </div>
                <div className="text-[11px] text-white/60 line-clamp-3 min-h-[36px]">{w.meaning}</div>
                {w.review && (
                  <div className="flex flex-wrap gap-2 items-center text-[9px] text-white/40">
                    <span>Ustalık {w.mastery}</span>
                    <span>Aralık {w.interval}g</span>
                  </div>
                )}
                <button onClick={()=> startReview(w)} className="w-full text-[11px] px-3 py-2 rounded-md bg-gradient-to-r from-primary to-primary/70 text-black font-medium flex items-center justify-center gap-1 shadow hover:brightness-105">
                  <Play size={14}/> {w.review? 'Tekrar':'Öğren'}
                </button>
              </motion.div>
            ))}
          </div>
        </Card>
        <div className="flex flex-col gap-6 h-[680px]">
          <Card className="p-5 md:p-6 flex flex-col">
            <h2 className="font-semibold text-[11px] tracking-wide uppercase mb-3 flex items-center gap-2"><BookOpen size={14}/> İnceleme</h2>
            <div className="flex-1">
              <AnimatePresence mode="wait">
                {reviewing ? (
                  <motion.div key={reviewing.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="space-y-3">
                    <div className="text-lg font-bold tracking-wide text-primary-300">{reviewing.word}</div>
                    {!showAnswer && (
                      <button onClick={()=> setShowAnswer(true)} className="w-full text-xs px-3 py-2 rounded bg-black/30 border border-white/10 hover:border-primary/50">Anlamı Göster</button>
                    )}
                    {showAnswer && (
                      <div className="space-y-2 text-xs bg-black/30 border border-white/10 rounded p-3">
                        <div><span className="text-white/40">Anlam:</span> {reviewing.meaning}</div>
                        <div><span className="text-white/40">Çeviri:</span> {reviewing.translation}</div>
                        {reviewing.review && <div className="text-[9px] text-white/40">Ustalık {reviewing.mastery} • Aralık {reviewing.interval}g</div>}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button disabled={adding} onClick={()=> mark(false)} className="flex items-center justify-center gap-1 text-[11px] px-3 py-2 rounded bg-red-500/20 border border-red-500/40 hover:bg-red-500/30">
                        <X size={14}/> Yanlış
                      </button>
                      <button disabled={adding} onClick={()=> mark(true)} className="flex items-center justify-center gap-1 text-[11px] px-3 py-2 rounded bg-green-500/25 border border-green-500/40 hover:bg-green-500/35">
                        <Check size={14}/> Doğru
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{opacity:0}} animate={{opacity:1}} className="text-[11px] text-white/50">
                    Soldan bir kelime seç ve başla.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="pt-4 mt-4 border-t border-white/5 text-[10px] text-white/40 leading-relaxed">
              Doğru cevaplarda aralık katlanarak büyür; yanlışta sıfırlanır. Mastery 5 olunca kelime daha seyrek gelir.
            </div>
          </Card>
          <Card className="p-5 md:p-6 text-[10px] space-y-3">
            <h3 className="font-semibold text-[11px] tracking-wide uppercase text-white/60">Kelime İstatistikleri</h3>
            {!stats && <div className="text-white/40">Yükleniyor...</div>}
            {stats && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {stats.levels.map((l:any)=> (
                    <div key={l.level} className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white/60 text-[11px]">{l.level}: <span className="text-primary font-medium">{l.count}</span></div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {stats.categories.slice(0,6).map((c:any)=> (
                    <div key={c.category} className="px-2 py-1 rounded bg-black/30 border border-white/10 text-[10px] flex items-center justify-between"><span>{c.category}</span><span className="text-primary font-semibold">{c.count}</span></div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
      </main>
    </div>
  );
}
