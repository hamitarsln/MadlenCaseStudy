"use client";
import { useEffect, useState, useRef } from 'react';
import { useSessionStore, authHeader } from '../../stores/session';
import { Heading, Card, useTheme } from '../../components/theme-provider';
import { LoadingSpinner, PageLoader } from '../../components/loading';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Send, Plus, Trash2, Settings2, Gauge, PieChart, ChevronRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { MessageFormatter } from '../../components/message-formatter';
import { DailyGoalsForm } from '../../components/daily-goals-form';
import { RadialMeter } from '../../components/ui/radial-meter';

interface ChatMsg { message: string; isUser: boolean; timestamp?: string; }
interface Word { _id: string; word: string; meaning: string; translation: string; level: string; }
interface Channel { id: string; title: string; updatedAt?: string; createdAt?: string; }

export default function Dashboard(){
  const { user, hydrated } = useSessionStore();
  const [chat,setChat] = useState<ChatMsg[]>([]);
  const [chatLoading,setChatLoading] = useState(false);
  const [input,setInput] = useState('');
  const [loading,setLoading] = useState(false);
  const [pageLoading,setPageLoading] = useState(true);
  const [words,setWords] = useState<Word[]>([]);
  const [channels,setChannels] = useState<Channel[]>([]);
  const [currentChannel,setCurrentChannel] = useState<string|null>(null);
  const [adaptiveStatus,setAdaptiveStatus] = useState<{buffer:number; target:string; dyn?:string}>({buffer:0,target:'present_simple'});
  const [metricsWindow,setMetricsWindow] = useState<any[]>([]);
  const [wordStats,setWordStats] = useState<{levels?:any[]; categories?:any[]}>({});
  const [daily,setDaily] = useState<any>(null);
  const [showGoalsEdit,setShowGoalsEdit] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement|null>(null);
  const chatInputRef = useRef<HTMLInputElement|null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const { theme, toggle } = useTheme();
  const [showDetails,setShowDetails] = useState(false);
  const [showAllWords,setShowAllWords] = useState(false);
  const [showErrorProfile,setShowErrorProfile] = useState(false);

  useEffect(()=>{ if(!hydrated||!user) return; (async()=>{
    try { const res = await fetch(`${apiBase}/api/chat/channels`, { headers: authHeader() as Record<string,string> }); if(res.ok){ const d=await res.json(); if(d.success){ const list:Channel[] = d.channels.map((c:any)=>({id:c._id||c.id,title:c.title,updatedAt:c.updatedAt,createdAt:c.createdAt})); setChannels(list); const stored=localStorage.getItem('madlen-current-channel'); setCurrentChannel((stored && list.find(c=>c.id===stored))?stored:(list[0]?.id||null)); } } }
    catch(e:any){ toast.error(e.message||'Kanallar yüklenemedi'); }
    try { const wr = await fetch(`${apiBase}/api/words/${user.level}?limit=8`,{cache:'no-store'}); if(wr.ok){ const wd=await wr.json(); if(wd.success) setWords(wd.words);} } catch{}
    setPageLoading(false);
  })(); },[hydrated,user]);

  useEffect(()=>{ if(!currentChannel||!user){ setChat([]); return; } localStorage.setItem('madlen-current-channel', currentChannel); setChatLoading(true); (async()=>{ try { const r=await fetch(`${apiBase}/api/chat/channels/${currentChannel}`, { headers: authHeader() as Record<string,string> }); if(!r.ok) throw new Error('Mesajlar alınamadı'); const d=await r.json(); if(d.success) setChat(d.channel.messages); } catch(e:any){ toast.error(e.message||'Mesajlar alınamadı'); } finally { setChatLoading(false);} })(); },[currentChannel,user]);

  useEffect(()=>{ if(!user) return; (async()=>{ try { const r=await fetch(`${apiBase}/api/users/me`,{headers: authHeader() as Record<string,string>}); if(r.ok){ const d=await r.json(); if(d.success&&d.user) setAdaptiveStatus({buffer:d.user.levelBuffer||0,target:d.user.currentTargetStructure||'present_simple',dyn:d.user.dynamicLevel}); }
    try { const dbg=await fetch(`${apiBase}/api/users/me?debug=1`,{headers: authHeader() as Record<string,string>}); if(dbg.ok){ const jd=await dbg.json(); if(jd.success&&jd.user?.debugAdaptive?.metricsWindow) setMetricsWindow(jd.user.debugAdaptive.metricsWindow); } } catch{}
    const dr=await fetch(`${apiBase}/api/users/me/daily`,{headers: authHeader() as Record<string,string>}); if(dr.ok){ const dd=await dr.json(); if(dd.success) setDaily(dd.daily); }
    try { const ws=await fetch(`${apiBase}/api/words/stats/summary`); if(ws.ok){ const wj=await ws.json(); if(wj.success) setWordStats({levels:wj.levels,categories:wj.categories}); } } catch{}
  } catch{} })(); },[user]);

  useEffect(()=>{ const el=chatContainerRef.current; if(!el) return; requestAnimationFrame(()=>{ try{ el.scrollTop = el.scrollHeight; } catch{} }); },[chat,loading]);
  useEffect(()=>{ function key(e:KeyboardEvent){ if(e.ctrlKey&&(e.key==='k'||e.key==='K')){ e.preventDefault(); chatInputRef.current?.focus(); } if(e.key==='Escape'){ (document.activeElement as HTMLElement)?.blur(); } } window.addEventListener('keydown',key); return ()=> window.removeEventListener('keydown',key); },[]);

  async function createChannel(){ try { const r=await fetch(`${apiBase}/api/chat/channels`,{method:'POST',headers:{'Content-Type':'application/json',...(authHeader() as Record<string,string>)},body:JSON.stringify({title:'Yeni Sohbet'})}); const d=await r.json(); if(!d.success) throw new Error(d.message); const ch:Channel={id:d.channel.id,title:d.channel.title}; setChannels(c=>[ch,...c]); setCurrentChannel(ch.id); setChat([]);} catch(e:any){ toast.error(e.message||'Kanal oluşturulamadı'); } }
  async function deleteChannel(id:string){ if(!confirm('Bu sohbet kanalını silmek istiyor musun?')) return; try { const r=await fetch(`${apiBase}/api/chat/channels/${id}`,{method:'DELETE',headers:authHeader() as Record<string,string>}); const d=await r.json(); if(!d.success) throw new Error(d.message); setChannels(c=>c.filter(ch=>ch.id!==id)); if(currentChannel===id){ const next=channels.find(ch=>ch.id!==id)?.id||null; setCurrentChannel(next); setChat([]);} } catch(e:any){ toast.error(e.message||'Silinemedi'); } }
  async function sendMessage(){ if(!input.trim()||loading) return; const content=input.trim(); setChat(c=>[...c,{message:content,isUser:true}]); setInput(''); setLoading(true); try { const r=await fetch(`${apiBase}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json',...(authHeader() as Record<string,string>)},body:JSON.stringify({message:content,channelId:currentChannel,suggestedWords:words.slice(0,4).map(w=>w.word)})}); const d=await r.json(); if(!d.success) throw new Error(d.message); if(d.level&&d.dynamicLevel){ const store=useSessionStore.getState(); if(store.user) store.setSession(store.token!,{...store.user,level:d.level,dynamicLevel:d.dynamicLevel}); } if(!currentChannel && d.channelId) setCurrentChannel(d.channelId); setChannels(prev=>{ const id=d.channelId||currentChannel!; const ex=prev.find(c=>c.id===id); if(ex){ const updated=prev.map(c=>c.id===id?{...c,title:d.title||c.title,updatedAt:new Date().toISOString()}:c); const target=updated.find(c=>c.id===id)!; return [target,...updated.filter(c=>c.id!==id)]; } return [{id,title:d.title||'Yeni Sohbet',updatedAt:new Date().toISOString()},...prev]; }); setChat(c=>[...c,{message:d.response,isUser:false}]); } catch(e:any){ toast.error(e.message||'Sohbet hatası'); setChat(c=>c.slice(0,-1)); } finally { setLoading(false);} }

  if(!hydrated) return <PageLoader text="Uygulama yükleniyor..."/>;
  if(!user) return <PageLoader text="Oturum kontrol ediliyor..."/>;
  if(pageLoading) return <PageLoader text="Pano yükleniyor..."/>;

  const grammarSeries = metricsWindow.map(m=>m.grammar).filter((n:any)=>typeof n==='number');
  const vocabSeries = metricsWindow.map(m=>m.vocab).filter((n:any)=>typeof n==='number');
  const fluencySeries = metricsWindow.map(m=>m.fluency).filter((n:any)=>typeof n==='number');
  const lastMetric = metricsWindow.slice(-1)[0] || {} as any;
  const levelTotals = (wordStats.levels||[]).reduce((a:any,c:any)=> a + (c.count||0),0);

  return (
  <div className="flex h-screen overflow-hidden">
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-white/10 min-h-screen sticky top-0 px-5 py-8 gap-6 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-2">
          <Link href="/" className="text-sm font-semibold tracking-wide gradient-text">Madlen</Link>
          <button onClick={toggle} aria-label="Tema" className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 hover:border-primary/60">{theme==='dark'?'🌙':'🌞'}</button>
        </div>
        <nav className="flex flex-col gap-1 text-[12px]">
          <Link href="/dashboard" className="px-3 py-2 rounded-md hover:bg-white/5 transition text-soft-dynamic font-medium" aria-current="page">Pano</Link>
          <Link href="/learning" className="px-3 py-2 rounded-md hover:bg-white/5 transition text-soft-dynamic">Öğrenme</Link>
          <Link href="/progress" className="px-3 py-2 rounded-md hover:bg-white/5 transition text-soft-dynamic">İlerleme</Link>
        </nav>
        <div className="text-[10px] uppercase tracking-wider text-faint-dynamic mt-4">Metrikler</div>
        <div className="grid grid-cols-2 gap-3">
          <HeroDial label="Gramer" value={Number(lastMetric.grammar||0)/10} raw={Number(lastMetric.grammar||0)} colors={['#ec4899','#f9a8d4']} />
            <HeroDial label="Kelime" value={Number(lastMetric.vocab||0)/10} raw={Number(lastMetric.vocab||0)} colors={['#f59e0b','#fde68a']} />
            <HeroDial label="Akıcılık" value={Number(lastMetric.fluency||0)/10} raw={Number(lastMetric.fluency||0)} colors={['#10b981','#6ee7b7']} />
            <HeroDial label="Buffer" value={Math.min(1, Math.max(0, (adaptiveStatus.buffer+10)/20))} raw={adaptiveStatus.buffer} colors={['#6366f1','#a5b4fc']} suffix="" />
        </div>
        {daily && (
          <div className="mt-auto pt-4 border-t border-white/5 text-[11px] space-y-2">
            <div className="flex justify-between"><span className="text-white/40">Mesaj</span><span className="text-primary font-medium">{daily.progress.messages}/{daily.goals.messages}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Kelime</span><span className="text-primary font-medium">{daily.progress.words}/{daily.goals.words}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Streak</span><span className="text-primary font-semibold">🔥 {daily.streak}</span></div>
          </div>
        )}
      </aside>
  <main className="flex-1 h-screen px-4 md:px-6 py-4 flex flex-col overflow-hidden">
        {/* Üst Başlık */}
        <div className="mb-4 shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <Heading className="mb-1 text-base">Merhaba, {user.name.split(' ')[0]}</Heading>
        <div className="flex flex-wrap gap-3 items-center text-[11px] text-soft-dynamic">
          <span>Seviye <span className="text-primary font-medium">{user.level}</span>{user.dynamicLevel && user.dynamicLevel !== user.level && <span className="ml-1 text-faint-dynamic">({user.dynamicLevel})</span>}</span>
                <span className="flex items-center gap-1"><Gauge size={12} className="text-primary"/>Buf <span className={adaptiveStatus.buffer>=0?'text-primary':'text-red-400'}>{adaptiveStatus.buffer.toFixed(1)}</span></span>
                <span>Hedef <span className="text-primary font-medium">{adaptiveStatus.target}</span></span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-black/30 rounded-md px-3 py-2 border border-white/10 text-[11px]">
              <MetricNumber label="G" value={Number(lastMetric.grammar||0)} />
              <MetricNumber label="K" value={Number(lastMetric.vocab||0)} />
              <MetricNumber label="A" value={Number(lastMetric.fluency||0)} />
              <div className="h-6 w-px bg-white/10" />
              <div className="flex flex-col items-center"><span className="text-[9px] text-faint-dynamic">Aktif</span><span className="text-primary font-semibold text-xs">{levelTotals}</span></div>
              <button onClick={()=> setShowDetails(s=>!s)} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 hover:border-primary/60 flex items-center gap-1">{showDetails?<ChevronDown size={12}/>:<ChevronRight size={12}/>}Detay</button>
            </div>
          </div>
          {showDetails && (
            <div className="grid grid-cols-12 gap-3 animate-in fade-in slide-in-from-top-2">
              <Card className="col-span-3"><TrendMini title="Gramer" series={grammarSeries} color="#ec4899" /></Card>
              <Card className="col-span-3"><TrendMini title="Kelime" series={vocabSeries} color="#f59e0b" /></Card>
              <Card className="col-span-3"><TrendMini title="Akıcılık" series={fluencySeries} color="#10b981" /></Card>
              <Card className="col-span-3 flex flex-col justify-center px-4 py-3 gap-1 text-[11px]">
                {wordStats.levels && (
                  <div className="flex flex-wrap gap-1 max-h-14 overflow-auto custom-scroll">
                    {wordStats.levels.sort((a:any,b:any)=> a.level.localeCompare(b.level)).slice(0,10).map((l:any)=> <span key={l.level} className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-soft-dynamic text-[10px]">{l.level}:{l.count}</span>)}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
        {/* Alt Satır: Sohbet + Yan Kolon */}
        <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
          <Card className="col-span-8 flex flex-col min-h-0 relative">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <h2 className="font-semibold">AI Sohbet</h2>
              <div className="flex items-center gap-2 text-[11px]">
                <select value={currentChannel||''} onChange={e=> setCurrentChannel(e.target.value||null)} className="bg-black/40 border border-white/10 rounded px-2 py-1 focus:border-primary outline-none">
                  <option value="">Yeni Kanal</option>
                  {channels.map(c=> <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <button onClick={createChannel} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 hover:border-primary/60" aria-label="Yeni"><Plus size={12}/></button>
                {currentChannel && <button onClick={()=> deleteChannel(currentChannel)} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 hover:border-red-500/60" aria-label="Sil"><Trash2 size={12}/></button>}
              </div>
            </div>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scroll pb-20" aria-live="polite">
              {chatLoading && chat.length===0 && (
                <div className="flex flex-col gap-3 py-6">{Array.from({length:4}).map((_,i)=>(<div key={i} className={`h-10 w-2/3 rounded-md bg-gradient-to-r from-white/10 to-white/5 animate-pulse ${i%2?'ml-auto w-1/2':''}`}></div>))}</div>
              )}
              {chat.map((m,i)=>(
                <motion.div key={i} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed shadow-sm transition-colors ${m.isUser?'ml-auto bg-primary text-dark shadow-neon':'bg-[var(--bg-muted)] dark:bg-white/5 border border-[var(--border)] dark:border-white/10'}`}>
                  <MessageFormatter content={m.message} isUser={m.isUser} />
                </motion.div>
              ))}
              {loading && <div className="flex items-center gap-2 text-xs text-soft-dynamic"><LoadingSpinner size="sm" /><span>AI yazıyor...</span></div>}
              {!loading && !chatLoading && chat.length===0 && <div className="text-[11px] text-faint-dynamic pt-6">Henüz mesaj yok. Önerilen kelimelerden bazılarını kullan.</div>}
            </div>
            <div className="absolute left-0 right-0 bottom-0 p-2 bg-gradient-to-t from-black/70 via-black/40 to-transparent backdrop-blur-sm">
              <div className="flex gap-2">
                <input ref={chatInputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); } }} placeholder="Mesaj... (Ctrl+K)" className="flex-1 bg-[var(--bg-muted)]/80 dark:bg-black/60 border border-[var(--border)] dark:border-white/10 rounded-md px-2 py-2 text-[12px] focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors" aria-label="Mesaj" />
                <button onClick={sendMessage} disabled={loading||(!currentChannel && channels.length>6)} className="btn-primary w-10 h-10 rounded-md flex items-center justify-center focus:ring-2 focus:ring-primary/50 disabled:opacity-50" aria-label="Gönder">{loading ? <LoadingSpinner size="sm" /> : <Send size={16} />}</button>
              </div>
            </div>
          </Card>
          <div className="col-span-4 flex flex-col gap-4 min-h-0">
            <Card className="p-4 flex flex-col text-[11px] min-h-0">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-xs">Önerilen</h2>
                <button onClick={()=> setShowAllWords(s=>!s)} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 hover:border-primary/60">{showAllWords?'Azalt':'Tümü'}</button>
              </div>
              <div className="grid grid-cols-2 gap-2 overflow-auto pr-1 custom-scroll" style={{maxHeight: showAllWords? '100%':'150px'}}>
                {(showAllWords?words:words.slice(0,6)).map(w=>(
                  <div key={w._id} className="rounded-md p-2 border border-[var(--border)] dark:border-white/10 hover:border-primary/60 transition bg-[var(--bg-muted)]/60 dark:bg-black/40">
                    <div className="flex justify-between mb-0.5"><span className="font-medium text-primary-400 text-[11px]">{w.word}</span><span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary-200">{w.level}</span></div>
                    <p className="text-[10px] text-soft-dynamic line-clamp-2 leading-snug">{w.meaning}</p>
                  </div>
                ))}
              </div>
            </Card>
            {daily && (
              <Card className="p-4 text-[11px] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-xs">Günlük</h2>
                  <div className="flex items-center gap-2">
                    {daily.errorProfile && <button onClick={()=> setShowErrorProfile(s=>!s)} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 hover:border-primary/60">Hata</button>}
                    <button onClick={()=> setShowGoalsEdit(v=>!v)} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 hover:border-primary/60"><Settings2 size={11}/></button>
                  </div>
                </div>
                {!showGoalsEdit && (
                  <div className="space-y-1 text-soft-dynamic">
                    <GoalRow label="Mesaj" v={daily.progress.messages} g={daily.goals.messages} />
                    <GoalRow label="Kelime" v={daily.progress.words} g={daily.goals.words} />
                    <div className="flex justify-between items-center pt-1"><span>Streak</span><span className="text-primary font-semibold">{daily.streak}🔥</span></div>
                    {showErrorProfile && daily.errorProfile && (
                      <div className="grid grid-cols-2 gap-1 pt-1">
                        {Object.entries(daily.errorProfile).map(([k,v])=> <div key={k} className="flex items-center justify-between bg-black/30 rounded px-2 py-1 border border-white/5"><span>{k}</span><span className="text-primary font-medium">{v as any}</span></div>)}
                      </div>
                    )}
                  </div>
                )}
                {showGoalsEdit && <DailyGoalsForm apiBase={apiBase} initial={daily.goals} onUpdate={(g)=> setDaily((d:any)=>({...d,goals:g}))} />}
              </Card>
            )}
            <Card className="p-4 text-[11px]"><h2 className="font-semibold mb-1 text-xs">Motivasyon</h2><p className="text-soft-dynamic leading-snug">Her gün küçük adımlar büyük ivme yaratır.</p></Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function ProgressBar({ value, goal }: { value:number; goal:number }) {
  const pct = Math.min(100,(value/goal)*100);
  return <div className="h-2 w-full bg-black/40 rounded overflow-hidden relative"><div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70" style={{ width:pct+'%' }} /></div>;
}

function Sparkline({ data, height=40, stroke='#22d3ee' }: { data:number[]; height?:number; stroke?:string }) {
  if(!data||data.length===0) return <div className="h-[48px] flex items-center justify-center text-[10px] text-white/30">Veri yok</div>;
  const w=160; const min=Math.min(...data); const max=Math.max(...data); const range=(max-min)||1; const points=data.map((v,i)=>{ const x=(i/(data.length-1))*w; const y=height-((v-min)/range)*height; return `${x},${y}`; }).join(' ');
  return <svg viewBox={`0 0 ${w} ${height}`} className="w-full h-12 overflow-visible"><polyline fill="none" stroke={stroke} strokeWidth={2} points={points} strokeLinejoin="round" strokeLinecap="round" className="drop-shadow-[0_0_4px_rgba(255,255,255,0.15)]" />{data.map((v,i)=>{ const x=(i/(data.length-1))*w; const y=height-((v-min)/range)*height; return <circle key={i} cx={x} cy={y} r={2} fill={stroke} className="opacity-70" />; })}</svg>;
}

function HeroDial({ label, value, raw, colors, suffix='%' }: { label:string; value:number; raw:number; colors:[string,string]; suffix?:string }) {
  return <div className="group relative"><div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition" /><RadialMeter value={value} label={label} colorFrom={colors[0]} colorTo={colors[1]} size={90} stroke={9} precision={0} suffix={suffix}><span className="mt-1 text-[9px] text-white/40 font-medium">{raw.toFixed(1)}</span></RadialMeter></div>;
}

function TrendCard({ title, series, color }: { title:string; series:number[]; color:string }) {
  const min=series.length?Math.min(...series).toFixed(1):'-'; const max=series.length?Math.max(...series).toFixed(1):'-'; const avg=series.length?(series.reduce((a,b)=>a+b,0)/series.length).toFixed(1):'-';
  return <Card className="relative overflow-hidden"><div className="absolute inset-0 opacity-30 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" /><div className="flex items-center justify-between mb-2"><h3 className="font-medium text-sm">{title}</h3><span className="text-xs text-white/40">{series.length}p</span></div><Sparkline data={series} height={48} stroke={color} /><div className="mt-2 flex gap-3 text-[10px] text-white/40"><span>Min <span className="text-white/60">{min}</span></span><span>Max <span className="text-white/60">{max}</span></span><span>Ort <span className="text-white/60">{avg}</span></span></div></Card>;
}

function TrendMini({ title, series, color }:{title:string; series:number[]; color:string}){
  const last = series.length? series[series.length-1]: 0;
  const mini = series.slice(-12);
  return (
    <Card className="col-span-2 px-3 py-2 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-white/70">{title}</span>
        <span className="text-[10px] text-primary font-semibold">{typeof last==='number'? last.toFixed(1):'-'}</span>
      </div>
      <Sparkline data={mini} height={30} stroke={color} />
    </Card>
  );
}

function GoalRow({ label, v, g }:{label:string; v:number; g:number}){
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between"><span>{label}</span><span className="text-primary">{v}/{g}</span></div>
      <ProgressBar value={v} goal={g} />
    </div>
  );
}

function MetricNumber({ label, value }:{label:string; value:number}){
  return <div className="flex flex-col items-center min-w-[34px]"><span className="text-[9px] text-white/40">{label}</span><span className="text-primary font-semibold text-xs leading-tight">{value.toFixed(1)}</span></div>;
}
