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

  useEffect(()=>{ if(hydrated && user) loadQueue(); },[hydrated,user,loadQueue]);

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
    <main className="max-w-6xl mx-auto px-6 py-14 space-y-10">
      <div className="flex items-center justify-between">
        <Heading>Öğrenme Merkezi</Heading>
        <Link href="/dashboard" className="text-xs px-3 py-1 rounded bg-black/40 border border-white/10 hover:border-primary/60">Pano</Link>
      </div>
      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Çalışma Kuyruğu</h2>
            <button onClick={loadQueue} className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-primary text-black hover:bg-primary-400">
              <RefreshCw size={14}/> Yenile
            </button>
          </div>
          {loading && <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>}
          {!loading && queue.length === 0 && <div className="text-xs text-white/50">Kuyruk boş. Daha sonra tekrar gel.</div>}
          <div className="grid md:grid-cols-2 gap-4">
            {queue.map(w => (
              <motion.div key={w.id} layout className={`rounded-lg p-4 border text-sm space-y-2 ${w.review? 'border-primary/40 bg-primary/5':'border-white/10 bg-black/30'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-primary-400">{w.word}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary-800 dark:text-primary-200">{w.level}</span>
                </div>
                <div className="text-xs text-white/60 line-clamp-2">{w.meaning}</div>
                {w.review && (
                  <div className="flex gap-2 items-center text-[10px] text-white/40">
                    <span>Ustalık {w.mastery}</span>
                    <span>Aralık {w.interval}g</span>
                  </div>
                )}
                <button onClick={()=> startReview(w)} className="w-full text-xs px-3 py-2 rounded bg-primary text-black hover:bg-primary-400 flex items-center justify-center gap-1">
                  <Play size={14}/> {w.review? 'Tekrar Et':'Öğren'}
                </button>
              </motion.div>
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold text-sm flex items-center gap-2"><BookOpen size={16}/> İnceleme Paneli</h2>
            <AnimatePresence mode="wait">
              {reviewing ? (
                <motion.div key={reviewing.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="space-y-3">
                  <div className="text-lg font-bold tracking-wide">{reviewing.word}</div>
                  {!showAnswer && (
                    <button onClick={()=> setShowAnswer(true)} className="w-full text-xs px-3 py-2 rounded bg-black/40 border border-white/10 hover:border-primary/50">Anlamı Göster</button>
                  )}
                  {showAnswer && (
                    <div className="space-y-2 text-sm bg-black/30 border border-white/10 rounded p-3">
                      <div><span className="text-white/50">Anlam:</span> {reviewing.meaning}</div>
                      <div><span className="text-white/50">Çeviri:</span> {reviewing.translation}</div>
                      {reviewing.review && <div className="text-[10px] text-white/40">Ustalık {reviewing.mastery} • Aralık {reviewing.interval}g</div>}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button disabled={adding} onClick={()=> mark(false)} className="flex items-center justify-center gap-1 text-xs px-3 py-2 rounded bg-red-500/20 border border-red-500/40 hover:bg-red-500/30">
                      <X size={14}/> Yanlış
                    </button>
                    <button disabled={adding} onClick={()=> mark(true)} className="flex items-center justify-center gap-1 text-xs px-3 py-2 rounded bg-green-500/20 border border-green-500/40 hover:bg-green-500/30">
                      <Check size={14}/> Doğru
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{opacity:0}} animate={{opacity:1}} className="text-xs text-white/50">
                  Soldan bir kelime seçip çalışmaya başla.
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
          <Card className="p-5 text-xs text-white/60">
            Dinamik tekrar sistemi: Doğru cevapta aralık genişler, yanlışta kısalır. Mastery 1-5 arası ilerler. 5 olanlar daha seyrek gelir.
          </Card>
        </div>
      </div>
    </main>
  );
}
