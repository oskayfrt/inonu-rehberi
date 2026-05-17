import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import http from 'node:http';
import https from 'node:https';

const { Pool } = pg;

const app = express();
const port = Number(process.env.PORT || 3001);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173';
const allowedOrigins = new Set([
  clientOrigin,
  'http://127.0.0.1:5173',
  'http://localhost:5173',
]);
if (process.env.VERCEL_URL) {
  allowedOrigins.add(`https://${process.env.VERCEL_URL}`);
}
const externalEventSyncEnabled = process.env.ENABLE_EXTERNAL_EVENT_SYNC !== 'false';
const externalEventSyncIntervalMs = Number(process.env.EVENT_SYNC_INTERVAL_MINUTES || 60) * 60 * 1000;
const ticketmasterApiKey = process.env.TICKETMASTER_API_KEY || '';
let lastExternalEventSyncAt = 0;
let externalEventSyncPromise = null;

const departmentPostCategories = ['course-tip', 'elective-review', 'academic-tip'];
const globalPostCategories = ['campus-tip', 'student-affairs', 'general'];
const campusMapUrl = 'https://harita.inonu.edu.tr/others';

const defaultEventImages = [
  'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
];

function pickDefaultEventImage(category = '') {
  const normalized = String(category || '').toLocaleLowerCase('tr-TR');

  if (normalized.includes('kariyer') || normalized.includes('fuar')) return defaultEventImages[1];
  if (normalized.includes('proje') || normalized.includes('tübitak') || normalized.includes('teknoloji')) return defaultEventImages[2];
  if (normalized.includes('konser')) return defaultEventImages[3];
  if (normalized.includes('kültür') || normalized.includes('sanat')) return defaultEventImages[4];
  if (normalized.includes('malatya')) return defaultEventImages[5];

  return defaultEventImages[Math.floor(Math.random() * defaultEventImages.length)];
}

function getDatabaseConfig() {
  if (!process.env.DATABASE_URL) {
    return {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || 'inonu_kampus_rehberi',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
    };
  }

  const isLocalDatabase = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

  return {
    connectionString: process.env.DATABASE_URL,
    options: '-c search_path=public',
    ...(isLocalDatabase ? {} : { ssl: { rejectUnauthorized: false } }),
  };
}

const pool = new Pool(
  getDatabaseConfig(),
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '12mb' }));

async function ensureSchemaCompatibility() {
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS year VARCHAR(20) DEFAULT '1'");
  await pool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_inonu_email");
  await pool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_inonu_email");
  await pool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_university_email");
  await pool.query(`
    ALTER TABLE users
    ADD CONSTRAINT chk_users_university_email
    CHECK (email::TEXT ~* '^[A-Z0-9._%+-]+@(ogr\\.)?inonu\\.edu\\.tr$')
  `);
  await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS course_name VARCHAR(180)");
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS faculty_id INT REFERENCES faculties(id) ON DELETE SET NULL");
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS department_id INT REFERENCES departments(id) ON DELETE SET NULL");
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS category VARCHAR(80) DEFAULT 'info' NOT NULL");
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false NOT NULL");
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS source VARCHAR(80) DEFAULT 'local' NOT NULL");
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS source_url TEXT");
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS external_id VARCHAR(300)");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS idx_announcements_source_external_id ON announcements(source, external_id) WHERE external_id IS NOT NULL");
  await pool.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS event_time VARCHAR(50)");
  await pool.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS source VARCHAR(80) DEFAULT 'local' NOT NULL");
  await pool.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS source_url TEXT");
  await pool.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT");
  await pool.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS external_id VARCHAR(300)");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS idx_events_source_external_id ON events(source, external_id) WHERE external_id IS NOT NULL");
  await pool.query("ALTER TABLE lost_found_items ADD COLUMN IF NOT EXISTS item_date DATE");
  await pool.query("ALTER TABLE lost_found_items ADD COLUMN IF NOT EXISTS image_url TEXT");
  await pool.query("ALTER TABLE lost_found_items DROP CONSTRAINT IF EXISTS chk_lost_found_inonu_email");
  await pool.query("ALTER TABLE lost_found_items DROP CONSTRAINT IF EXISTS chk_lost_found_university_email");
  await pool.query(`
    ALTER TABLE lost_found_items
    ADD CONSTRAINT chk_lost_found_university_email
    CHECK (contact_email::TEXT ~* '^[A-Z0-9._%+-]+@(ogr\\.)?inonu\\.edu\\.tr$')
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS department_change_requests (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      current_department_id INT REFERENCES departments(id) ON DELETE SET NULL,
      requested_department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      note TEXT,
      status VARCHAR(30) DEFAULT 'pending' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_department_change_status CHECK (status IN ('pending', 'approved', 'rejected'))
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blacklisted_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(150) UNIQUE NOT NULL,
      user_id INT,
      full_name VARCHAR(220),
      reason TEXT,
      created_by INT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_blacklisted_users_email ON blacklisted_users(email)");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS freshman_guide_cards (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT DEFAULT '',
      items TEXT[] DEFAULT '{}',
      location_label VARCHAR(200),
      location_url TEXT,
      icon VARCHAR(40) DEFAULT 'check',
      color VARCHAR(80) DEFAULT 'from-blue-500 to-blue-600',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_freshman_guide_cards_sort_order ON freshman_guide_cards(sort_order, id)");

  const guideCount = await pool.query('SELECT COUNT(*)::int AS count FROM freshman_guide_cards');
  if (guideCount.rows[0]?.count === 0) {
    const guideCards = [
      {
        title: 'İlk Hafta Kontrol Listesi',
        description: 'Kampüse yeni geldiğinde ilk tamamlaman gereken temel adımlar.',
        items: ['Öğrenci kartı ve e-posta hesabını kontrol et', 'OBS ders kayıt ekranını incele', 'Danışman hocanı ve bölüm sekreterliğini öğren', 'Yemekhane, kütüphane ve sağlık merkezi konumlarını kaydet', 'Topluluk tanıtım günlerini takip et'],
        locationLabel: 'Öğrenci İşleri konumu',
        locationUrl: campusMapUrl,
        icon: 'check',
        color: 'from-blue-500 to-blue-600',
        sortOrder: 1,
      },
      {
        title: 'Öğrenci Kartı',
        description: 'Kartını yemekhane, kütüphane ve kampüs girişlerinde kullanırsın.',
        items: ['Güncel vesikalık fotoğraf gerekebilir', 'Başvuru durumunu öğrenci işleri üzerinden takip et', 'Kart hazır olduğunda teslim noktasından al', 'Kaybolursa hemen öğrenci işlerine bildir'],
        locationLabel: 'Kart işlemleri konumu',
        locationUrl: campusMapUrl,
        icon: 'card',
        color: 'from-purple-500 to-purple-600',
        sortOrder: 2,
      },
      {
        title: 'Ders Kaydı',
        description: 'Ders kayıtlarını OBS üzerinden yapar, danışman onayıyla kesinleştirirsin.',
        items: ['Akademik takvimde kayıt tarihlerini kontrol et', 'Zorunlu ve seçmeli derslerini ayır', 'Çakışan dersleri danışmanınla konuş', 'Danışman onayı olmadan kayıt kesinleşmeyebilir'],
        locationLabel: 'OBS sistemi',
        locationUrl: 'https://obs.inonu.edu.tr/',
        icon: 'book',
        color: 'from-green-500 to-green-600',
        sortOrder: 3,
      },
      {
        title: 'Yemekhane ve Kafeterya',
        description: 'Günlük yemek, ödeme ve yoğun saat bilgilerini takip et.',
        items: ['Öğle saatlerinde sıra yoğun olabilir', 'Yemek menüsünü üniversite duyurularından kontrol et', 'Ödeme ve kart bakiyeni önceden kontrol et', 'Fakülte çevresindeki kafeteryaları ilk hafta keşfet'],
        locationLabel: 'Yemekhane konumu',
        locationUrl: campusMapUrl,
        icon: 'food',
        color: 'from-red-500 to-red-600',
        sortOrder: 4,
      },
      {
        title: 'Kütüphane ve Çalışma Alanları',
        description: 'Sessiz çalışma, kaynak ödünç alma ve araştırma için ilk uğrak yerlerinden biri.',
        items: ['Kütüphane üyeliğini aktifleştir', 'Çalışma salonlarının saatlerini kontrol et', 'Kitap iade tarihlerini takip et', 'Veritabanı erişimleri için kütüphane sayfasını incele'],
        locationLabel: 'Merkez Kütüphane konumu',
        locationUrl: campusMapUrl,
        icon: 'map',
        color: 'from-cyan-500 to-cyan-600',
        sortOrder: 5,
      },
      {
        title: 'Ulaşım ve Kampüs İçi Yön',
        description: 'Dersliklere, duraklara ve önemli birimlere daha hızlı ulaşmak için konumları kaydet.',
        items: ['Otobüs ve servis saatlerini güncel kaynaklardan kontrol et', 'Fakülte binanı ve laboratuvarlarını ilk hafta gez', 'Acil durumda güvenlik noktalarını öğren', 'Harita linklerini telefonuna kaydet'],
        locationLabel: 'Kampüs haritası',
        locationUrl: campusMapUrl,
        icon: 'map',
        color: 'from-amber-500 to-amber-600',
        sortOrder: 6,
      },
    ];

    for (const card of guideCards) {
      await pool.query(`
        INSERT INTO freshman_guide_cards (title, description, items, location_label, location_url, icon, color, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [card.title, card.description, card.items, card.locationLabel, card.locationUrl, card.icon, card.color, card.sortOrder]);
    }
  }

  await pool.query(`
    UPDATE freshman_guide_cards
    SET location_url = $1
    WHERE location_url LIKE 'https://www.google.com/maps/search/?api=1&query=%'
  `, [campusMapUrl]);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS experience_submissions (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE SET NULL,
      department_id INT REFERENCES departments(id) ON DELETE SET NULL,
      title VARCHAR(200) NOT NULL,
      category VARCHAR(80) NOT NULL,
      content TEXT NOT NULL,
      status VARCHAR(30) DEFAULT 'pending' NOT NULL,
      admin_note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_experience_submission_status CHECK (status IN ('pending', 'reviewed', 'published', 'archived'))
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_experience_submissions_status ON experience_submissions(status, created_at)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS content_reports (
      id SERIAL PRIMARY KEY,
      reporter_user_id INT REFERENCES users(id) ON DELETE SET NULL,
      post_id INT REFERENCES posts(id) ON DELETE SET NULL,
      reported_user_id INT REFERENCES users(id) ON DELETE SET NULL,
      reason VARCHAR(120) NOT NULL,
      details TEXT,
      post_title VARCHAR(220),
      post_content TEXT,
      reported_user_name VARCHAR(220),
      reported_user_email VARCHAR(150),
      status VARCHAR(30) DEFAULT 'pending' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMPTZ,
      CONSTRAINT chk_content_report_status CHECK (status IN ('pending', 'reviewed', 'dismissed', 'action_taken'))
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status, created_at)");
}

