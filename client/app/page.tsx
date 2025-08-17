import { AuthForm } from '../components/auth-form';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* Layered gradient & pattern background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,195,0,0.18),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(255,195,0,0.12),transparent_65%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] [background-size:60px_60px]" />
        <div className="absolute -top-40 -left-56 w-[38rem] h-[38rem] bg-primary/20 rounded-full blur-3xl mix-blend-overlay" />
        <div className="absolute top-1/3 -right-60 w-[44rem] h-[44rem] bg-primary/10 rounded-full blur-3xl mix-blend-overlay" />
      </div>

      {/* Hero Section (Creative) */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 md:pt-32 pb-24 md:pb-32 lg:pt-24 flex flex-col gap-16 sm:gap-20">
        <div className="grid lg:grid-cols-12 gap-10 sm:gap-14 items-start">
          <div className="lg:col-span-7 space-y-8 sm:space-y-10 relative">
            {/* Floating decorative shapes (hidden on very small screens) */}
            <div aria-hidden className="hidden sm:block absolute -top-24 -left-16 w-40 h-40 rounded-3xl bg-gradient-to-br from-primary/40 to-primary/0 rotate-12 blur-2xl animate-float-slow" />
            <div aria-hidden className="hidden md:block absolute -bottom-20 -right-10 w-56 h-56 rounded-full bg-gradient-to-tr from-primary/30 to-primary/0 blur-2xl animate-float-medium" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/15 backdrop-blur-md shadow-sm pulse-ring relative text-soft-dynamic dark:text-white/80">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              Beta • Erken Geri Bildirim Programı
            </div>
            <h1 className="text-3xl sm:text-4xl xl:text-6xl font-extrabold tracking-tight leading-[1.08] sm:leading-[1.05]">
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-600 dark:from-white dark:via-white dark:to-white/70">İngilizceyi</span>{' '}
              <span className="relative inline-block">
                <span className="text-primary drop-shadow-[0_0_18px_rgba(255,196,0,0.45)]">Konuşarak</span>
                <span className="absolute -bottom-3 left-0 h-2 w-full bg-gradient-to-r from-primary/70 to-transparent rounded-full blur-sm opacity-60" aria-hidden />
              </span>{' '}
              Öğren.
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-soft-dynamic max-w-xl leading-relaxed">
              Madlen; seviyeni saniyeler içinde tespit eder, her konuşmayı hedef kelimelerinle zenginleştirir ve unutma eğrin oluşmadan tekrar ettirir. Oyun hissi veren mikro görevlerle motivasyonu sürekli canlı tutar.
            </p>
            {/* Feature bullets styled as timeline */}
            <div className="space-y-4 sm:space-y-5">
              {[
                { h: 'Anında Seviye Haritalama', d: 'İlk mesajlarından dil profilini çıkarır.' },
                { h: 'Anlamsal Hata Analizi', d: 'Yanlışlarını anlam temelli gruplar, hedefli dönüt verir.' },
                { h: 'Adaptif Kelime Tekrarı', d: 'Spaced repetition + bağlamsal kullanım senaryoları.' },
                { h: 'Gündelik Akış', d: '5 dakikalık mikro oturumlarla sürdürülebilir ilerleme.' },
              ].map((f,i) => (
                <div key={f.h} className="relative pl-7 group">
                  <span className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-primary shadow-[0_0_0_4px_rgba(255,196,0,0.15)] group-hover:scale-110 transition" />
                  <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-base-dynamic dark:text-white/90">{f.h}</h3>
                  <p className="text-[11px] sm:text-xs text-soft-dynamic dark:text-white/50 mt-0.5">{f.d}</p>
                  {i < 3 && <span className="absolute left-[5px] top-4 w-px h-10 bg-gradient-to-b from-primary/40 to-transparent" aria-hidden />}
                </div>
              ))}
            </div>
          </div>

          {/* Auth + Live sample panel */}
          <div className="lg:col-span-5 relative space-y-8">
            <div className="absolute -top-14 -right-6 w-48 h-48 bg-primary/30 blur-3xl rounded-full" aria-hidden />
            <div className="relative glass rounded-2xl shadow-xl p-8 border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0">
              <h2 className="font-semibold text-xl mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-primary/80 text-neutral-900 text-xs font-bold flex items-center justify-center">∞</span>
                Hemen Başla
              </h2>
              <p className="text-xs sm:text-sm text-soft-dynamic dark:text-white/50 mb-6">Dakikalar içinde hesabını oluştur veya giriş yap. Ücretsiz deneme.</p>
              <AuthForm />
              <p className="text-[10px] leading-relaxed text-faint-dynamic dark:text-white/40 mt-6">
                Dev mod: Chat API anahtarı olmadan demo cevapları döner. Kaydolduğunda kullanım koşullarını kabul etmiş sayılırsın.
              </p>
            </div>
            {/* Mini live conversation mock (hidden on mobile for compactness) */}
            <div className="hidden md:block relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md p-5 text-xs font-mono text-soft-dynamic dark:text-white/70 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-2 mb-4 text-[10px] uppercase tracking-widest text-faint-dynamic dark:text-white/40">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" /> Canlı Sohbet Önizleme
              </div>
              <ul className="space-y-3">
                <li className="flex gap-2"><span className="text-primary">ÖĞR:</span><span>Yesterday I go to museum.</span></li>
                <li className="flex gap-2"><span className="text-emerald-500">AI:</span><span className="leading-snug">"go" yerine "went" kullanmalısın. Hadi doğru cümleyi kur: <em className="not-italic text-base-dynamic dark:text-white/90">Yesterday I went to the museum.</em></span></li>
                <li className="flex gap-2"><span className="text-primary">ÖĞR:</span><span>Yesterday I went to the museum. It was very interesting!</span></li>
                <li className="flex gap-2"><span className="text-emerald-500">AI:</span><span className="leading-snug">Harika! "very interesting" yerine bazen <span className="text-primary">"fascinating"</span> da kullanabilirsin.</span></li>
              </ul>
              <div className="mt-5 flex items-center gap-2 text-[10px] text-faint-dynamic dark:text-white/40"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" /> adaptif_feedback.ts • v0.3</div>
            </div>
          </div>
        </div>

        {/* Mobile conversation preview collapsible */}
        <details className="md:hidden group rounded-xl border border-white/10 bg-black/20 backdrop-blur-md overflow-hidden">
          <summary className="list-none cursor-pointer flex items-center justify-between px-5 py-3 text-xs text-soft-dynamic dark:text-white/60 font-medium select-none">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Canlı Sohbet Önizleme</span>
            <span className="transition group-open:rotate-180 text-white/40">▾</span>
          </summary>
          <div className="px-5 pb-5 pt-1 text-[11px] font-mono text-soft-dynamic dark:text-white/70 space-y-3">
            <div><span className="text-primary mr-2">ÖĞR:</span>Yesterday I go to museum.</div>
            <div><span className="text-emerald-400 mr-2">AI:</span>"go" yerine "went" kullanmalısın. Doğrusu: <em className="not-italic text-white/90">Yesterday I went to the museum.</em></div>
            <div><span className="text-primary mr-2">ÖĞR:</span>Yesterday I went to the museum. It was very interesting!</div>
            <div><span className="text-emerald-400 mr-2">AI:</span>Harika! "fascinating" alternatifini de kullanabilirsin.</div>
            <div className="pt-2 text-[10px] text-faint-dynamic dark:text-white/40 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" /> adaptif_feedback.ts • v0.3</div>
          </div>
        </details>
      </section>

      {/* Logo / Trust Bar */}
      <section className="relative py-14 bg-gradient-to-b from-transparent via-white/5 to-transparent">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-8">
          <p className="text-xs uppercase tracking-widest text-faint-dynamic dark:text-white/40 font-semibold">Güvenle Öğren</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6 items-center opacity-70">
            {['Cambridge','Oxford','TOEFL','IELTS','CEFR','PISA'].map(b => (
              <div key={b} className="text-[10px] sm:text-xs md:text-sm font-semibold tracking-wide py-3 rounded-md bg-white/5 border border-white/10 backdrop-blur-sm">
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="relative max-w-7xl mx-auto px-6 py-28 space-y-20">
        <div className="max-w-3xl space-y-5">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Öğrenme Deneyimini Nasıl Dönüştürüyoruz?</h2>
          <p className="text-soft-dynamic dark:text-white/60 text-lg">Adaptif kelime hafızası + konuşma tabanlı pekiştirme + motivasyon odaklı ilerleme tasarımı.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: 'Adaptif Seviye Testi', desc: 'İlk dakikalarda seviyeni belirler ve içerikleri otomatik uyumlar.', icon: '⚡', color: 'from-primary/30 to-primary/5' },
            { title: 'Konuşarak Öğren', desc: 'Gerçek zamanlı sohbetler ile hedef kelimeleri doğal bağlamda pekiştir.', icon: '🗣️', color: 'from-emerald-400/30 to-emerald-400/0' },
            { title: 'Tekrar Algoritması', desc: 'Unutma eğrisine göre kelimeleri zamanında tekrar ettirir.', icon: '📌', color: 'from-indigo-400/30 to-indigo-400/0' },
            { title: 'Ölçülebilir İlerleme', desc: 'Günlük / haftalık hedefler ve streak sistemi ile motivasyon.', icon: '🎯', color: 'from-fuchsia-400/30 to-fuchsia-400/0' },
            { title: 'Anlam Odaklı Öğrenme', desc: 'AI, yanlışlarını semantik olarak anlar ve spesifik geri bildirim verir.', icon: '🧬', color: 'from-cyan-400/30 to-cyan-400/0' },
            { title: 'Güvenli & Gizli', desc: 'Verilerin sadece öğrenme deneyimini iyileştirmek için işlenir.', icon: '🔐', color: 'from-rose-400/30 to-rose-400/0' },
          ].map(f => (
            <div key={f.title} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 flex flex-col gap-4 hover:border-primary/40 transition">
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br ${f.color}`} aria-hidden />
              <div className="relative w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shadow">
                <span aria-hidden>{f.icon}</span>
              </div>
              <h3 className="relative font-semibold text-lg tracking-tight">{f.title}</h3>
              <p className="relative text-sm text-soft-dynamic dark:text-white/60 leading-relaxed">{f.desc}</p>
              <span className="relative mt-auto text-xs font-medium inline-flex items-center gap-1 text-primary/80 group-hover:gap-2 transition">Daha Fazla <span aria-hidden>→</span></span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative max-w-6xl mx-auto px-6 pb-40">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-10 md:p-16 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,196,0,0.2),transparent_70%)]" aria-hidden />
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Okulun İçin Pilot Programı Başlat</h2>
          <p className="text-soft-dynamic dark:text-white/60 max-w-2xl mx-auto text-lg mb-10">Eğitim kadron için sınıf bazlı analiz ve ilerleme raporları. İlk döneme özel sınırlı kontenjan.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="#" className="btn-primary px-8 h-12 rounded-full font-semibold shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_16px_-2px_rgba(0,0,0,0.4),0_0_28px_-2px_rgba(255,196,0,0.55)]">İletişime Geç</Link>
            <Link href="#" className="btn-outline px-8 h-12 rounded-full font-semibold">Dokümantasyon</Link>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
  <footer className="relative border-t border-white/10 py-8 text-center text-xs text-faint-dynamic dark:text-white/40">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <p>&copy; {new Date().getFullYear()} Madlen • Tüm hakları saklıdır.</p>
          <nav className="flex gap-6 text-soft-dynamic dark:text-white/50">
            <Link href="#" className="hover:text-primary transition">Gizlilik</Link>
            <Link href="#" className="hover:text-primary transition">Kullanım</Link>
            <Link href="#" className="hover:text-primary transition">İletişim</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
