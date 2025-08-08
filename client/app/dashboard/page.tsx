"use client";
import { useEffect, useState } from 'react';
import { useSessionStore, authHeader } from '../../stores/session';
import { Heading, Card } from '../../components/theme-provider';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Send, Target, Flame, BookOpen, Plus, Trash2 } from 'lucide-react';

interface ChatMsg { message: string; isUser: boolean; timestamp?: string; }
interface Word { _id: string; word: string; meaning: string; translation: string; level: string; }
interface Channel { id: string; title: string; updatedAt?: string; createdAt?: string; }

export default function Dashboard() {
  const { user, hydrated } = useSessionStore();
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<string | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!hydrated || !user) return;
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

  async function createChannel() {
    try {
      const res = await fetch(`${apiBase}/api/chat/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeader() as Record<string,string>) },
        body: JSON.stringify({ title: 'New Chat' })
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
        body: JSON.stringify({ message: content, channelId: currentChannel })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      if (data.level && data.dynamicLevel) {
        // update session user object
        const store = useSessionStore.getState();
        if (store.user) {
          store.setSession(store.token!, { ...store.user, level: data.level });
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
          return [{ id, title: data.title || 'New Chat', updatedAt: new Date().toISOString() }, ...prev];
        }
      });
      setChat(c => [...c, { message: data.response, isUser: false }]);
    } catch (e: any) {
      toast.error(e.message || 'Chat error');
      setChat(c => c.slice(0, -1)); 
    } finally { setLoading(false); }
  }

  if (!hydrated) return <div className="p-10">Yükleniyor...</div>;
  if (!user) return <div className="p-10">Oturum yok.</div>;

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-16">
      <header className="flex flex-col md:flex-row gap-6 md:items-end justify-between mb-8">
        <div>
          <Heading className="mb-2">Merhaba, {user.name.split(' ')[0]}</Heading>
          <p className="text-white/60 text-sm">Seviye: <span className="text-primary font-medium">{user.level}</span></p>
        </div>
        <div className="grid grid-cols-3 gap-4 w-full md:w-auto text-center">
          <Stat icon={<Target size={18} />} label="Günlük" value={user.progress?.dailyGoal ?? 10} />
          <Stat icon={<Flame size={18} />} label="Streak" value={user.progress?.streak ?? 0} />
          <Stat icon={<BookOpen size={18} />} label="Kelimeler" value={user.progress?.wordsLearned ?? 0} />
        </div>
      </header>

      <div className="grid lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 flex flex-col h-[620px] overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Sohbetler</h2>
            <button onClick={createChannel} className="text-xs px-2 py-1 bg-primary text-black rounded flex items-center gap-1"><Plus size={14}/> Yeni</button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {channels.length === 0 && <div className="text-xs text-white/40 py-4">Henüz sohbet yok</div>}
            {channels.map(ch => (
              <div key={ch.id} className={`group relative text-xs rounded-md p-2 border cursor-pointer flex items-center gap-2 ${ch.id === currentChannel ? 'bg-primary text-black border-primary':'bg-black/30 border-white/10 hover:border-primary/40'}`} onClick={() => setCurrentChannel(ch.id)}>
                <span className="line-clamp-2 flex-1 text-left">{ch.title}</span>
                <button onClick={(e)=>{e.stopPropagation(); deleteChannel(ch.id);}} className="opacity-0 group-hover:opacity-100 text-black/50 hover:text-black transition">
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
              <motion.div key={i} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} className={`max-w-[80%] rounded-lg px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap ${m.isUser ? 'ml-auto bg-primary text-black shadow-neon':'bg-white/5 border border-white/10'}`}>{m.message}</motion.div>
            ))}
            {loading && <div className="text-xs text-white/40">Yazıyor...</div>}
          </div>
          <div className="mt-4 flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=> e.key==='Enter' && sendMessage()} placeholder="Soru sor veya konuş" className="flex-1 bg-black/40 border border-white/10 rounded-md px-3 py-3 focus:border-primary outline-none" />
            <button onClick={sendMessage} disabled={loading || !currentChannel && channels.length>6} title={!currentChannel && channels.length>6 ? 'Önce kanal oluştur' : ''} className="btn-primary w-12 h-12 rounded-md flex items-center justify-center">{loading ? '...' : <Send size={18} />}</button>
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-1">
          <Card>
            <h2 className="font-semibold mb-4">Önerilen Kelimeler</h2>
            <div className="grid grid-cols-2 gap-3">
              {words.map(w => (
                <div key={w._id} className="group bg-black/40 rounded-md p-3 border border-white/10 hover:border-primary/60 transition text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-primary-400">{w.word}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary-500/20 text-primary-200">{w.level}</span>
                  </div>
                  <p className="text-white/60 line-clamp-2">{w.meaning}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="font-semibold mb-2">Motivasyon</h2>
            <p className="text-sm text-white/70">Hedefini koru! Her gün az da olsa konuşarak ilerle. Yeni kelimeler sohbet içinde işaretlenecek.</p>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-black/40 rounded-xl px-4 py-3 border border-white/10">
      <div className="flex items-center justify-center gap-1 text-primary mb-1 text-xs">{icon}{label}</div>
      <div className="font-semibold text-lg">{value}</div>
    </div>
  );
}
