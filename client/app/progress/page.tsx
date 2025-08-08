"use client";
import { useEffect, useState } from 'react';
import { useSessionStore, authHeader } from '../../stores/session';
import { Heading, Card } from '../../components/theme-provider';
import { PageLoader, LoadingSpinner } from '../../components/loading';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface LearnedWord { id:string; word:string; meaning:string; level:string; mastery:number; learnedAt:string; }
interface Structure { key:string; count:number; lastSeen:string; }
interface Summary { level:string; dynamicLevel:string; levelConfirmed:boolean; progress:any; counts:{ totalLearned:number; structures:number }; structures:Structure[]; words:LearnedWord[] }

export default function ProgressPage(){
  const { user, hydrated } = useSessionStore();
  const [summary,setSummary] = useState<Summary|null>(null);
  const [loading,setLoading] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const router = useRouter();

  useEffect(()=>{
    if(!hydrated || !user) return;
    setLoading(true);
    fetch(`${apiBase}/api/users/${user.id}/progress/summary`, { headers: authHeader() as any })
      .then(async r => {
        if (r.status === 404) {
          // User no longer exists (likely DB reset / seed). Clear session.
            useSessionStore.getState().clear();
            toast.error('Oturum bulunamadı. Lütfen tekrar giriş yap.');
            router.push('/');
            return null;
        }
        if (r.status === 401) {
          useSessionStore.getState().clear();
          toast.error('Yetki hatası. Tekrar giriş yap.');
          router.push('/');
          return null;
        }
        try { return await r.json(); } catch { return null; }
      })
      .then(d=>{ if(d && d.success) setSummary(d.summary); else if(d && d.message) toast.error(d.message); })
      .catch(()=> toast.error('Yüklenemedi'))
      .finally(()=> setLoading(false));
  },[hydrated,user]);

  if(!hydrated) return <PageLoader text="Uygulama yükleniyor..." />;
  if(!user) return <PageLoader text="Oturum kontrol ediliyor..." />;

  return (
    <main className='max-w-6xl mx-auto px-6 py-14 space-y-10'>
      <Heading>İlerleme</Heading>
      {loading && (
        <div className="flex justify-center">
          <LoadingSpinner size="lg" text="İlerleme verisi yükleniyor..." />
        </div>
      )}
      {summary && (
        <div className='grid lg:grid-cols-4 gap-6'>
          <div className='lg:col-span-1 space-y-6'>
            <Card className='p-5 space-y-3'>
              <h2 className='font-semibold text-sm'>Seviye Durumu</h2>
              <div className='text-xs flex flex-col gap-1'>
                <div>Başlangıç Level: <span className='text-primary font-medium'>{summary.level}</span></div>
                <div>Dinamik Level: <span className='text-primary font-medium'>{summary.dynamicLevel}</span></div>
                <div>Öğrenilen Kelime: {summary.counts.totalLearned}</div>
                <div>Yapı Çeşidi: {summary.counts.structures}</div>
                <div>Toplam Mesaj: {summary.progress.totalChatMessages}</div>
              </div>
            </Card>
            <Card className='p-5 space-y-3'>
              <h2 className='font-semibold text-sm'>Yapılar</h2>
              <div className='space-y-2 max-h-72 overflow-auto pr-2'>
                {summary.structures.length === 0 && <div className='text-xs text-white/40'>Henüz yok</div>}
                {summary.structures.map(s=> (
                  <div key={s.key} className='flex items-center justify-between text-xs bg-black/30 rounded px-2 py-1 border border-white/10'>
                    <span>{s.key}</span>
                    <span className='text-primary font-medium'>{s.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div className='lg:col-span-3'>
            <Card className='p-5'>
              <h2 className='font-semibold text-sm mb-4'>Öğrenilen Kelimeler</h2>
              <div className='grid md:grid-cols-3 gap-4 max-h-[560px] overflow-auto pr-2'>
                {summary.words.length === 0 && <div className='text-xs text-white/40'>Kelime yok</div>}
                {summary.words.map(w => (
                  <div key={w.id} className='bg-black/40 border border-white/10 rounded p-3 text-xs space-y-1'>
                    <div className='flex justify-between'>
                      <span className='font-medium text-primary'>{w.word}</span>
                      <span className='px-2 py-0.5 rounded bg-primary/20 text-primary-foreground'>{w.level}</span>
                    </div>
                    <div className='line-clamp-3 text-white/70'>{w.meaning}</div>
                    <div className='text-[10px] text-white/40'>Mastery {w.mastery}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </main>
  );
}
