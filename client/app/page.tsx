import { AuthForm } from '../components/auth-form';

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* Background decorative */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[34rem] h-[34rem] rounded-full bg-primary/10 blur-3xl" />
      </div>
      <section className="max-w-6xl mx-auto px-6 pt-28 pb-32 grid md:grid-cols-2 gap-14 items-center">
        <div className="space-y-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            AI ile Güçlendirilmiş
            <br />
            <span className="text-primary">Kişisel İngilizce</span> Eğitimi
          </h1>
          <p className="text-lg leading-relaxed text-white/70 max-w-prose">
            Lise öğrencileri için tasarlanmış adaptif öğrenme. Seviyeni anlar, sohbet ederek öğretir, kelime hazineni takip eder.
          </p>
          <ul className="space-y-3 text-white/80 text-sm">
            <li className="flex gap-2"><span className="text-primary">◆</span> Seviye uyumlu dinamik sohbet</li>
            <li className="flex gap-2"><span className="text-primary">◆</span> Günlük kelime hedefleri ve ilerleme</li>
            <li className="flex gap-2"><span className="text-primary">◆</span> Akıllı kelime önerileri</li>
          </ul>
        </div>
        <div className="relative glass rounded-2xl shadow-xl p-8">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/30 blur-2xl rounded-full" />
          <h2 className="font-semibold text-xl mb-4">Hemen Başla</h2>
            <AuthForm />
          <p className="text-xs text-white/40 mt-6">Dev mod: Chat API anahtarı olmadan demo cevapları döner.</p>
        </div>
      </section>
    </main>
  );
}