function isInonuEmail(email) {
  return /^[A-Z0-9._%+-]+@ogr\.inonu\.edu\.tr$/i.test(String(email || '').trim());
}

function isUniversityEmail(email) {
  return /^[A-Z0-9._%+-]+@(ogr\.)?inonu\.edu\.tr$/i.test(String(email || '').trim());
}

function splitFullName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { name: 'Öğrenci', surname: '-' };
  }

  if (parts.length === 1) {
    return { name: parts[0], surname: '-' };
  }

  return {
    name: parts.slice(0, -1).join(' '),
    surname: parts.at(-1),
  };
}

function mapUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    fullName: `${row.name} ${row.surname}`.replace(/\s+-$/, '').trim(),
    email: row.email,
    departmentId: row.department_id,
    department: row.department_name || '',
    year: row.year || '1',
    role: row.role,
  };
}

function mapPost(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    category: row.category,
    courseName: row.course_name || '',
    createdAt: row.created_at,
    departmentId: row.department_id,
    department: row.department_name,
    userName: `${row.user_name || ''} ${row.user_surname || ''}`.trim(),
  };
}

function mapEvent(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.event_date,
    time: row.event_time || '',
    location: row.location || '',
    category: row.category || 'Genel',
    organizer: row.organizer || '',
    source: row.source || 'local',
    sourceUrl: row.source_url || '',
    imageUrl: row.image_url || '',
    participants: 0,
  };
}

function mapAnnouncement(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    date: row.created_at,
    department: row.department_name || row.faculty_name || 'İnönü Üniversitesi',
    departmentId: row.department_id,
    faculty: row.faculty_name || 'İnönü Üniversitesi',
    facultyId: row.faculty_id,
    type: row.category || 'info',
    isPinned: row.is_pinned,
    source: row.source || 'local',
    sourceUrl: row.source_url || '',
  };
}

function mapFreshmanGuideCard(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    items: Array.isArray(row.items) ? row.items : [],
    locationLabel: row.location_label || '',
    locationUrl: row.location_url || '',
    icon: row.icon || 'check',
    color: row.color || 'from-blue-500 to-blue-600',
    sortOrder: row.sort_order || 0,
  };
}

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

async function requireAdmin(adminUserId) {
  const result = await pool.query('SELECT id, role FROM users WHERE id = $1', [Number(adminUserId)]);

  if (result.rows[0]?.role !== 'admin') {
    const error = new Error('Bu işlem için admin yetkisi gerekir.');
    error.statusCode = 403;
    throw error;
  }
}

async function findBlacklistedEmail(email) {
  const result = await pool.query(
    'SELECT id, reason FROM blacklisted_users WHERE email = LOWER($1)',
    [String(email || '').trim()],
  );

  return result.rows[0] || null;
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ouml;/g, 'ö')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&Ccedil;/g, 'Ç')
    .replace(/&scedil;/g, 'ş')
    .replace(/&Scedil;/g, 'Ş')
    .replace(/&gbreve;/g, 'ğ')
    .replace(/&Gbreve;/g, 'Ğ')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
}

function compactText(value = '') {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(h[1-6]|p|div|li|article|section|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function parseEventDate(text = '') {
  const normalized = String(text).replace(/\s+/g, ' ').trim();
  const iso = normalized.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dotted = normalized.match(/\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/);
  if (dotted) return `${dotted[3]}-${dotted[2].padStart(2, '0')}-${dotted[1].padStart(2, '0')}`;

  const months = {
    ocak: 1, oca: 1,
    şubat: 2, subat: 2, şub: 2, sub: 2,
    mart: 3, mar: 3,
    nisan: 4, nis: 4,
    mayıs: 5, mayis: 5, may: 5,
    haziran: 6, haz: 6,
    temmuz: 7, tem: 7,
    ağustos: 8, agustos: 8, ağu: 8, agu: 8,
    eylül: 9, eylul: 9, eyl: 9,
    ekim: 10, eki: 10,
    kasım: 11, kasim: 11, kas: 11,
    aralık: 12, aralik: 12, ara: 12,
  };

  const written = normalized.match(/\b(\d{1,2})\s+(Ocak|Oca|Şubat|Subat|Şub|Sub|Mart|Mar|Nisan|Nis|Mayıs|Mayis|May|Haziran|Haz|Temmuz|Tem|Ağustos|Agustos|Ağu|Agu|Eylül|Eylul|Eyl|Ekim|Eki|Kasım|Kasim|Kas|Aralık|Aralik|Ara)\s*(\d{2,4})?\b/i);
  if (!written) return null;

  const month = months[written[2].toLocaleLowerCase('tr-TR')];
  if (!month) return null;

  const now = new Date();
  let year = written[3] ? Number(written[3]) : now.getFullYear();
  if (year < 100) year += 2000;

  const date = `${year}-${String(month).padStart(2, '0')}-${written[1].padStart(2, '0')}`;
  if (!written[3] && date < now.toISOString().slice(0, 10)) {
    return `${year + 1}-${String(month).padStart(2, '0')}-${written[1].padStart(2, '0')}`;
  }

  return date;
}

function parseEventTime(text = '') {
  const match = String(text).match(/\b(\d{1,2})[:.](\d{2})(?:\s*[-–]\s*(\d{1,2})[:.](\d{2}))?/);
  if (!match) return '';
  const start = `${match[1].padStart(2, '0')}:${match[2]}`;
  const end = match[3] ? `${match[3].padStart(2, '0')}:${match[4]}` : '';
  return end ? `${start} - ${end}` : start;
}

const departmentPageSlugs = {
  'Tıp': 'tip',
  'Diş Hekimliği': 'dishekimligi',
  'Eczacılık': 'eczacilik',
  'Hemşirelik': 'hemsirelik',
  'Beslenme ve Diyetetik': 'beslenmevediyetetik',
  'Fizyoterapi ve Rehabilitasyon': 'fizyoterapi',
  'Çocuk Gelişimi': 'cocukgelisimi',
  'Ebelik': 'ebelik',
  'Bilgisayar Mühendisliği': 'bilgisayar',
  'Elektrik-Elektronik Mühendisliği': 'elektrikelektronik',
  'Gıda Mühendisliği': 'gida',
  'İnşaat Mühendisliği': 'insaat',
  'Makine Mühendisliği': 'makine',
  'Kimya Mühendisliği': 'kimyamuhendisligi',
  'Maden Mühendisliği': 'maden',
  'Yazılım Mühendisliği': 'yazilim',
  'Biyomedikal Mühendisliği': 'biyomedikal',
  'Biyoloji': 'biyoloji',
  'Fizik': 'fizik',
  'Kimya': 'kimya',
  'Matematik': 'matematik',
  'Sosyoloji': 'sosyoloji',
  'Tarih': 'tarih',
  'Türk Dili ve Edebiyatı': 'turkdiliveedebiyati',
  'İngiliz Dili ve Edebiyatı': 'ingilizedebiyati',
  'İşletme': 'isletme',
  'İktisat': 'iktisat',
  'Siyaset Bilimi ve Kamu Yönetimi': 'siyasetbilimi',
  'Siyaset Bilimi ve Uluslararası İlişkiler': 'uluslararasiiliskiler',
  'Çalışma Ekonomisi ve Endüstri İlişkileri': 'calismaekonomisi',
  'Ekonometri': 'ekonometri',
  'Maliye': 'maliye',
  'Uluslararası Ticaret ve İşletmecilik': 'uluslararasiticaret',
  'Halkla İlişkiler ve Tanıtım': 'hit',
  'Gazetecilik': 'gazetecilik',
  'Radyo, Televizyon ve Sinema': 'rts',
  'Sınıf Öğretmenliği': 'sinifogretmenligi',
  'Okul Öncesi Öğretmenliği': 'okuloncesi',
  'Rehberlik ve Psikolojik Danışmanlık': 'pdr',
  'Türkçe Öğretmenliği': 'turkceogretmenligi',
  'İngilizce Öğretmenliği': 'ingilizceogretmenligi',
  'Fen Bilgisi Öğretmenliği': 'fenbilgisi',
  'İlköğretim Matematik Öğretmenliği': 'matematikogretmenligi',
  'Sosyal Bilgiler Öğretmenliği': 'sosyalbilgiler',
  'İlahiyat': 'ilahiyat',
  'Hukuk': 'hukuk',
  'Resim': 'resim',
  'Grafik Tasarımı': 'grafik',
  'Müzik': 'muzik',
  'Gastronomi ve Mutfak Sanatları': 'gastronomi',
  'Peyzaj Mimarlığı': 'peyzaj',
  'Antrenörlük Eğitimi': 'antrenorluk',
  'Beden Eğitimi ve Spor Öğretmenliği': 'besyo',
  'Spor Yöneticiliği': 'sporyoneticiligi',
};

function toInonuSlug(value = '') {
  return String(value)
    .replace(/\([^)]*\)/g, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function getDepartmentOfficialUrl(departmentName = '') {
  const slug = departmentPageSlugs[departmentName] || toInonuSlug(departmentName);
  return `https://www.inonu.edu.tr/${slug}`;
}

function fetchTextWithNodeRequest(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'http:' ? http : https;
    const requestOptions = {
      method: 'GET',
      headers: {
        'User-Agent': 'KampusRehberi/1.0 (+student project)',
        Accept: 'text/html,application/json',
      },
      timeout: 7000,
      ...(parsedUrl.protocol === 'https:' ? { rejectUnauthorized: false } : {}),
    };

    const request = client.request(parsedUrl, requestOptions, (response) => {
      const statusCode = response.statusCode || 0;
      const location = response.headers.location;

      if (statusCode >= 300 && statusCode < 400 && location && redirectCount < 4) {
        response.resume();
        resolve(fetchTextWithNodeRequest(resolveUrl(location, url), redirectCount + 1));
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(new Error(`${url} ${statusCode}`));
        return;
      }

      response.setEncoding('utf8');
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => resolve(body));
    });

    request.on('timeout', () => {
      request.destroy(new Error(`${url} timeout`));
    });
    request.on('error', reject);
    request.end();
  });
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'KampusRehberi/1.0 (+student project)',
        Accept: 'text/html,application/json',
      },
    });

    if (!response.ok) throw new Error(`${url} ${response.status}`);
    return await response.text();
  } catch (error) {
    const message = error?.cause?.code || error?.message || '';
    if (/CERT|certificate|fetch failed|self signed|unable to verify/i.test(message)) {
      return await fetchTextWithNodeRequest(url);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildGenericEventsFromHtml({ html, source, sourceUrl, category, organizer, location }) {
  const lines = compactText(html)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 2);
  const events = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const eventDate = parseEventDate(line);
    if (!eventDate) continue;

    const before = lines.slice(Math.max(0, index - 4), index).reverse();
    const title = before.find((candidate) => candidate.length >= 5 && candidate.length <= 120 && !parseEventDate(candidate));
    if (!title) continue;

    const details = [line, ...lines.slice(index + 1, index + 4)]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    events.push({
      externalId: `${source}:${title}:${eventDate}`,
      source,
      sourceUrl,
      title,
      description: details || `${title} etkinliği.`,
      eventDate,
      eventTime: parseEventTime(details),
      location,
      category,
      organizer,
    });
  }

  return events;
}

