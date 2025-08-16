## 1. Özet
Case Study her mesajdan sonra gramer / kelime / akıcılık (0–10) skorları üretir, EMA ile yumuşatır ve seviye tamponu (buffer) üzerinden zorluk dengesini ayarlar. Amaç: Gereksiz karar yükü olmadan sürdürülebilir mikro ilerleme.

## 2. Temel Değer
- Dengeli seviye ilerleme (histerezis buffer)
- Anlık ama sakin metrikler (EMA)
- Bağlamsal kelime pekiştirme
- Günlük hedef ve streak motivasyonu
- Az fakat anlamlı gösterge seti

## 3. Özellik Özeti
Adaptasyon: Seviye testi, dinamik seviye, hedef yapı rotasyonu
Sohbet: Çoklu kanal, AI yanıt, kelime önerisi
Metrikler: Grammar / Vocab / Fluency / Buffer göstergeleri
Kelime: Seviye & kategori istatistikleri, otomatik ekleme
Günlük: Hedefler, ilerleme, hata profili, streak
Güvenlik: JWT, rate limit, CORS kontrolü

## 4. Adaptif Akış (Kısa)
Mesaj -> Heuristik skor -> EMA güncelle -> Buffer ayarı -> Gerekirse seviye / hedef yapı güncelle -> Metrik pencere güncelle -> Yanıt.

## 5. Mimari
Client: Next.js, React, TailwindCSS
Server: Node.js (Express), MongoDB (Mongoose)
State: JWT + Zustand
Logic: EMA + buffer histerezisi

## 6. Kurulum
Backend:
```bash
cd server
npm install
cp .env.example .env
npm run dev
```
Frontend:
```bash
cd client
npm install
cp .env.example .env.local
npm run dev
```
İsteğe bağlı seed:
```bash
cd server && npm run seed
```

## 7. Ortam Değişkenleri (Backend)
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/madlen
JWT_SECRET=değiştirin
CLIENT_URL=http://localhost:3000
GEMINI_API_KEY=...
```
Frontend:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## 8. Örnek Endpointler
| Endpoint | Amaç |
|----------|------|
| POST /api/auth/login | Kimlik doğrulama |
| GET /api/chat/channels | Kanallar |
| POST /api/chat | Mesaj + adaptif döngü |
| GET /api/users/me | Adaptif durum |
| GET /api/users/me/daily | Günlük hedefler |
| GET /api/words/stats/summary | Kelime istatistikleri |

## 9. Veri (Özet)
User: level, dynamicLevel, levelBuffer, currentTargetStructure, metricsWindow[], daily { goals, progress, streak, errorProfile }.
Word: word, meaning, translation, level, categories, flags (autoAdded, pendingReview).
Chat: channel, messages[]{ role, content, scores }.