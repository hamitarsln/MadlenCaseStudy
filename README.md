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

## 10. Platform Bağımsız Çalıştırma (Windows / macOS / Linux)
### Seçenek A: Yerel (Node + MongoDB)
1. Node 20+ kurulu olmalı (macOS/Linux: nvm önerilir, Windows: nvm-windows veya resmi installer).
2. MongoDB 6+ (yerel servis) veya bir Atlas connection string kullanın.
3. Terminal 1:
```
cd server
npm install
cp .env.example .env   # Windows PowerShell: copy .env.example .env
npm run dev
```
4. Terminal 2:
```
cd client
npm install
cp .env.example .env.local  # yoksa oluştur
npm run dev
```
5. Tarayıcı: http://localhost:3000 (API: http://localhost:5000)

### Seçenek B: Docker Compose (Tüm işletim sistemlerinde tek komut)
Önkoşul: Docker Desktop (Windows/macOS) veya Docker Engine + docker compose plugin (Linux).
```
docker compose up -d --build
```
Ardından:
- Client: http://localhost:3000
- API Health: http://localhost:5000/health

Logları görmek:
```
docker compose logs -f server
docker compose logs -f client
```
Durdurmak / temizlemek:
```
docker compose down       # konteynerleri kapatır
docker compose down -v    # + persistent volume (mongo_data) siler
```

### Çok Mimarili (multi-arch) İmaj Oluşturma
Apple Silicon (arm64) + x86 uyumlu push için örnek:
```
docker buildx create --name madlenbuilder --use
docker buildx build --platform linux/amd64,linux/arm64 -t yourrepo/madlen-server:latest ./server --push
docker buildx build --platform linux/amd64,linux/arm64 -t yourrepo/madlen-client:latest ./client --push
```

### Ortam Değişkenleri Override
Compose dosyasında varsayılan env var. Kendi `.env` dosyanızı kök dizine ekleyip (`docker compose` otomatik okur) şu değerleri özelleştirebilirsiniz:
```
JWT_SECRET=...güçlü...
CLIENT_URL=http://localhost:3000
GEMINI_API_KEY=
```

### Geliştirme Sıcak Yenileme (Hot Reload)
Docker compose volume mount ile çalışıyor; Node modülleri container içinde tutuluyor. Değişiklik yaptığınızda server otomatik restart olur (nodemon). Production imaj için dev script yerine minimal start komutları tanımlanabilir.

### Windows Özel Notlar
- PowerShell'de `cp` yerine `Copy-Item` kullanabilirsiniz.
- Eğer 5000 portu doluysa `.env` içinde PORT değiştirip client `.env.local` dosyasında `NEXT_PUBLIC_API_URL` eşleştirin.
- Git Bash kullanırken `export NEXT_PUBLIC_API_URL=...` şeklinde geçici env set edebilirsiniz.

### macOS / Linux Notlar
- Dosya izinleri: Mongo volume klasörü root altında kalırsa izin hatası alırsanız kullanıcı mapping için ek ayar gerekebilir.
- `lsof -i :5000` ile port çakışması kontrol edin.

### Yayın (Deployment) Basit Öneri
- Reverse proxy (Nginx / Caddy) ile client (Next build output) ve API ayrıştır.
- Production için client Dockerfile'da `next build` + `next start` kullan (şu an dev mode). Basit değişiklik:
	- `RUN npm install && npm run build`
	- `CMD ["npm","run","start"]`
- Server için sadece production bağımlılıkları ve process manager (örn. `node index.js` yeterli) kullan.

## 11. Gelecek İyileştirmeler
- Otomatik test (supertest + jest) smoke flow.
- Health endpoint’e build git commit hash ekleme.
- CI pipeline (GitHub Actions) ile lint + test + çok mimarili imaj build.