function resolveUrl(value = '', baseUrl = 'https://www.inonu.edu.tr') {
  if (!value) return '';

  try {
    return new URL(decodeHtml(value), baseUrl).href;
  } catch {
    return '';
  }
}

function getHtmlAttribute(tag = '', attribute = '') {
  const match = String(tag).match(new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match ? decodeHtml(match[1]) : '';
}

function extractImageFromHtml(html = '', sourceUrl = 'https://www.inonu.edu.tr') {
  const imgTag = String(html).match(/<img\b[^>]*>/i)?.[0] || '';
  const src = getHtmlAttribute(imgTag, 'data-src')
    || getHtmlAttribute(imgTag, 'data-original')
    || getHtmlAttribute(imgTag, 'src');

  return resolveUrl(src, sourceUrl);
}

function cleanOfficialEventTitle(text = '') {
  const datePattern = /\b\d{1,2}\s+(Ocak|Oca|Şubat|Subat|Şub|Sub|Mart|Mar|Nisan|Nis|Mayıs|Mayis|May|Haziran|Haz|Temmuz|Tem|Ağustos|Agustos|Ağu|Agu|Eylül|Eylul|Eyl|Ekim|Eki|Kasım|Kasim|Kas|Aralık|Aralik|Ara)\s*(20\d{2})?\b/gi;
  const lines = String(text)
    .split('\n')
    .map((line) => line.replace(datePattern, ' ').replace(/\s+/g, ' ').trim())
    .filter((line) =>
      line.length >= 5
      && line.length <= 180
      && !/^(etkinlikler|tüm etkinlikler|duyurular|haberler|ana sayfa)$/i.test(line)
      && !parseEventDate(line)
    );

  return lines[0] || String(text).replace(datePattern, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
}

function buildInonuOfficialEventsFromHtml(html = '', sourceUrl = 'https://www.inonu.edu.tr/etkinlikler') {
  const events = [];
  const seen = new Set();
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>/gi;
  const matches = [...String(html).matchAll(anchorRegex)];

  for (const match of matches) {
    const block = match[0];
    const text = compactText(block);
    const eventDate = parseEventDate(text);

    if (!eventDate) continue;

    const href = resolveUrl(match[1], sourceUrl);
    const title = cleanOfficialEventTitle(text);

    if (!title || title.length < 5) continue;

    const nearbyHtml = String(html).slice(Math.max(0, match.index - 1800), Math.min(String(html).length, match.index + block.length + 1800));
    const imageUrl = extractImageFromHtml(block, sourceUrl) || extractImageFromHtml(nearbyHtml, sourceUrl);
    const key = `${href || title}:${eventDate}`;

    if (seen.has(key)) continue;
    seen.add(key);

    events.push({
      externalId: `official-events:${key}`,
      source: 'İnönü Resmi Etkinlikler',
      sourceUrl: href || sourceUrl,
      title,
      description: `${title} etkinliği İnönü Üniversitesi resmi etkinlik sayfasından alınmıştır. Detaylar için kaynak bağlantısını açabilirsin.`,
      eventDate,
      eventTime: parseEventTime(text),
      location: 'İnönü Üniversitesi',
      category: 'Üniversite',
      organizer: 'İnönü Üniversitesi',
      imageUrl,
    });
  }

  if (events.length > 0) return events;

  return buildGenericEventsFromHtml({
    html,
    source: 'İnönü Resmi Etkinlikler',
    sourceUrl,
    category: 'Üniversite',
    organizer: 'İnönü Üniversitesi',
    location: 'İnönü Üniversitesi',
  });
}

function getUpcomingMonthKeys(monthCount = 4) {
  const now = new Date();

  return Array.from({ length: monthCount }, (_item, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() + index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
}

function toPublicSlug(value = '') {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function mapInonuPanelCategory(category = '', title = '') {
  const normalized = `${category} ${title}`.toLocaleLowerCase('tr-TR');

  if (normalized.includes('academic') || normalized.includes('sempozyum') || normalized.includes('konferans')) return 'Akademik';
  if (normalized.includes('career') || normalized.includes('kariyer') || normalized.includes('fuar')) return 'Kariyer Fuarı';
  if (normalized.includes('culture') || normalized.includes('kültür') || normalized.includes('sanat') || normalized.includes('konser')) return 'Kültür Sanat';
  if (normalized.includes('social') || normalized.includes('topluluk')) return 'Sosyal';

  return 'Üniversite';
}

function mapInonuPanelEvent(row = {}) {
  const title = String(row.title || '').replace(/\s+/g, ' ').trim();
  const start = String(row.start || '');
  const end = String(row.end || '');
  const eventDate = start.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0] || parseEventDate(start);
  const eventTime = start.match(/\b\d{1,2}:\d{2}\b/)?.[0] || parseEventTime(`${start} ${end}`);
  const location = [row.building, row.halls]
    .filter(Boolean)
    .join(' - ')
    .replace(/[{}"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title || !eventDate) return null;

  return {
    externalId: `inonu-panel:${row.id || `${title}:${eventDate}`}`,
    source: 'İnönü Resmi Etkinlikler',
    sourceUrl: row.id ? `https://www.inonu.edu.tr/etkinlik/${row.id}/${toPublicSlug(title)}` : 'https://www.inonu.edu.tr/etkinlikler',
    title,
    description: `${title} etkinliği İnönü Üniversitesi resmi etkinlik takviminden alınmıştır.`,
    eventDate,
    eventTime,
    location: location || 'İnönü Üniversitesi',
    category: mapInonuPanelCategory(row.category, title),
    organizer: 'İnönü Üniversitesi',
    imageUrl: '',
  };
}

function buildDepartmentAnnouncementsFromHtml({ html, sourceUrl, department }) {
  const lines = compactText(html)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !['Image', 'Input'].includes(line));
  const sectionStart = lines.findIndex((line) => /duyurular/i.test(line));
  const sourceLines = sectionStart >= 0 ? lines.slice(sectionStart + 1) : lines;
  const sectionEnd = sourceLines.findIndex((line, index) => index > 2 && /haberler|etkinlikler|tüm haberler/i.test(line));
  const announcementLines = sectionEnd >= 0 ? sourceLines.slice(0, sectionEnd) : sourceLines.slice(0, 80);
  const announcements = [];

  for (let index = 0; index < announcementLines.length; index += 1) {
    const line = announcementLines[index];
    const date = parseEventDate(line);
    if (!date && !/\b\d{1,2}\s+(Ocak|Şubat|Subat|Mart|Nisan|Mayıs|Mayis|Haziran|Temmuz|Ağustos|Agustos|Eylül|Eylul|Ekim|Kasım|Kasim|Aralık|Aralik)\b/i.test(line)) {
      continue;
    }

    const title = announcementLines
      .slice(index + 1, index + 5)
      .find((candidate) => candidate.length >= 5 && candidate.length <= 180 && !parseEventDate(candidate) && !/tüm duyurular/i.test(candidate));

    if (!title) continue;

    announcements.push({
      externalId: `${department.id}:${title}:${date || line}`,
      title,
      content: `${department.name} resmi bölüm sayfasından alınan duyuru. Detaylar için kaynak bağlantısını açabilirsin.`,
      category: 'info',
      isPinned: false,
      source: 'İnönü Bölüm Duyuruları',
      sourceUrl,
    });
  }

  return announcements;
}

async function upsertDepartmentAnnouncements(departmentId) {
  if (!departmentId) return;

  const departmentResult = await pool.query(`
    SELECT d.id, d.name, d.faculty_id, f.name AS faculty_name
    FROM departments d
    JOIN faculties f ON f.id = d.faculty_id
    WHERE d.id = $1
  `, [Number(departmentId)]);
  const department = departmentResult.rows[0];

  if (!department) return;

  const sourceUrl = getDepartmentOfficialUrl(department.name);
  let announcements = [];

  try {
    const html = await fetchText(sourceUrl);
    announcements = buildDepartmentAnnouncementsFromHtml({ html, sourceUrl, department });
  } catch (error) {
    console.warn('Bölüm duyuru sayfası okunamadı:', sourceUrl, error?.message || error);
  }

  if (announcements.length === 0) {
    announcements = [{
      externalId: `${department.id}:official-announcements`,
      title: `${department.name} resmi duyuru sayfası`,
      content: `${department.name} için güncel duyurular resmi İnönü Üniversitesi bölüm sayfasından takip edilir.`,
      category: 'info',
      isPinned: false,
      source: 'İnönü Bölüm Duyuruları',
      sourceUrl,
    }];
  }

  for (const announcement of announcements.slice(0, 20)) {
    await pool.query(`
      INSERT INTO announcements (faculty_id, department_id, title, content, category, is_pinned, source, source_url, external_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (source, external_id) WHERE external_id IS NOT NULL
      DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        category = EXCLUDED.category,
        is_pinned = EXCLUDED.is_pinned,
        source_url = EXCLUDED.source_url,
        updated_at = CURRENT_TIMESTAMP
    `, [
      department.faculty_id,
      department.id,
      announcement.title.slice(0, 200),
      announcement.content,
      announcement.category,
      announcement.isPinned,
      announcement.source,
      announcement.sourceUrl,
      announcement.externalId,
    ]);
  }
}

async function fetchTicketmasterEvents() {
  if (!ticketmasterApiKey) return [];

  const params = new URLSearchParams({
    apikey: ticketmasterApiKey,
    countryCode: 'TR',
    city: 'Malatya',
    locale: 'tr-tr',
    size: '30',
    sort: 'date,asc',
    startDateTime: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  });

  const data = JSON.parse(await fetchText(`https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`));
  const events = data?._embedded?.events || [];

  return events.map((event) => {
    const venue = event?._embedded?.venues?.[0];
    const classification = event?.classifications?.[0];
    const segment = classification?.segment?.name || '';
    const genre = classification?.genre?.name || '';

    return {
      externalId: event.id,
      source: 'Ticketmaster/Biletix',
      sourceUrl: event.url || '',
      title: event.name || 'Malatya Etkinliği',
      description: event.info || event.pleaseNote || `${event.name || 'Etkinlik'} için bilet ve detay bilgileri kaynak sayfada yer alır.`,
      eventDate: event.dates?.start?.localDate,
      eventTime: event.dates?.start?.localTime ? event.dates.start.localTime.slice(0, 5) : '',
      location: [venue?.name, venue?.city?.name].filter(Boolean).join(' - ') || 'Malatya',
      category: segment === 'Music' ? 'Konser' : (genre || segment || 'Malatya'),
      organizer: 'Ticketmaster/Biletix',
      imageUrl: event.images?.find((image) => image.ratio === '16_9' && image.width >= 1024)?.url || event.images?.[0]?.url || '',
    };
  }).filter((event) => event.eventDate);
}

async function fetchInonuCommunityEvents() {
  const sourceUrl = 'https://ogrencitopluluklari.inonu.edu.tr/Event';
  const html = await fetchText(sourceUrl);
  return buildGenericEventsFromHtml({
    html,
    source: 'İnönü Öğrenci Toplulukları',
    sourceUrl,
    category: 'Üniversite',
    organizer: 'İnönü Üniversitesi',
    location: 'İnönü Üniversitesi',
  });
}

async function fetchInonuOfficialEvents() {
  const monthKeys = getUpcomingMonthKeys(4);
  const sourceResults = await Promise.allSettled(
    monthKeys.map((monthKey) => fetchText(`https://panel.inonu.edu.tr/servlet/event?type=list&date=${monthKey}&lang=tr`)),
  );
  const events = [];

  for (const result of sourceResults) {
    if (result.status !== 'fulfilled') continue;

    try {
      const rows = JSON.parse(result.value);
      if (!Array.isArray(rows)) continue;

      for (const row of rows) {
        const event = mapInonuPanelEvent(row);
        if (event) events.push(event);
      }
    } catch (error) {
      console.warn('İnönü resmi etkinlik verisi okunamadı:', error?.message || error);
    }
  }

  const uniqueEvents = new Map();
  for (const event of events) {
    uniqueEvents.set(event.externalId, event);
  }

  return [...uniqueEvents.values()];
}

async function fetchMalatyaMunicipalityEvents() {
  const sourceUrl = 'https://www.malatya.bel.tr/';
  const html = await fetchText(sourceUrl);
  return buildGenericEventsFromHtml({
    html,
    source: 'Malatya Büyükşehir Belediyesi',
    sourceUrl,
    category: 'Malatya',
    organizer: 'Malatya Büyükşehir Belediyesi',
    location: 'Malatya',
  });
}

async function fetchCulturePortalEvents() {
  const sourceUrl = 'https://www.kulturportali.gov.tr/turkiye/malatya/etkinlik/kultur-yolu-festivali';
  const html = await fetchText(sourceUrl);
  return buildGenericEventsFromHtml({
    html,
    source: 'Kültür Portalı',
    sourceUrl,
    category: 'Kültür Sanat',
    organizer: 'T.C. Kültür ve Turizm Bakanlığı',
    location: 'Malatya',
  });
}

async function fetchIpekyoluCareerFair() {
  const sourceUrl = 'https://ipekyolukaf.inonu.edu.tr/2026/index.html';
  await fetchText(sourceUrl);

  return [
    {
      externalId: 'ipekyolu-kaf-2026',
      source: 'İpekyolu Kariyer Fuarı',
      sourceUrl,
      title: 'İpekyolu Kariyer Fuarı 2026',
      description: 'Sektör tanıtım panelleri, kariyer planlama atölyeleri, işe alım simülasyonları, staj ve yeni mezun fırsatları sunumlarıyla öğrenciler için kariyer odaklı fuar.',
      eventDate: '2026-05-15',
      eventTime: '15-16 Mayıs 2026',
      location: 'Mişmiş Park Fuar Alanı, Battalgazi / Malatya',
      category: 'Kariyer Fuarı',
      organizer: 'İnönü Üniversitesi Kariyer Merkezi',
      imageUrl: 'https://ipekyolukaf.inonu.edu.tr/2026/assets/img/hero-bg.jpg',
    },
  ];
}

async function fetchInufestOpportunity() {
  const sourceUrl = 'https://panel.inonu.edu.tr/application/ModuleAnnouncement/20945/01-12-2025_011649173.pdf';
  await fetchText(sourceUrl);

  return [
    {
      externalId: 'inufest-2026-sergi',
      source: 'İNÜFEST',
      sourceUrl,
      title: 'İNÜFEST 2026 Bilim ve Teknoloji Festivali',
      description: 'İnönü Üniversitesi öğrencilerinin bilim, teknoloji ve yenilikçi proje çalışmalarını sergileyebileceği festival. Proje geliştirmek, ekip kurmak ve fikirleri görünür kılmak için iyi bir fırsat.',
      eventDate: '2026-05-05',
      eventTime: '05-07 Mayıs 2026',
      location: 'İnönü Üniversitesi',
      category: 'Proje Fırsatı',
      organizer: 'İnönü Üniversitesi',
      imageUrl: '',
    },
  ];
}

async function fetchTubitakStudentOpportunities() {
  const sourceUrl = 'https://tubitak.gov.tr/tr/yarismalar/2242-universite-ogrencileri-arastirma-proje-yarismalari';
  await fetchText(sourceUrl);

  return [
    {
      externalId: 'tubitak-2242-2026-on-degerlendirme',
      source: 'TÜBİTAK 2242',
      sourceUrl,
      title: 'TÜBİTAK 2242 Üniversite Öğrencileri Araştırma Proje Yarışmaları',
      description: 'Ön lisans ve lisans öğrencileri için araştırma projesi geliştirme, TEKNOFEST kapsamındaki yarışmalara hazırlanma ve proje fikrini ilerletme fırsatı. 2026 takviminde ön değerlendirme sonuçları 21 Mayıs, final değerlendirmeleri 17-18 Haziran olarak duyurulmuştur.',
      eventDate: '2026-05-21',
      eventTime: '17-18 Haziran final süreci',
      location: 'Online / Türkiye',
      category: 'Proje Fırsatı',
      organizer: 'TÜBİTAK',
      imageUrl: 'https://tubitak.gov.tr/sites/default/files/2023-08/tubitak-logo.png',
    },
  ];
}

async function upsertExternalEvents(events) {
  const upcomingEvents = events.filter((event) => event.title && event.eventDate && event.eventDate >= new Date().toISOString().slice(0, 10));

  for (const event of upcomingEvents) {
    await pool.query(`
      INSERT INTO events (title, description, event_date, event_time, location, category, organizer, source, source_url, image_url, external_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (source, external_id) WHERE external_id IS NOT NULL
      DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        event_date = EXCLUDED.event_date,
        event_time = EXCLUDED.event_time,
        location = EXCLUDED.location,
        category = EXCLUDED.category,
        organizer = EXCLUDED.organizer,
        source_url = EXCLUDED.source_url,
        image_url = EXCLUDED.image_url,
        updated_at = CURRENT_TIMESTAMP
    `, [
      event.title.slice(0, 200),
      event.description || `${event.title} etkinliği.`,
      event.eventDate,
      event.eventTime || null,
      event.location || 'Malatya',
      event.category || 'Malatya',
      event.organizer || event.source,
      event.source,
      event.sourceUrl || null,
      event.imageUrl || pickDefaultEventImage(event.category),
      event.externalId,
    ]);
  }

  return upcomingEvents.length;
}

async function refreshExternalEvents() {
  if (!externalEventSyncEnabled) return;
  if (Date.now() - lastExternalEventSyncAt < externalEventSyncIntervalMs) return;
  if (externalEventSyncPromise) return externalEventSyncPromise;

  externalEventSyncPromise = (async () => {
    const sourceResults = await Promise.allSettled([
      fetchInonuOfficialEvents(),
      fetchTicketmasterEvents(),
      fetchInonuCommunityEvents(),
      fetchMalatyaMunicipalityEvents(),
      fetchCulturePortalEvents(),
      fetchIpekyoluCareerFair(),
      fetchInufestOpportunity(),
      fetchTubitakStudentOpportunities(),
    ]);

    const events = sourceResults.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
    sourceResults
      .filter((result) => result.status === 'rejected')
      .forEach((result) => console.warn('Etkinlik kaynağı okunamadı:', result.reason?.message || result.reason));

    const count = await upsertExternalEvents(events);
    lastExternalEventSyncAt = Date.now();
    console.log(`Dış etkinlik senkronizasyonu tamamlandı. Eklenen/güncellenen uygun kayıt: ${count}`);
  })().finally(() => {
    externalEventSyncPromise = null;
  });

  return externalEventSyncPromise;
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  const result = await pool.query('SELECT NOW() AS now');
  res.json({ ok: true, databaseTime: result.rows[0].now });
}));

app.get('/api/faculties', asyncRoute(async (_req, res) => {
  const result = await pool.query('SELECT id, name FROM faculties ORDER BY name');
  res.json(result.rows);
}));

app.get('/api/departments', asyncRoute(async (_req, res) => {
  if (!['lost', 'found'].includes(type)) {
    return res.status(400).json({ message: 'Ilan turu kayip veya bulunan esya olmalidir.' });
  }

  if (ownerUserId) {
    const userExists = await pool.query('SELECT id FROM users WHERE id = $1', [ownerUserId]);
    if (userExists.rowCount === 0) {
      ownerUserId = null;
    }
  }

  const result = await pool.query(`
    SELECT d.id, d.name, d.faculty_id, f.name AS faculty_name
    FROM departments d
    JOIN faculties f ON f.id = d.faculty_id
    ORDER BY f.name, d.name
  `);
  res.json(result.rows);
}));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const { fullName, email, password, departmentId, year } = req.body;

  if (!isInonuEmail(email)) {
    return res.status(400).json({ message: 'Sadece @ogr.inonu.edu.tr uzantılı öğrenci e-posta adresleri kabul edilir.' });
  }

  if (!fullName || !email || !password || !departmentId) {
    return res.status(400).json({ message: 'Ad soyad, e-posta, şifre ve bölüm zorunludur.' });
  }

  const normalizedDepartmentId = Number(departmentId);
  if (!Number.isInteger(normalizedDepartmentId) || normalizedDepartmentId <= 0) {
    return res.status(400).json({ message: 'GeÃ§erli bir bÃ¶lÃ¼m seÃ§melisin.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Şifre en az 6 karakter olmalı.' });
  }

  const blacklistRecord = await findBlacklistedEmail(email);
  if (blacklistRecord) {
    return res.status(403).json({ message: 'Bu e-posta adresi kara listeye alınmış. Yeni hesap oluşturulamaz.' });
  }

  const { name, surname } = splitFullName(fullName);
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(`
    INSERT INTO users (name, surname, email, password_hash, department_id, year, role)
    VALUES ($1, $2, LOWER($3), $4, $5, $6, 'student')
    RETURNING id, name, surname, email, department_id, year, role
  `, [name, surname, email, passwordHash, normalizedDepartmentId, year || '1']);

  const department = await pool.query('SELECT name FROM departments WHERE id = $1', [normalizedDepartmentId]);
  res.status(201).json({ user: mapUser({ ...result.rows[0], department_name: department.rows[0]?.name }) });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body;

  if (!isUniversityEmail(email)) {
    return res.status(400).json({ message: 'Sadece İnönü Üniversitesi e-posta adresleri kabul edilir.' });
  }

  const blacklistRecord = await findBlacklistedEmail(email);
  if (blacklistRecord) {
    return res.status(403).json({ message: 'Bu hesap kara listeye alınmış. Giriş yapılamaz.' });
  }

  const result = await pool.query(`
    SELECT u.id, u.name, u.surname, u.email, u.password_hash, u.department_id, u.year, u.role, d.name AS department_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.email = LOWER($1)
  `, [email]);

  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(String(password || ''), user.password_hash))) {
    return res.status(401).json({ message: 'E-posta veya şifre hatalı.' });
  }

  if (user.role !== 'admin' && !isInonuEmail(user.email)) {
    return res.status(400).json({ message: 'Öğrenci girişi için @ogr.inonu.edu.tr uzantılı e-posta kullanılmalıdır.' });
  }

  res.json({ user: mapUser(user) });
}));

