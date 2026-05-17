export const INONU_FACULTIES = [
  {
    name: 'Tıp Fakültesi',
    departments: ['Tıp', 'Tıp (İngilizce)'],
  },
  {
    name: 'Diş Hekimliği Fakültesi',
    departments: ['Diş Hekimliği'],
  },
  {
    name: 'Eczacılık Fakültesi',
    departments: ['Eczacılık'],
  },
  {
    name: 'Hemşirelik Fakültesi',
    departments: ['Hemşirelik'],
  },
  {
    name: 'Sağlık Bilimleri Fakültesi',
    departments: [
      'Beslenme ve Diyetetik',
      'Çocuk Gelişimi',
      'Dil ve Konuşma Terapisi',
      'Ebelik',
      'Fizyoterapi ve Rehabilitasyon',
      'Gerontoloji',
      'Odyoloji',
    ],
  },
  {
    name: 'Mühendislik Fakültesi',
    departments: [
      'Bilgisayar Mühendisliği',
      'Biyomedikal Mühendisliği',
      'Elektrik-Elektronik Mühendisliği',
      'Gıda Mühendisliği',
      'İnşaat Mühendisliği',
      'Kimya Mühendisliği',
      'Maden Mühendisliği',
      'Makine Mühendisliği',
      'Yazılım Mühendisliği',
    ],
  },
  {
    name: 'Fen-Edebiyat Fakültesi',
    departments: [
      'Biyoloji',
      'Coğrafya',
      'Felsefe',
      'Fizik',
      'İngiliz Dili ve Edebiyatı',
      'Kimya',
      'Matematik',
      'Moleküler Biyoloji ve Genetik (İngilizce)',
      'Psikoloji',
      'Sosyoloji',
      'Tarih',
      'Türk Dili ve Edebiyatı',
    ],
  },
  {
    name: 'İktisadi ve İdari Bilimler Fakültesi',
    departments: [
      'Çalışma Ekonomisi ve Endüstri İlişkileri',
      'Ekonometri',
      'İktisat',
      'İşletme',
      'Maliye',
      'Siyaset Bilimi ve Kamu Yönetimi',
      'Siyaset Bilimi ve Uluslararası İlişkiler',
      'Uluslararası Ticaret ve İşletmecilik (İngilizce)',
    ],
  },
  {
    name: 'İletişim Fakültesi',
    departments: [
      'Gazetecilik',
      'Halkla İlişkiler ve Tanıtım',
      'Halkla İlişkiler ve Tanıtım (Uzaktan Öğretim)',
      'Radyo, Televizyon ve Sinema',
    ],
  },
  {
    name: 'Eğitim Fakültesi',
    departments: [
      'Fen Bilgisi Öğretmenliği',
      'İlköğretim Matematik Öğretmenliği',
      'İngilizce Öğretmenliği',
      'Okul Öncesi Öğretmenliği',
      'Özel Eğitim Öğretmenliği',
      'Rehberlik ve Psikolojik Danışmanlık',
      'Sınıf Öğretmenliği',
      'Sosyal Bilgiler Öğretmenliği',
      'Türkçe Öğretmenliği',
    ],
  },
  {
    name: 'İlahiyat Fakültesi',
    departments: ['İlahiyat', 'İlahiyat (M.T.O.K.)'],
  },
  {
    name: 'Hukuk Fakültesi',
    departments: ['Hukuk'],
  },
  {
    name: 'Güzel Sanatlar ve Tasarım Fakültesi',
    departments: ['Gastronomi ve Mutfak Sanatları', 'Peyzaj Mimarlığı'],
  },
  {
    name: 'Spor Bilimleri Fakültesi',
    departments: ['Spor Yöneticiliği'],
  },
];

export const INONU_DEPARTMENTS = INONU_FACULTIES.flatMap((faculty) => faculty.departments);
