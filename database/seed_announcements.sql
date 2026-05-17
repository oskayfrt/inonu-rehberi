-- Kampüs Rehberi başlangıç duyuruları
-- Bu dosya announcements tablosuna genel, fakülte ve bölüm bazlı örnek/kullanıma hazır duyurular ekler.

INSERT INTO announcements (faculty_id, department_id, title, content, category, is_pinned)
VALUES
(
    NULL,
    NULL,
    'İnönü Üniversitesi LMS duyurusu',
    'Bahar dönemi ile birlikte ders içerikleri ve uzaktan eğitim süreçleri tek LMS platformu üzerinden takip edilebilir.',
    'info',
    true
),
(
    NULL,
    NULL,
    'Kampüs Rehberi duyuru alanı kullanıma açıldı',
    'Üniversite, fakülte ve bölüm duyuruları bu alanda listelenecektir. Bölüm sayfasında yalnızca ilgili bölüm ve genel duyurular görünür.',
    'success',
    true
),
(
    (SELECT id FROM faculties WHERE name = 'Mühendislik Fakültesi'),
    NULL,
    'Mühendislik Fakültesi proje ve kariyer duyuruları',
    'Mühendislik öğrencilerine yönelik proje, kariyer fuarı, staj ve yarışma duyuruları fakülte kapsamında takip edilebilir.',
    'info',
    false
),
(
    (SELECT id FROM faculties WHERE name = 'Mühendislik Fakültesi'),
    (SELECT id FROM departments WHERE name = 'Bilgisayar Mühendisliği' AND faculty_id = (SELECT id FROM faculties WHERE name = 'Mühendislik Fakültesi')),
    'Bilgisayar Mühendisliği bölüm duyuruları',
    'Ders programı, sınav, seçmeli ders, proje ve staj duyuruları bu bölüm sayfasında görünecek şekilde ayarlanmıştır.',
    'important',
    false
),
(
    (SELECT id FROM faculties WHERE name = 'Mühendislik Fakültesi'),
    (SELECT id FROM departments WHERE name = 'Yazılım Mühendisliği' AND faculty_id = (SELECT id FROM faculties WHERE name = 'Mühendislik Fakültesi')),
    'Yazılım Mühendisliği bölüm duyuruları',
    'Yazılım Mühendisliği öğrencilerine özel ders, proje, staj ve seçmeli ders duyuruları bu bölüm sayfasında listelenecektir.',
    'info',
    false
),
(
    (SELECT id FROM faculties WHERE name = 'İktisadi ve İdari Bilimler Fakültesi'),
    NULL,
    'İİBF kariyer ve etkinlik duyuruları',
    'İktisadi ve İdari Bilimler Fakültesi öğrencilerine yönelik kariyer, seminer ve öğrenci etkinliği duyuruları burada takip edilebilir.',
    'info',
    false
),
(
    (SELECT id FROM faculties WHERE name = 'Sağlık Bilimleri Fakültesi'),
    NULL,
    'Sağlık Bilimleri Fakültesi duyuruları',
    'Sağlık Bilimleri Fakültesi öğrencilerine yönelik akademik ve uygulama duyuruları bu alanda listelenecektir.',
    'info',
    false
);
