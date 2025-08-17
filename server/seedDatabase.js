const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./models/User');
const Word = require('./models/Word');

const sampleWords = [
  // A1 Level
  { word: 'hello', meaning: 'a greeting', translation: 'merhaba', example: 'Hello, how are you?', exampleTranslation: 'Merhaba, nasılsın?', level: 'A1', partOfSpeech: 'interjection', category: 'daily' },
  { word: 'cat', meaning: 'a small domesticated animal', translation: 'kedi', example: 'The cat is sleeping.', exampleTranslation: 'Kedi uyuyor.', level: 'A1', partOfSpeech: 'noun', category: 'daily' },
  { word: 'book', meaning: 'printed pages bound together', translation: 'kitap', example: 'I am reading a book.', exampleTranslation: 'Bir kitap okuyorum.', level: 'A1', partOfSpeech: 'noun', category: 'academic' },
  { word: 'water', meaning: 'clear liquid', translation: 'su', example: 'I drink water every day.', exampleTranslation: 'Her gün su içerim.', level: 'A1', partOfSpeech: 'noun', category: 'daily' },
  { word: 'eat', meaning: 'consume food', translation: 'yemek', example: 'I eat breakfast at 8 AM.', exampleTranslation: 'Kahvaltıyı sabah 8\'de yerim.', level: 'A1', partOfSpeech: 'verb', category: 'daily' },
  { word: 'house', meaning: 'a building for living', translation: 'ev', example: 'My house is big.', exampleTranslation: 'Evim büyük.', level: 'A1', partOfSpeech: 'noun', category: 'daily' },
  { word: 'dog', meaning: 'domesticated animal', translation: 'köpek', example: 'The dog is playing.', exampleTranslation: 'Köpek oynuyor.', level: 'A1', partOfSpeech: 'noun', category: 'daily' },
  { word: 'good', meaning: 'of high quality', translation: 'iyi', example: 'This is a good movie.', exampleTranslation: 'Bu iyi bir film.', level: 'A1', partOfSpeech: 'adjective', category: 'daily' },
  { word: 'big', meaning: 'large in size', translation: 'büyük', example: 'The elephant is big.', exampleTranslation: 'Fil büyüktür.', level: 'A1', partOfSpeech: 'adjective', category: 'daily' },
  { word: 'small', meaning: 'little in size', translation: 'küçük', example: 'The mouse is small.', exampleTranslation: 'Fare küçüktür.', level: 'A1', partOfSpeech: 'adjective', category: 'daily' },

  // A2 Level
  { word: 'travel', meaning: 'go from one place to another', translation: 'seyahat etmek', example: 'I travel to work by bus.', exampleTranslation: 'İşe otobüsle seyahat ederim.', level: 'A2', partOfSpeech: 'verb', category: 'travel' },
  { word: 'interesting', meaning: 'arousing curiosity', translation: 'ilginç', example: 'The movie was very interesting.', exampleTranslation: 'Film çok ilginçti.', level: 'A2', partOfSpeech: 'adjective', category: 'daily' },
  { word: 'understand', meaning: 'comprehend', translation: 'anlamak', example: 'I understand the lesson.', exampleTranslation: 'Dersi anlıyorum.', level: 'A2', partOfSpeech: 'verb', category: 'academic' },
  { word: 'important', meaning: 'of great significance', translation: 'önemli', example: 'Health is important.', exampleTranslation: 'Sağlık önemlidir.', level: 'A2', partOfSpeech: 'adjective', category: 'daily' },
  { word: 'family', meaning: 'group of related people', translation: 'aile', example: 'My family is very supportive.', exampleTranslation: 'Ailem çok destekleyici.', level: 'A2', partOfSpeech: 'noun', category: 'family' },
  { word: 'study', meaning: 'learn about something', translation: 'çalışmak', example: 'I study English every day.', exampleTranslation: 'Her gün İngilizce çalışırım.', level: 'A2', partOfSpeech: 'verb', category: 'academic' },
  { word: 'problem', meaning: 'a difficult situation', translation: 'problem', example: 'We need to solve this problem.', exampleTranslation: 'Bu problemi çözmemiz gerekiyor.', level: 'A2', partOfSpeech: 'noun', category: 'daily' },
  { word: 'different', meaning: 'not the same', translation: 'farklı', example: 'These two books are different.', exampleTranslation: 'Bu iki kitap farklı.', level: 'A2', partOfSpeech: 'adjective', category: 'daily' },
  { word: 'computer', meaning: 'electronic device', translation: 'bilgisayar', example: 'I use my computer for work.', exampleTranslation: 'Bilgisayarımı iş için kullanırım.', level: 'A2', partOfSpeech: 'noun', category: 'technology' },
  { word: 'happy', meaning: 'feeling joy', translation: 'mutlu', example: 'I am happy today.', exampleTranslation: 'Bugün mutluyum.', level: 'A2', partOfSpeech: 'adjective', category: 'emotions' },

  // B1 Level
  { word: 'environment', meaning: 'natural world', translation: 'çevre', example: 'We must protect the environment.', exampleTranslation: 'Çevreyi korumalıyız.', level: 'B1', partOfSpeech: 'noun', category: 'nature' },
  { word: 'opportunity', meaning: 'chance for advancement', translation: 'fırsat', example: 'This is a great opportunity for you.', exampleTranslation: 'Bu senin için harika bir fırsat.', level: 'B1', partOfSpeech: 'noun', category: 'business' },
  { word: 'develop', meaning: 'grow or make progress', translation: 'geliştirmek', example: 'We need to develop new skills.', exampleTranslation: 'Yeni beceriler geliştirmemiz gerekiyor.', level: 'B1', partOfSpeech: 'verb', category: 'business' },
  { word: 'experience', meaning: 'practical knowledge', translation: 'deneyim', example: 'She has a lot of experience in teaching.', exampleTranslation: 'Öğretmenlikte çok deneyimi var.', level: 'B1', partOfSpeech: 'noun', category: 'business' },
  { word: 'relationship', meaning: 'connection between people', translation: 'ilişki', example: 'They have a good relationship.', exampleTranslation: 'İyi bir ilişkileri var.', level: 'B1', partOfSpeech: 'noun', category: 'family' },
  { word: 'communication', meaning: 'exchange of information', translation: 'iletişim', example: 'Good communication is essential.', exampleTranslation: 'İyi iletişim esastır.', level: 'B1', partOfSpeech: 'noun', category: 'business' },
  { word: 'challenge', meaning: 'difficult task', translation: 'meydan okuma', example: 'Learning a new language is a challenge.', exampleTranslation: 'Yeni bir dil öğrenmek bir meydan okumadır.', level: 'B1', partOfSpeech: 'noun', category: 'academic' },
  { word: 'analyze', meaning: 'examine in detail', translation: 'analiz etmek', example: 'We need to analyze the data carefully.', exampleTranslation: 'Verileri dikkatle analiz etmemiz gerekiyor.', level: 'B1', partOfSpeech: 'verb', category: 'academic' },
  { word: 'achievement', meaning: 'successful accomplishment', translation: 'başarı', example: 'Graduating was a great achievement.', exampleTranslation: 'Mezun olmak büyük bir başarıydı.', level: 'B1', partOfSpeech: 'noun', category: 'academic' },
  { word: 'responsibility', meaning: 'duty to deal with something', translation: 'sorumluluk', example: 'It is our responsibility to help others.', exampleTranslation: 'Başkalarına yardım etmek bizim sorumluluğumuzdur.', level: 'B1', partOfSpeech: 'noun', category: 'business' }
];

