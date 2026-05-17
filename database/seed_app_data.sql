-- Optional starter data for the Inonu Campus Guide app.
-- Run this inside the inonu_kampus_rehberi database after the tables exist.

INSERT INTO announcements (title, content, created_at)
VALUES
('Kampüs Rehberi yayına hazır', 'Sistem artık PostgreSQL veritabanına bağlı çalışacak şekilde hazırlandı.', CURRENT_TIMESTAMP),
('İnönü e-posta zorunluluğu', 'Öğrenci kayıtlarında yalnızca @ogr.inonu.edu.tr uzantılı e-posta adresleri kabul edilir.', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO events (title, description, event_date, event_time, location, category, organizer)
VALUES
('Kariyer Günleri', 'Öğrenciler için kariyer planlama, CV hazırlama ve sektör buluşmaları.', CURRENT_DATE + INTERVAL '5 day', '10:00 - 17:00', 'Ana Kampüs', 'Kariyer', 'Kariyer Planlama Merkezi'),
('Yapay Zeka Semineri', 'Yapay zekanın güncel kullanım alanları ve öğrenciler için proje fikirleri.', CURRENT_DATE + INTERVAL '8 day', '14:00 - 16:00', 'Konferans Salonu', 'Akademik', 'Mühendislik Fakültesi'),
('Öğrenci Toplulukları Tanıtımı', 'Kampüsteki öğrenci kulüpleri ve topluluklar için tanıtım günü.', CURRENT_DATE + INTERVAL '12 day', '12:00 - 18:00', 'Merkez Kampüs Meydanı', 'Sosyal', 'Öğrenci Konseyi')
ON CONFLICT DO NOTHING;

-- Demo user password is: Deneme123
-- Delete this user later if you do not want a demo login.
INSERT INTO users (name, surname, email, password_hash, student_no, department_id, year, role)
SELECT
    'Demo',
    'Öğrenci',
    'demo@ogr.inonu.edu.tr',
    '$2b$10$eQg.3z4klD8uXcV5Qcyceez6zYmJa.VDgoxkbD.Pv/k.LvHX1XeRC',
    '100000001',
    d.id,
    '2',
    'student'
FROM departments d
WHERE d.name = 'Bilgisayar Mühendisliği'
LIMIT 1
ON CONFLICT (email) DO NOTHING;

INSERT INTO posts (user_id, department_id, title, content, category, status)
SELECT
    u.id,
    u.department_id,
    'Veritabanı bağlantısı aktif',
    'Bu paylaşım PostgreSQL veritabanından geliyor. Yeni paylaşımlar admin onayı bekleyecek şekilde kaydedilir.',
    'general',
    'approved'
FROM users u
WHERE u.email = 'demo@ogr.inonu.edu.tr'
ON CONFLICT DO NOTHING;

INSERT INTO lost_found_items (user_id, title, item_type, category, location, item_date, description, contact_email, status)
SELECT
    u.id,
    'Örnek kayıp eşya ilanı',
    'lost',
    'Kişisel Eşya',
    'Merkez Kampüs',
    CURRENT_DATE,
    'Bu ilan veritabanından gelen örnek bir kayıttır. Gerçek kullanımda kullanıcıların eklediği ilanlar burada listelenir.',
    'demo@ogr.inonu.edu.tr',
    'active'
FROM users u
WHERE u.email = 'demo@ogr.inonu.edu.tr'
ON CONFLICT DO NOTHING;