app.get('/api/users/:id', asyncRoute(async (req, res) => {
  const userId = Number(req.params.id);

  if (!userId) {
    return res.status(400).json({ message: 'Kullanici secimi zorunludur.' });
  }

  const result = await pool.query(`
    SELECT u.id, u.name, u.surname, u.email, u.department_id, u.year, u.role, d.name AS department_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.id = $1
  `, [userId]);

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Kullanici bulunamadi.' });
  }

  res.json({ user: mapUser(result.rows[0]) });
}));

app.patch('/api/users/:id', asyncRoute(async (req, res) => {
  const userId = Number(req.params.id);
  const { fullName } = req.body;
  const { name, surname } = splitFullName(fullName);

  const result = await pool.query(`
    UPDATE users
    SET name = $1,
        surname = $2
    WHERE id = $3
    RETURNING id, name, surname, email, department_id, year, role
  `, [name, surname, userId]);

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
  }

  const department = await pool.query('SELECT name FROM departments WHERE id = $1', [result.rows[0].department_id]);
  res.json({ user: mapUser({ ...result.rows[0], department_name: department.rows[0]?.name }) });
}));

app.get('/api/posts', asyncRoute(async (req, res) => {
  const departmentId = req.query.departmentId ? Number(req.query.departmentId) : null;
  const userId = req.query.userId ? Number(req.query.userId) : null;
  const scope = String(req.query.scope || 'department');
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const params = [];

  let where = "p.status = 'approved'";

  if (userId) {
    params.push(userId);
    where += ` AND p.user_id = $${params.length}`;
  } else if (scope === 'global') {
    params.push(globalPostCategories);
    where += ` AND p.category = ANY($${params.length}::text[])`;
  } else {
    params.push(departmentPostCategories);
    where += ` AND p.category = ANY($${params.length}::text[])`;
  }

  if (!userId && departmentId && scope !== 'global') {
    params.push(departmentId);
    where += ` AND p.department_id = $${params.length}`;
  }

  params.push(limit);

  const result = await pool.query(`
    SELECT p.id, p.user_id, p.title, p.content, p.category, p.course_name, p.created_at, p.department_id,
           d.name AS department_name, u.name AS user_name, u.surname AS user_surname
    FROM posts p
    JOIN departments d ON d.id = p.department_id
    JOIN users u ON u.id = p.user_id
    WHERE ${where}
    ORDER BY p.created_at DESC
    LIMIT $${params.length}
  `, params);

  res.json(result.rows.map(mapPost));
}));

