const mongoose = require('mongoose');
const Word = require('./models/Word');
require('dotenv').config();

const sampleWords = [
  {
    word: 'hello',
    meaning: 'A greeting used when meeting someone',
    translation: 'merhaba',
    example: 'Hello, how are you today?',
    exampleTranslation: 'Merhaba, bugün nasılsın?',
    level: 'A1',
    category: 'daily',
    partOfSpeech: 'interjection',
    difficulty: 1,
    pronunciation: '/həˈloʊ/',
    frequency: 100
  },
  {
    word: 'cat',
    meaning: 'A small domestic animal with fur and whiskers',
    translation: 'kedi',
    example: 'My cat likes to sleep on the sofa.',
    exampleTranslation: 'Kedim koltukta uyumayı sever.',
    level: 'A1',
    category: 'family',
    partOfSpeech: 'noun',
    difficulty: 1,
    pronunciation: '/kæt/',
    frequency: 85
  },
  {
    word: 'eat',
    meaning: 'To put food in your mouth and swallow it',
    translation: 'yemek',
    example: 'I eat breakfast at 8 AM.',
    exampleTranslation: 'Sabah 8\'de kahvaltı yaparım.',
    level: 'A1',
    category: 'food',
    partOfSpeech: 'verb',
    difficulty: 1,
    pronunciation: '/iːt/',
    frequency: 90
  },
  {
    word: 'house',
    meaning: 'A building where people live',
    translation: 'ev',
    example: 'This is my house.',
    exampleTranslation: 'Bu benim evim.',
    level: 'A1',
    category: 'daily',
    partOfSpeech: 'noun',
    difficulty: 1,
    pronunciation: '/haʊs/',
    frequency: 88
  },
  {
    word: 'happy',
    meaning: 'Feeling joy or pleasure',
    translation: 'mutlu',
    example: 'I am happy to see you.',
    exampleTranslation: 'Seni gördüğüm için mutluyum.',
    level: 'A1',
    category: 'emotions',
    partOfSpeech: 'adjective',
    difficulty: 1,
    pronunciation: '/ˈhæpi/',
    frequency: 82
  },

  {
    word: 'important',
    meaning: 'Having great significance or value',
    translation: 'önemli',
    example: 'It is important to study English every day.',
    exampleTranslation: 'Her gün İngilizce çalışmak önemlidir.',
    level: 'A2',
    category: 'academic',
    partOfSpeech: 'adjective',
    difficulty: 2,
    pronunciation: '/ɪmˈpɔːrtənt/',
    frequency: 95
  },
  {
    word: 'different',
    meaning: 'Not the same as another',
    translation: 'farklı',
    example: 'We have different opinions about this topic.',
    exampleTranslation: 'Bu konuda farklı görüşlerimiz var.',
    level: 'A2',
    category: 'academic',
    partOfSpeech: 'adjective',
    difficulty: 2,
    pronunciation: '/ˈdɪfərənt/',
    frequency: 91
  },
  {
    word: 'travel',
    meaning: 'To go from one place to another',
    translation: 'seyahat etmek',
    example: 'I love to travel to new countries.',
    exampleTranslation: 'Yeni ülkelere seyahat etmeyi seviyorum.',
    level: 'A2',
    category: 'travel',
    partOfSpeech: 'verb',
    difficulty: 2,
    pronunciation: '/ˈtrævəl/',
    frequency: 78
  },
  {
    word: 'computer',
    meaning: 'An electronic device for processing data',
    translation: 'bilgisayar',
    example: 'I use my computer for work and entertainment.',
    exampleTranslation: 'Bilgisayarımı iş ve eğlence için kullanırım.',
    level: 'A2',
    category: 'technology',
    partOfSpeech: 'noun',
    difficulty: 2,
    pronunciation: '/kəmˈpjuːtər/',
    frequency: 89
  },
  {
    word: 'healthy',
    meaning: 'In good physical condition',
    translation: 'sağlıklı',
    example: 'Eating vegetables helps you stay healthy.',
    exampleTranslation: 'Sebze yemek sağlıklı kalmanıza yardımcı olur.',
    level: 'A2',
    category: 'health',
    partOfSpeech: 'adjective',
    difficulty: 2,
    pronunciation: '/ˈhelθi/',
    frequency: 76
  },

  {
    word: 'achievement',
    meaning: 'Something accomplished successfully',
    translation: 'başarı, kazanım',
    example: 'Graduating from university was a great achievement.',
    exampleTranslation: 'Üniversiteden mezun olmak büyük bir başarıydı.',
    level: 'B1',
    category: 'academic',
    partOfSpeech: 'noun',
    difficulty: 3,
    pronunciation: '/əˈtʃiːvmənt/',
    frequency: 68
  },
  {
    word: 'environment',
    meaning: 'The natural world around us',
    translation: 'çevre',
    example: 'We need to protect the environment for future generations.',
    exampleTranslation: 'Gelecek nesiller için çevreyi korumalıyız.',
    level: 'B1',
    category: 'nature',
    partOfSpeech: 'noun',
    difficulty: 3,
    pronunciation: '/ɪnˈvaɪrənmənt/',
    frequency: 72
  },
  {
    word: 'opportunity',
    meaning: 'A chance for advancement or progress',
    translation: 'fırsat',
    example: 'This internship is a great opportunity to learn.',
    exampleTranslation: 'Bu staj öğrenmek için harika bir fırsat.',
    level: 'B1',
    category: 'business',
    partOfSpeech: 'noun',
    difficulty: 3,
    pronunciation: '/ˌɑːpərˈtuːnəti/',
    frequency: 74
  },
  {
    word: 'influence',
    meaning: 'The power to affect someone or something',
    translation: 'etki, nüfuz',
    example: 'Social media has a strong influence on young people.',
    exampleTranslation: 'Sosyal medyanın gençler üzerinde güçlü bir etkisi var.',
    level: 'B1',
    category: 'academic',
    partOfSpeech: 'noun',
    difficulty: 3,
    pronunciation: '/ˈɪnfluəns/',
    frequency: 70
  },
  {
    word: 'responsibility',
    meaning: 'A duty or task that you are required to do',
    translation: 'sorumluluk',
    example: 'It is our responsibility to take care of our planet.',
    exampleTranslation: 'Gezegenimizle ilgilenmek bizim sorumluluğumuz.',
    level: 'B1',
    category: 'academic',
    partOfSpeech: 'noun',
    difficulty: 3,
    pronunciation: '/rɪˌspɑːnsəˈbɪləti/',
    frequency: 69
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');
    await Word.deleteMany({});
    console.log('🗑️ Cleared existing words');

    await Word.insertMany(sampleWords);
    console.log(`✅ Successfully inserted ${sampleWords.length} sample words`);

    const stats = await Word.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    console.log('📊 Words by level:');
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} words`);
    });

    mongoose.disconnect();
    console.log('✅ Database seeding completed successfully');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, sampleWords };
