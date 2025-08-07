# Madlen - English Learning Platform

Lise öğrencileri için yapay zeka destekli İngilizce öğrenme platformu. Bu proje, kişileştirilmiş öğrenme deneyimi sunmak için geliştirildi.

## Proje Hakkında

Bu platform, lise çağındaki öğrencilerin İngilizce seviyelerini belirleyip, kendi seviyelerine uygun kelimeler öğrenmelerini ve AI tutor ile konuşma pratiği yapmalarını sağlıyor.

### Neden Bu Proje?
- Öğrencilerin bireysel öğrenme hızlarına uyum sağlamak
- Geleneksel eğitim yöntemlerini teknoloji ile desteklemek  
- İngilizce konuşma pratiği için güvenli bir ortam sunmak

## Kurulum

### Gereksinimler
- Node.js (18 ve üzeri)
- MongoDB (lokal veya Atlas)
- OpenRouter API anahtarı

### Backend Kurulumu
```bash
cd server
npm install
cp .env.example .env
# .env dosyasında gerekli ayarları yapın
npm run dev
```

Database'i test verileri ile doldurmak için:
```bash
npm run seed
```

## Özellikler

### 🎯 Seviye Belirleme Sistemi
- Başlangıçta 5 soruluk hızlı test
- A1, A2, B1 seviyelerine göre otomatik sınıflandırma
- İlerlemeye göre seviye güncellemesi

### 📖 Kelime Öğrenme
- Seviyeye uygun kelime setleri
- Türkçe çevirileri ve örnek cümleler
- Sesli telaffuz desteği (gelecek güncelleme)
- Öğrenme ilerlemesi takibi

### 🤖 AI Öğretmen
- OpenRouter AI entegrasyonu
- Seviyeye özel konuşma tarzı
- Anlık geri bildirim ve düzeltmeler
- Konuşma geçmişi kaydı

### � İlerleme Takibi
- Günlük öğrenme hedefleri
- Streak (süreklilik) sistemi  
- Öğrenilen kelime istatistikleri
- Seviye ilerleme grafiği

## Teknoloji Stack

**Backend:**
- Express.js (Node.js framework)
- MongoDB (veritabanı)
- Mongoose (ODM)
- OpenRouter AI API

**Planlanan Frontend:**
- Next.js
- TailwindCSS
- TypeScript

## API Dokümantasyonu

### Kimlik Doğrulama
- `POST /api/auth/register` - Yeni kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi  
- `POST /api/auth/level-test` - Seviye testi sonucu kaydetme

### Kullanıcı İşlemleri
- `GET /api/users/:id` - Kullanıcı profili getirme
- `PUT /api/users/:id/progress` - İlerleme güncelleme
- `POST /api/users/:id/learn-word` - Kelime öğrenildi olarak işaretleme

### Kelime Yönetimi
- `GET /api/words/:level` - Seviyeye göre kelimeler
- `GET /api/words/search/:query` - Kelime arama
- `GET /api/words` - Tüm kelimeler (filtreleme ile)

### AI Chat
- `POST /api/chat` - AI ile konuşma
- `GET /api/users/:id/chat-history` - Sohbet geçmişi

## Veritabanı Yapısı

### User Schema
- Temel bilgiler (isim, email)
- Seviye bilgileri (A1/A2/B1)
- İlerleme istatistikleri
- Öğrenilen kelimeler listesi
- Chat geçmişi

### Word Schema  
- İngilizce kelime ve anlamı
- Türkçe çevirisi
- Örnek cümleler
- Seviye sınıflandırması
- Kategori (günlük, akademik, etc.)
- Zorluk seviyesi

## Geliştirme Planları

- [ ] Frontend (Next.js) geliştirmesi
- [ ] Ses telaffuz özelliği
- [ ] Quiz sistemi
- [ ] Başarı rozetleri
- [ ] Sosyal özellikler (arkadaş ekleme)
- [ ] Mobil uygulama

## Katkıda Bulunma

Bu proje eğitim amaçlı geliştirilmektedir. Öneri ve katkılarınız için issue açabilirsiniz.

## Lisans

MIT