app.post('/api/posts', asyncRoute(async (req, res) => {
  const { userId, departmentId, title, content, category } = req.body;
  const courseName = String(req.body.courseName || req.body.course_name || req.body.course || '').trim();

  if (!userId || !departmentId || !title || !content || !category) {
    return res.status(400).json({ message: 'Paylaşım için tüm alanlar zorunludur.' });
  }

  if ((category === 'course-tip' || category === 'elective-review') && !courseName) {
    return res.status(400).json({ message: 'Ders tavsiyesi veya secmeli ders yorumu icin ders adi zorunludur.' });
  }

  const userResult = await pool.query('SELECT department_id FROM users WHERE id = $1', [Number(userId)]);
  const userDepartmentId = Number(userResult.rows[0]?.department_id);

  if (!userDepartmentId) {
    return res.status(400).json({ message: 'Kullanıcının bölüm bilgisi bulunamadı.' });
  }

  if (userDepartmentId !== Number(departmentId)) {
    return res.status(403).json({ message: 'Sadece kendi bölümüne paylaşım yapabilirsin.' });
  }

  const result = await pool.query(`
    INSERT INTO posts (user_id, department_id, title, content, category, course_name, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'approved')
    RETURNING id, title, content, category, course_name, status, created_at
  `, [Number(userId), userDepartmentId, title, content, category, courseName || null]);

  res.status(201).json({ post: result.rows[0] });
}));