const sampleUsers = [
  {
    email: 'admin@madlen.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    level: 'B1',
    levelTestScore: 5,
    levelConfirmed: true
  },
  {
    email: 'student@example.com',
    password: 'student123',
    name: 'Test Student',
    role: 'user',
    level: 'A2',
    levelTestScore: 3,
    levelConfirmed: true,
    progress: {
      wordsLearned: 15,
      dailyGoal: 10,
      streak: 3,
      totalChatMessages: 25
    }
  }
];

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const reset = process.env.RESET_DB === 'true';
    if (reset) {
      console.log('RESET_DB=true -> clearing existing data...');
      await User.deleteMany({});
      await Word.deleteMany({});
    } else {
      console.log('RESET_DB not set -> keeping existing data, inserting missing docs only');
    }

    console.log('Seeding words...');
    let totalInserted = 0;
    for (const wordData of sampleWords) {
      try {
        const exists = await Word.findOne({ word: wordData.word });
        if (!exists) { await new Word(wordData).save(); totalInserted++; }
      } catch {}
    }
    try {
      const fs = require('fs');
      const path = require('path');
      const bulkPath = path.join(__dirname, 'data', 'words.bulk.json');
      if (fs.existsSync(bulkPath)) {
        const arr = JSON.parse(fs.readFileSync(bulkPath, 'utf8'));
        for (const w of arr) {
          try {
            const exists = await Word.findOne({ word: w.word });
            if (!exists) { await new Word(w).save(); totalInserted++; }
          } catch {}
        }
        console.log(`Bulk words loaded: ${arr.length}`);
      }
    } catch (e) { console.warn('Bulk word import skipped:', e.message); }
    console.log(`Total words inserted: ${totalInserted}`);

    console.log('Seeding users...');
    let userInserted = 0;
    for (const userData of sampleUsers) {
      const existing = await User.findOne({ email: userData.email });
      if (!existing) { await new User(userData).save(); userInserted++; }
    }
    console.log(`Seeded users inserted: ${userInserted}`);

    console.log('Database seeding completed successfully!');
    console.log('Sample users created:');
    console.log('- Admin: admin@madlen.com / admin123');
    console.log('- Student: student@example.com / student123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
