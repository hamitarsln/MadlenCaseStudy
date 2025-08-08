"use client";
import { useEffect, useState } from 'react';
import { useSessionStore, authHeader } from '../../stores/session';
import { useRouter } from 'next/navigation';
import { Card, Heading } from '../../components/theme-provider';
import { toast } from 'sonner';

interface Question { id:number; q:string; a:string[]; }

export default function LevelTestPage() {
  const { user } = useSessionStore();
  const router = useRouter();
  const [questions,setQuestions] = useState<Question[]>([]);
  const [answers,setAnswers] = useState<Record<number,number>>({});
  const [loading,setLoading] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(()=>{
    if (!user) return;
    fetch(`${apiBase}/api/auth/level-test/questions`)
      .then(r=>r.json()).then(d=>{ if(d.success) setQuestions(d.questions); });
  },[user]);

  async function submit(){
    if (!user) return;
    if (questions.some(q=> answers[q.id] === undefined)) { toast.error('Tüm soruları işaretle'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/level-test/submit`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', ...authHeader() as any },
        body: JSON.stringify({ userId: user.id, answers: Object.entries(answers).map(([id,answerIndex])=>({ id: Number(id), answerIndex })) })
      });
      const data = await res.json();
      if(!data.success) throw new Error(data.message);
      toast.success(`Seviyen: ${data.level}`);
      router.push('/dashboard');
    } catch(e:any){
      toast.error(e.message || 'Test hatası oluştu');
    } finally { setLoading(false); }
  }

  if(!user) return <div className="p-10">Lütfen giriş yapın.</div>;

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 space-y-8">
      <Heading>Seviye Testi</Heading>
      <Card className="space-y-6 p-6">
        {questions.map(q=> (
          <div key={q.id} className="space-y-2">
            <div className="font-medium">{q.id}. {q.q}</div>
            <div className="grid gap-2">
              {q.a.map((opt,i)=>(
                <label key={i} className={`text-sm flex items-center gap-2 p-2 rounded border cursor-pointer transition ${answers[q.id]===i? 'bg-primary text-black border-primary':'bg-black/30 border-white/10 hover:border-primary/40'}`}> 
                  <input type="radio" name={`q-${q.id}`} className="hidden" onChange={()=> setAnswers(a=>({...a,[q.id]:i}))} />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <button disabled={loading || questions.length===0} onClick={submit} className="btn-primary w-full h-11 rounded-md font-semibold">{loading? 'Gönderiliyor...':'Bitir & Başla'}</button>
      </Card>
    </main>
  );
}