app.delete('/api/posts/:id', asyncRoute(async (req, res) => {
  const postId = Number(req.params.id);
  const userId = Number(req.body.userId);

  if (!postId || !userId) {
    return res.status(400).json({ message: 'Paylaşımı silmek için kullanıcı bilgisi gerekir.' });
  }

  const postResult = await pool.query('SELECT id, user_id FROM posts WHERE id = $1', [postId]);
  const post = postResult.rows[0];

  if (!post) {
    return res.status(404).json({ message: 'Paylaşım bulunamadı.' });
  }

  if (Number(post.user_id) !== userId) {
    return res.status(403).json({ message: 'Sadece kendi paylaşımını silebilirsin.' });
  }

  await pool.query('DELETE FROM comments WHERE post_id = $1', [postId]);
  await pool.query('DELETE FROM posts WHERE id = $1', [postId]);

  res.json({ ok: true });
}));

app.post('/api/experiences', asyncRoute(async (req, res) => {
  const { userId, title, category, content } = req.body;

  if (!userId || !title || !category || !content) {
    return res.status(400).json({ message: 'Deneyim göndermek için başlık, kategori ve açıklama zorunludur.' });
  }

  const userResult = await pool.query('SELECT id, role, department_id FROM users WHERE id = $1', [Number(userId)]);
  const user = userResult.rows[0];

  if (!user) {
    return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
  }

  if (user.role === 'admin') {
    return res.status(400).json({ message: 'Admin hesabı öğrenci deneyimi göndermez.' });
  }

  const result = await pool.query(`
    INSERT INTO experience_submissions (user_id, department_id, title, category, content)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [Number(userId), user.department_id || null, title, category, content]);

  res.status(201).json({ id: result.rows[0].id });
}));

app.post('/api/reports', asyncRoute(async (req, res) => {
  const { reporterUserId, postId, reason, details } = req.body;

  if (!reporterUserId || !postId || !reason) {
    return res.status(400).json({ message: 'Raporlamak için kullanıcı, paylaşım ve neden bilgisi gerekir.' });
  }

  const reporterResult = await pool.query('SELECT id FROM users WHERE id = $1', [Number(reporterUserId)]);
  if (reporterResult.rowCount === 0) {
    return res.status(404).json({ message: 'Raporlayan kullanıcı bulunamadı.' });
  }

  const postResult = await pool.query(`
    SELECT p.id, p.user_id, p.title, p.content,
           u.name AS user_name, u.surname AS user_surname, u.email
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = $1
  `, [Number(postId)]);
  const post = postResult.rows[0];

  if (!post) {
    return res.status(404).json({ message: 'Raporlanacak paylaşım bulunamadı.' });
  }

  if (Number(post.user_id) === Number(reporterUserId)) {
    return res.status(400).json({ message: 'Kendi paylaşımını raporlayamazsın.' });
  }

  const result = await pool.query(`
    INSERT INTO content_reports (
      reporter_user_id, post_id, reported_user_id, reason, details,
      post_title, post_content, reported_user_name, reported_user_email
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, LOWER($9))
    RETURNING id
  `, [
    Number(reporterUserId),
    Number(postId),
    Number(post.user_id),
    reason,
    details || null,
    post.title,
    post.content,
    `${post.user_name || ''} ${post.user_surname || ''}`.trim(),
    post.email,
  ]);

  res.status(201).json({ id: result.rows[0].id });
}));

app.get('/api/events', asyncRoute(async (_req, res) => {
  await refreshExternalEvents();

  const result = await pool.query(`
    SELECT id, title, description, event_date, event_time, location, category, organizer, source, source_url, image_url
    FROM events
    WHERE event_date >= CURRENT_DATE
    ORDER BY event_date ASC, id DESC
  `);
  res.json(result.rows.map(mapEvent));
}));

app.get('/api/announcements', asyncRoute(async (req, res) => {
  const departmentId = req.query.departmentId ? Number(req.query.departmentId) : null;
  const facultyId = req.query.facultyId ? Number(req.query.facultyId) : null;
  const params = [];
  let where = 'TRUE';

  if (departmentId) {
    await upsertDepartmentAnnouncements(departmentId);
    params.push(departmentId);
    where += ` AND a.department_id = $${params.length}`;
  } else if (facultyId) {
    params.push(facultyId);
    where += ` AND a.faculty_id = $${params.length}`;
  } else {
    return res.json([]);
  }

  const result = await pool.query(`
    SELECT
      a.id,
      a.title,
      a.content,
      a.category,
      a.is_pinned,
      a.created_at,
      a.faculty_id,
      a.department_id,
      a.source,
      a.source_url,
      f.name AS faculty_name,
      d.name AS department_name
    FROM announcements a
    LEFT JOIN faculties f ON f.id = a.faculty_id
    LEFT JOIN departments d ON d.id = a.department_id
    WHERE ${where}
    ORDER BY a.is_pinned DESC, a.created_at DESC
  `, params);

  res.json(result.rows.map(mapAnnouncement));
}));

app.get('/api/freshman-guide', asyncRoute(async (_req, res) => {
  const result = await pool.query(`
    SELECT id, title, description, items, location_label, location_url, icon, color, sort_order
    FROM freshman_guide_cards
    ORDER BY sort_order ASC, id ASC
  `);

  res.json(result.rows.map(mapFreshmanGuideCard));
}));

app.post('/api/admin/freshman-guide', asyncRoute(async (req, res) => {
  await requireAdmin(req.body.adminUserId);
  const { title, description, items, locationLabel, locationUrl, icon, color, sortOrder } = req.body;
  const cleanItems = Array.isArray(items) ? items.map((item) => String(item).trim()).filter(Boolean) : [];

  if (!title) {
    return res.status(400).json({ message: 'Kart başlığı zorunludur.' });
  }

  const result = await pool.query(`
    INSERT INTO freshman_guide_cards (title, description, items, location_label, location_url, icon, color, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, title, description, items, location_label, location_url, icon, color, sort_order
  `, [
    title,
    description || '',
    cleanItems,
    locationLabel || null,
    locationUrl || null,
    icon || 'check',
    color || 'from-blue-500 to-blue-600',
    Number(sortOrder || 0),
  ]);

  res.status(201).json({ card: mapFreshmanGuideCard(result.rows[0]) });
}));

app.patch('/api/admin/freshman-guide/:id', asyncRoute(async (req, res) => {
  await requireAdmin(req.body.adminUserId);
  const { title, description, items, locationLabel, locationUrl, icon, color, sortOrder } = req.body;
  const cleanItems = Array.isArray(items) ? items.map((item) => String(item).trim()).filter(Boolean) : [];

  if (!title) {
    return res.status(400).json({ message: 'Kart başlığı zorunludur.' });
  }

  const result = await pool.query(`
    UPDATE freshman_guide_cards
    SET title = $1,
        description = $2,
        items = $3,
        location_label = $4,
        location_url = $5,
        icon = $6,
        color = $7,
        sort_order = $8,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $9
    RETURNING id, title, description, items, location_label, location_url, icon, color, sort_order
  `, [
    title,
    description || '',
    cleanItems,
    locationLabel || null,
    locationUrl || null,
    icon || 'check',
    color || 'from-blue-500 to-blue-600',
    Number(sortOrder || 0),
    Number(req.params.id),
  ]);

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Rehber kartı bulunamadı.' });
  }

  res.json({ card: mapFreshmanGuideCard(result.rows[0]) });
}));

app.delete('/api/admin/freshman-guide/:id', asyncRoute(async (req, res) => {
  await requireAdmin(req.body.adminUserId);

  const result = await pool.query('DELETE FROM freshman_guide_cards WHERE id = $1 RETURNING id', [Number(req.params.id)]);

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Rehber kartı bulunamadı.' });
  }

  res.json({ ok: true });
}));

app.get('/api/lost-found', asyncRoute(async (_req, res) => {
  const result = await pool.query(`
    SELECT id, user_id, title, item_type, category, location, item_date, description, contact_email, image_url, status
    FROM lost_found_items
    WHERE status = 'active'
    ORDER BY created_at DESC
  `);

  res.json(result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    type: row.item_type,
    category: row.category || '',
    location: row.location || '',
    date: row.item_date,
    description: row.description,
    contact: row.contact_email,
    imageUrl: row.image_url || '',
  })));
}));

app.post('/api/lost-found', asyncRoute(async (req, res) => {
  const { userId, title, type, category, location, date, description, contact, imageUrl } = req.body;
  let ownerUserId = userId ? Number(userId) : null;

  if (!isInonuEmail(contact)) {
    return res.status(400).json({ message: 'İletişim için @ogr.inonu.edu.tr e-postası kullanılmalıdır.' });
  }

  if (!title || !type || !description || !contact) {
    return res.status(400).json({ message: 'Eşya adı, tür, açıklama ve iletişim e-postası zorunludur.' });
  }

  const result = await pool.query(`
    INSERT INTO lost_found_items (user_id, title, item_type, category, location, item_date, description, contact_email, image_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7, LOWER($8), $9)
    RETURNING id
  `, [ownerUserId, title, type, category || null, location || null, date || null, description, contact, imageUrl || null]);

  res.status(201).json({ id: result.rows[0].id });
}));

app.delete('/api/lost-found/:id', asyncRoute(async (req, res) => {
  const itemId = Number(req.params.id);
  const userId = Number(req.body.userId);

  if (!itemId || !userId) {
    return res.status(400).json({ message: 'İlanı silmek için kullanıcı bilgisi gerekir.' });
  }

  const itemResult = await pool.query('SELECT id, user_id FROM lost_found_items WHERE id = $1', [itemId]);
  const item = itemResult.rows[0];

  if (!item) {
    return res.status(404).json({ message: 'İlan bulunamadı.' });
  }

  if (Number(item.user_id) !== userId) {
    return res.status(403).json({ message: 'Sadece kendi ilanını silebilirsin.' });
  }

  await pool.query('DELETE FROM lost_found_items WHERE id = $1', [itemId]);

  res.json({ ok: true });
}));

app.post('/api/department-change-requests', asyncRoute(async (req, res) => {
  const { userId, requestedDepartmentId, note } = req.body;

  if (!userId || !requestedDepartmentId) {
    return res.status(400).json({ message: 'Kullanıcı ve istenen bölüm zorunludur.' });
  }

  const userResult = await pool.query('SELECT department_id FROM users WHERE id = $1', [Number(userId)]);
  const currentDepartmentId = userResult.rows[0]?.department_id;

  if (!currentDepartmentId) {
    return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
  }

  if (Number(currentDepartmentId) === Number(requestedDepartmentId)) {
    return res.status(400).json({ message: 'Zaten bu bölümdesin.' });
  }

  const result = await pool.query(`
    INSERT INTO department_change_requests (user_id, current_department_id, requested_department_id, note)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [Number(userId), Number(currentDepartmentId), Number(requestedDepartmentId), note || null]);

  res.status(201).json({ id: result.rows[0].id });
}));

app.get('/api/admin/statistics', asyncRoute(async (req, res) => {
  await requireAdmin(req.query.adminUserId);
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users WHERE role <> 'admin') AS total_users,
      (SELECT COUNT(*)::int FROM faculties) AS total_faculties,
      (SELECT COUNT(*)::int FROM departments) AS total_departments,
      (SELECT COUNT(*)::int FROM posts) AS total_posts,
      (SELECT COUNT(*)::int FROM posts WHERE status = 'pending') AS pending_posts,
      (SELECT COUNT(*)::int FROM posts WHERE status = 'approved') AS approved_posts,
      (SELECT COUNT(*)::int FROM blacklisted_users) AS blacklisted_users,
      (SELECT COUNT(*)::int FROM experience_submissions WHERE status = 'pending') AS pending_experiences,
      (SELECT COUNT(*)::int FROM content_reports WHERE status = 'pending' AND (post_id IS NOT NULL OR reported_user_id IS NOT NULL)) AS pending_reports,
      (SELECT COUNT(*)::int FROM comments) AS total_comments
  `);
  res.json(result.rows[0]);
}));

app.get('/api/admin/posts', asyncRoute(async (req, res) => {
  await requireAdmin(req.query.adminUserId);
  const status = req.query.status || 'all';

  if (!['all', 'pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Geçersiz paylaşım durumu.' });
  }

  const params = [];
  let where = '';

  if (status !== 'all') {
    params.push(status);
    where = `WHERE p.status = $${params.length}`;
  }

  const result = await pool.query(`
    SELECT p.id, p.user_id, p.title, p.content, p.category, p.status, p.created_at,
           u.name AS user_name, u.surname AS user_surname, u.email,
           d.name AS department_name, f.name AS faculty_name
    FROM posts p
    JOIN users u ON u.id = p.user_id
    JOIN departments d ON d.id = p.department_id
    JOIN faculties f ON f.id = d.faculty_id
    ${where}
    ORDER BY p.created_at DESC
  `, params);

  res.json(result.rows);
}));

app.delete('/api/admin/posts/:id', asyncRoute(async (req, res) => {
  await requireAdmin(req.body.adminUserId);

  const postId = Number(req.params.id);
  await pool.query('DELETE FROM comments WHERE post_id = $1', [postId]);
  const result = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING id', [postId]);

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Paylaşım bulunamadı.' });
  }

  res.json({ ok: true });
}));

app.patch('/api/admin/posts/:id', asyncRoute(async (req, res) => {
  await requireAdmin(req.body.adminUserId);
  const { status } = req.body;

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Geçersiz paylaşım durumu.' });
  }

  const result = await pool.query(`
    UPDATE posts
    SET status = $1
    WHERE id = $2
    RETURNING id, title, status
  `, [status, Number(req.params.id)]);

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Paylaşım bulunamadı.' });
  }

  res.json({ post: result.rows[0] });
}));

app.get('/api/admin/experiences', asyncRoute(async (req, res) => {
  await requireAdmin(req.query.adminUserId);

  const result = await pool.query(`
    SELECT e.id, e.title, e.category, e.content, e.status, e.admin_note, e.created_at,
           u.id AS user_id, u.name AS user_name, u.surname AS user_surname, u.email,
           d.name AS department_name, f.name AS faculty_name
    FROM experience_submissions e
    LEFT JOIN users u ON u.id = e.user_id
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN faculties f ON f.id = d.faculty_id
    ORDER BY CASE WHEN e.status = 'pending' THEN 0 ELSE 1 END, e.created_at DESC
  `);

  res.json(result.rows);
}));

app.patch('/api/admin/experiences/:id', asyncRoute(async (req, res) => {
  await requireAdmin(req.body.adminUserId);
  const { status, adminNote } = req.body;

  if (!['pending', 'reviewed', 'published', 'archived'].includes(status)) {
    return res.status(400).json({ message: 'Geçersiz deneyim durumu.' });
  }

  const result = await pool.query(`
    UPDATE experience_submissions
    SET status = $1,
        admin_note = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING id
  `, [status, adminNote || null, Number(req.params.id)]);

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Deneyim kaydı bulunamadı.' });
  }

  res.json({ ok: true });
}));

app.delete('/api/admin/experiences/:id', asyncRoute(async (req, res) => {
  await requireAdmin(req.body.adminUserId);

  const result = await pool.query('DELETE FROM experience_submissions WHERE id = $1 RETURNING id', [Number(req.params.id)]);

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Deneyim kaydı bulunamadı.' });
  }

  res.json({ ok: true });
}));

app.get('/api/admin/reports', asyncRoute(async (req, res) => {
  await requireAdmin(req.query.adminUserId);

  await pool.query(`
    DELETE FROM content_reports
    WHERE post_id IS NULL
      AND reported_user_id IS NULL
  `);

  const result = await pool.query(`
    SELECT r.id, r.reporter_user_id, r.post_id, r.reported_user_id, r.reason, r.details,
           r.post_title, r.post_content, r.reported_user_name, r.reported_user_email,
           r.status, r.created_at, r.reviewed_at,
           reporter.name AS reporter_name, reporter.surname AS reporter_surname, reporter.email AS reporter_email
    FROM content_reports r
    LEFT JOIN users reporter ON reporter.id = r.reporter_user_id
    WHERE r.status = 'pending'
      AND (r.post_id IS NOT NULL OR r.reported_user_id IS NOT NULL)
    ORDER BY r.created_at DESC
  `);

  res.json(result.rows);
}));

app.patch('/api/admin/reports/:id', asyncRoute(async (req, res) => {
  await requireAdmin(req.body.adminUserId);
  const { status } = req.body;

  if (!['pending', 'reviewed', 'dismissed', 'action_taken'].includes(status)) {
    return res.status(400).json({ message: 'Geçersiz rapor durumu.' });
  }

  const result = await pool.query(`
    UPDATE content_reports
    SET status = $1::varchar,
        reviewed_at = CASE WHEN $1::varchar = 'pending' THEN NULL ELSE CURRENT_TIMESTAMP END
    WHERE id = $2
    RETURNING id
  `, [status, Number(req.params.id)]);

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Rapor kaydı bulunamadı.' });
  }

  res.json({ ok: true });
}));

app.get('/api/admin/events', asyncRoute(async (req, res) => {
  await requireAdmin(req.query.adminUserId);

  const result = await pool.query(`
    SELECT id, title, description, event_date, event_time, location, category, organizer, source, source_url, image_url
    FROM events
    ORDER BY event_date ASC, id DESC
  `);

  res.json(result.rows.map(mapEvent));
}));

app.post('/api/admin/events', asyncRoute(async (req, res) => {
  await requireAdmin(req.body.adminUserId);
  let { title, description, eventDate, eventTime, location, category, organizer, imageUrl, sourceUrl } = req.body;

  if (!title || !description || !eventDate) {
    return res.status(400).json({ message: 'Etkinlik adı, açıklama ve tarih zorunludur.' });
  }

  if (!imageUrl) {
    imageUrl = pickDefaultEventImage(category);
  }

  const result = await pool.query(`
    INSERT INTO events (title, description, event_date, event_time, location, category, organizer, source, source_url, image_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin', $8, $9)
    RETURNING id
  `, [title, description, eventDate, eventTime || null, location || null, category || 'Üniversite', organizer || null, sourceUrl || null, imageUrl || null]);

  res.status(201).json({ id: result.rows[0].id });
}));

app.delete('/api/admin/events/:id', asyncRoute(async (req, res) => {
  await requireAdmin(req.body.adminUserId);

  const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [Number(req.params.id)]);

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Etkinlik bulunamadı.' });
  }

  res.json({ ok: true });
}));

app.get('/api/admin/users', asyncRoute(async (req, res) => {
  await requireAdmin(req.query.adminUserId);

  const result = await pool.query(`
    SELECT u.id, u.name, u.surname, u.email, u.role, u.year, u.department_id,
           d.name AS department_name, f.name AS faculty_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN faculties f ON f.id = d.faculty_id
    WHERE u.role <> 'admin'
    ORDER BY u.created_at DESC
  `);

  res.json(result.rows.map((row) => ({
    id: row.id,
    fullName: `${row.name} ${row.surname}`.replace(/\s+-$/, '').trim(),
    email: row.email,
    role: row.role,
    year: row.year,
    departmentId: row.department_id,
    department: row.department_name || '',
    faculty: row.faculty_name || '',
  })));
}));

app.get('/api/admin/blacklist', asyncRoute(async (req, res) => {
  await requireAdmin(req.query.adminUserId);

  const result = await pool.query(`
    SELECT b.id, b.email, b.full_name, b.reason, b.created_at,
           admin.name AS admin_name, admin.surname AS admin_surname
    FROM blacklisted_users b
    LEFT JOIN users admin ON admin.id = b.created_by
    ORDER BY b.created_at DESC
  `);

  res.json(result.rows);
}));

app.delete('/api/admin/users/:id', asyncRoute(async (req, res) => {
  const adminUserId = Number(req.body.adminUserId);
  await requireAdmin(adminUserId);

  const userId = Number(req.params.id);
  if (!userId) {
    return res.status(400).json({ message: 'KullanÄ±cÄ± seÃ§imi zorunludur.' });
  }

  if (userId === adminUserId) {
    return res.status(400).json({ message: 'Kendi admin hesabÄ±nÄ± silemezsin.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT id, role FROM users WHERE id = $1 FOR UPDATE',
      [userId],
    );
    const user = userResult.rows[0];

    if (!user) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'KullanÄ±cÄ± bulunamadÄ±.' });
    }

    if (user.role === 'admin') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Admin hesabÄ± silinemez.' });
    }

    await client.query('DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE user_id = $1)', [userId]);
    await client.query('DELETE FROM comments WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM posts WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM experience_submissions WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM department_change_requests WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM lost_found_items WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.delete('/api/admin/blacklist/:id', asyncRoute(async (req, res) => {
  await requireAdmin(req.body.adminUserId);

  const result = await pool.query(
    'DELETE FROM blacklisted_users WHERE id = $1 RETURNING id, email',
    [Number(req.params.id)],
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Kara liste kaydı bulunamadı.' });
  }

  res.json({ ok: true, email: result.rows[0].email });
}));

app.post('/api/admin/users/:id/blacklist', asyncRoute(async (req, res) => {
  const adminUserId = Number(req.body.adminUserId);
  await requireAdmin(adminUserId);

  const userId = Number(req.params.id);
  const reason = String(req.body.reason || '').trim() || 'Topluluk kurallarını ihlal ettiği için kara listeye alındı.';

  if (!userId) {
    return res.status(400).json({ message: 'Kullanıcı seçimi zorunludur.' });
  }

  if (userId === adminUserId) {
    return res.status(400).json({ message: 'Kendi admin hesabını kara listeye alamazsın.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT id, name, surname, email, role FROM users WHERE id = $1 FOR UPDATE',
      [userId],
    );
    const user = userResult.rows[0];

    if (!user) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    if (user.role === 'admin') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Admin hesabı kara listeye alınamaz.' });
    }

    const fullName = `${user.name} ${user.surname}`.replace(/\s+-$/, '').trim();

    await client.query(`
      INSERT INTO blacklisted_users (email, user_id, full_name, reason, created_by)
      VALUES (LOWER($1), $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          full_name = EXCLUDED.full_name,
          reason = EXCLUDED.reason,
          created_by = EXCLUDED.created_by,
          created_at = CURRENT_TIMESTAMP
    `, [user.email, user.id, fullName, reason, adminUserId]);

    await client.query('DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE user_id = $1)', [userId]);
    await client.query('DELETE FROM comments WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM posts WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM department_change_requests WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM lost_found_items WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.patch('/api/admin/users/:id/department', asyncRoute(async (req, res) => {
  await requireAdmin(req.body.adminUserId);
  const { departmentId } = req.body;

  if (!departmentId) {
    return res.status(400).json({ message: 'Yeni bölüm zorunludur.' });
  }

  const result = await pool.query(`
    UPDATE users
    SET department_id = $1
    WHERE id = $2
    RETURNING id, name, surname, email, department_id, year, role
  `, [Number(departmentId), Number(req.params.id)]);

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
  }

  res.json({ ok: true });
}));

app.get('/api/admin/department-change-requests', asyncRoute(async (req, res) => {
  await requireAdmin(req.query.adminUserId);

  const result = await pool.query(`
    SELECT r.id, r.note, r.status, r.created_at,
           u.id AS user_id, u.name, u.surname, u.email,
           current_d.name AS current_department_name,
           requested_d.id AS requested_department_id,
           requested_d.name AS requested_department_name
    FROM department_change_requests r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN departments current_d ON current_d.id = r.current_department_id
    JOIN departments requested_d ON requested_d.id = r.requested_department_id
    WHERE r.status = 'pending'
    ORDER BY r.created_at ASC
  `);

  res.json(result.rows);
}));

app.patch('/api/admin/department-change-requests/:id', asyncRoute(async (req, res) => {
  await requireAdmin(req.body.adminUserId);
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Talep için onay veya red seçilmelidir.' });
  }

  const requestResult = await pool.query('SELECT * FROM department_change_requests WHERE id = $1', [Number(req.params.id)]);
  const request = requestResult.rows[0];

  if (!request || request.status !== 'pending') {
    return res.status(404).json({ message: 'Bekleyen talep bulunamadı.' });
  }

  if (status === 'approved') {
    await pool.query('UPDATE users SET department_id = $1 WHERE id = $2', [request.requested_department_id, request.user_id]);
  }

  await pool.query(`
    UPDATE department_change_requests
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `, [status, request.id]);

  res.json({ ok: true });
}));

app.use((error, _req, res, _next) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  if (error.code === '23505') {
    return res.status(409).json({ message: 'Bu kayıt zaten mevcut.' });
  }

  if (error.code === '23503') {
    return res.status(400).json({ message: 'Seçilen kayıt veritabanında bulunamadı.' });
  }

  if (error.code === '23514') {
    return res.status(400).json({ message: 'Girilen bilgi veritabanı kurallarına uymuyor.' });
  }

  console.error(error);
  res.status(500).json({ message: 'Sunucu hatası oluştu.' });
});

await ensureSchemaCompatibility();

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Inonu Rehberi API http://127.0.0.1:${port}/api adresinde calisiyor.`);
  });
}

export default app;
