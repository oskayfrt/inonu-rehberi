const departmentPageSlugs: Record<string, string> = {
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

function toInonuSlug(value: string) {
  return value
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

export function getInonuDepartmentUrl(departmentName: string) {
  const slug = departmentPageSlugs[departmentName] || toInonuSlug(departmentName);
  return `https://www.inonu.edu.tr/${slug}`;
}
