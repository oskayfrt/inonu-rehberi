-- PostgreSQL setup for the Inonu University Campus Guide project.
-- Step 1, run once outside this file if the database does not exist:
--   CREATE DATABASE inonu_kampus_rehberi WITH ENCODING 'UTF8';
-- Step 2, connect to that database and run this file.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS faculties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    faculty_id INT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (faculty_id, name)
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    email CITEXT UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    student_no VARCHAR(50) UNIQUE,
    year VARCHAR(20) DEFAULT '1',
    role VARCHAR(20) DEFAULT 'student' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_university_email CHECK (email::TEXT ~* '^[A-Z0-9._%+-]+@(ogr\.)?inonu\.edu\.tr$'),
    CONSTRAINT chk_users_role CHECK (role IN ('student', 'admin')),
    CONSTRAINT chk_users_student_no CHECK (student_no IS NULL OR student_no ~ '^[0-9]{6,20}$')
);

CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    course_name VARCHAR(180) NOT NULL,
    course_code VARCHAR(50),
    course_type VARCHAR(50) DEFAULT 'required' NOT NULL,
    grade_level INT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_courses_type CHECK (course_type IN ('required', 'elective')),
    CONSTRAINT chk_courses_grade_level CHECK (grade_level IS NULL OR grade_level BETWEEN 0 AND 6)
);

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(80) DEFAULT 'general' NOT NULL,
    course_name VARCHAR(180),
    status VARCHAR(30) DEFAULT 'pending' NOT NULL,
    is_approved BOOLEAN DEFAULT false NOT NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_posts_status CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT chk_posts_category CHECK (category IN (
        'course-tip',
        'elective-review',
        'academic-tip',
        'campus-tip',
        'student-affairs',
        'general'
    ))
);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    faculty_id INT REFERENCES faculties(id) ON DELETE SET NULL,
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(80) DEFAULT 'info' NOT NULL,
    is_pinned BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_announcements_category CHECK (category IN ('important', 'info', 'success'))
);

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time VARCHAR(50),
    start_time TIME,
    end_time TIME,
    location VARCHAR(200),
    category VARCHAR(80) DEFAULT 'general' NOT NULL,
    organizer VARCHAR(200),
    source VARCHAR(80) DEFAULT 'local' NOT NULL,
    source_url TEXT,
    image_url TEXT,
    external_id VARCHAR(300),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_participants (
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'joined' NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id),
    CONSTRAINT chk_event_participants_status CHECK (status IN ('joined', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS lost_found_items (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    item_type VARCHAR(20) NOT NULL,
    category VARCHAR(100),
    location VARCHAR(200),
    item_date DATE,
    event_date DATE,
    description TEXT NOT NULL,
    contact_email CITEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_lost_found_type CHECK (item_type IN ('lost', 'found')),
    CONSTRAINT chk_lost_found_status CHECK (status IN ('active', 'resolved', 'archived')),
    CONSTRAINT chk_lost_found_university_email CHECK (contact_email::TEXT ~* '^[A-Z0-9._%+-]+@(ogr\.)?inonu\.edu\.tr$')
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_post_approval()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_approved = (NEW.status = 'approved');

    IF NEW.status <> 'rejected' THEN
        NEW.rejection_reason = NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_faculties_updated_at ON faculties;
CREATE TRIGGER trg_faculties_updated_at
BEFORE UPDATE ON faculties
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
CREATE TRIGGER trg_departments_updated_at
BEFORE UPDATE ON departments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;
CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_posts_updated_at ON posts;
CREATE TRIGGER trg_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
CREATE TRIGGER trg_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON announcements;
CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_lost_found_items_updated_at ON lost_found_items;
CREATE TRIGGER trg_lost_found_items_updated_at
BEFORE UPDATE ON lost_found_items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sync_post_approval ON posts;
CREATE TRIGGER trg_sync_post_approval
BEFORE INSERT OR UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION sync_post_approval();

INSERT INTO faculties (name) VALUES
('Tıp Fakültesi'),
('Diş Hekimliği Fakültesi'),
('Eczacılık Fakültesi'),
('Hemşirelik Fakültesi'),
('Sağlık Bilimleri Fakültesi'),
('Mühendislik Fakültesi'),
('Fen-Edebiyat Fakültesi'),
('İktisadi ve İdari Bilimler Fakültesi'),
('İletişim Fakültesi'),
('Eğitim Fakültesi'),
('İlahiyat Fakültesi'),
('Hukuk Fakültesi'),
('Güzel Sanatlar ve Tasarım Fakültesi'),
('Spor Bilimleri Fakültesi')
ON CONFLICT (name) DO NOTHING;

INSERT INTO departments (faculty_id, name) VALUES
((SELECT id FROM faculties WHERE name='Tıp Fakültesi'), 'Tıp'),
((SELECT id FROM faculties WHERE name='Tıp Fakültesi'), 'Tıp (İngilizce)'),
((SELECT id FROM faculties WHERE name='Diş Hekimliği Fakültesi'), 'Diş Hekimliği'),
((SELECT id FROM faculties WHERE name='Eczacılık Fakültesi'), 'Eczacılık'),
((SELECT id FROM faculties WHERE name='Hemşirelik Fakültesi'), 'Hemşirelik'),
((SELECT id FROM faculties WHERE name='Sağlık Bilimleri Fakültesi'), 'Beslenme ve Diyetetik'),
((SELECT id FROM faculties WHERE name='Sağlık Bilimleri Fakültesi'), 'Çocuk Gelişimi'),
((SELECT id FROM faculties WHERE name='Sağlık Bilimleri Fakültesi'), 'Dil ve Konuşma Terapisi'),
((SELECT id FROM faculties WHERE name='Sağlık Bilimleri Fakültesi'), 'Ebelik'),
((SELECT id FROM faculties WHERE name='Sağlık Bilimleri Fakültesi'), 'Fizyoterapi ve Rehabilitasyon'),
((SELECT id FROM faculties WHERE name='Sağlık Bilimleri Fakültesi'), 'Gerontoloji'),
((SELECT id FROM faculties WHERE name='Sağlık Bilimleri Fakültesi'), 'Odyoloji'),
((SELECT id FROM faculties WHERE name='Mühendislik Fakültesi'), 'Bilgisayar Mühendisliği'),
((SELECT id FROM faculties WHERE name='Mühendislik Fakültesi'), 'Biyomedikal Mühendisliği'),
((SELECT id FROM faculties WHERE name='Mühendislik Fakültesi'), 'Elektrik-Elektronik Mühendisliği'),
((SELECT id FROM faculties WHERE name='Mühendislik Fakültesi'), 'Gıda Mühendisliği'),
((SELECT id FROM faculties WHERE name='Mühendislik Fakültesi'), 'İnşaat Mühendisliği'),
((SELECT id FROM faculties WHERE name='Mühendislik Fakültesi'), 'Kimya Mühendisliği'),
((SELECT id FROM faculties WHERE name='Mühendislik Fakültesi'), 'Maden Mühendisliği'),
((SELECT id FROM faculties WHERE name='Mühendislik Fakültesi'), 'Makine Mühendisliği'),
((SELECT id FROM faculties WHERE name='Mühendislik Fakültesi'), 'Yazılım Mühendisliği'),
((SELECT id FROM faculties WHERE name='Fen-Edebiyat Fakültesi'), 'Biyoloji'),
((SELECT id FROM faculties WHERE name='Fen-Edebiyat Fakültesi'), 'Coğrafya'),
((SELECT id FROM faculties WHERE name='Fen-Edebiyat Fakültesi'), 'Felsefe'),
((SELECT id FROM faculties WHERE name='Fen-Edebiyat Fakültesi'), 'Fizik'),
((SELECT id FROM faculties WHERE name='Fen-Edebiyat Fakültesi'), 'İngiliz Dili ve Edebiyatı'),
((SELECT id FROM faculties WHERE name='Fen-Edebiyat Fakültesi'), 'Kimya'),
((SELECT id FROM faculties WHERE name='Fen-Edebiyat Fakültesi'), 'Matematik'),
((SELECT id FROM faculties WHERE name='Fen-Edebiyat Fakültesi'), 'Moleküler Biyoloji ve Genetik (İngilizce)'),
((SELECT id FROM faculties WHERE name='Fen-Edebiyat Fakültesi'), 'Psikoloji'),
((SELECT id FROM faculties WHERE name='Fen-Edebiyat Fakültesi'), 'Sosyoloji'),
((SELECT id FROM faculties WHERE name='Fen-Edebiyat Fakültesi'), 'Tarih'),
((SELECT id FROM faculties WHERE name='Fen-Edebiyat Fakültesi'), 'Türk Dili ve Edebiyatı'),
((SELECT id FROM faculties WHERE name='İktisadi ve İdari Bilimler Fakültesi'), 'Çalışma Ekonomisi ve Endüstri İlişkileri'),
((SELECT id FROM faculties WHERE name='İktisadi ve İdari Bilimler Fakültesi'), 'Ekonometri'),
((SELECT id FROM faculties WHERE name='İktisadi ve İdari Bilimler Fakültesi'), 'İktisat'),
((SELECT id FROM faculties WHERE name='İktisadi ve İdari Bilimler Fakültesi'), 'İşletme'),
((SELECT id FROM faculties WHERE name='İktisadi ve İdari Bilimler Fakültesi'), 'Maliye'),
((SELECT id FROM faculties WHERE name='İktisadi ve İdari Bilimler Fakültesi'), 'Siyaset Bilimi ve Kamu Yönetimi'),
((SELECT id FROM faculties WHERE name='İktisadi ve İdari Bilimler Fakültesi'), 'Siyaset Bilimi ve Uluslararası İlişkiler'),
((SELECT id FROM faculties WHERE name='İktisadi ve İdari Bilimler Fakültesi'), 'Uluslararası Ticaret ve İşletmecilik (İngilizce)'),
((SELECT id FROM faculties WHERE name='İletişim Fakültesi'), 'Gazetecilik'),
((SELECT id FROM faculties WHERE name='İletişim Fakültesi'), 'Halkla İlişkiler ve Tanıtım'),
((SELECT id FROM faculties WHERE name='İletişim Fakültesi'), 'Halkla İlişkiler ve Tanıtım (Uzaktan Öğretim)'),
((SELECT id FROM faculties WHERE name='İletişim Fakültesi'), 'Radyo, Televizyon ve Sinema'),
((SELECT id FROM faculties WHERE name='Eğitim Fakültesi'), 'Fen Bilgisi Öğretmenliği'),
((SELECT id FROM faculties WHERE name='Eğitim Fakültesi'), 'İlköğretim Matematik Öğretmenliği'),
((SELECT id FROM faculties WHERE name='Eğitim Fakültesi'), 'İngilizce Öğretmenliği'),
((SELECT id FROM faculties WHERE name='Eğitim Fakültesi'), 'Okul Öncesi Öğretmenliği'),
((SELECT id FROM faculties WHERE name='Eğitim Fakültesi'), 'Özel Eğitim Öğretmenliği'),
((SELECT id FROM faculties WHERE name='Eğitim Fakültesi'), 'Rehberlik ve Psikolojik Danışmanlık'),
((SELECT id FROM faculties WHERE name='Eğitim Fakültesi'), 'Sınıf Öğretmenliği'),
((SELECT id FROM faculties WHERE name='Eğitim Fakültesi'), 'Sosyal Bilgiler Öğretmenliği'),
((SELECT id FROM faculties WHERE name='Eğitim Fakültesi'), 'Türkçe Öğretmenliği'),
((SELECT id FROM faculties WHERE name='İlahiyat Fakültesi'), 'İlahiyat'),
((SELECT id FROM faculties WHERE name='İlahiyat Fakültesi'), 'İlahiyat (M.T.O.K.)'),
((SELECT id FROM faculties WHERE name='Hukuk Fakültesi'), 'Hukuk'),
((SELECT id FROM faculties WHERE name='Güzel Sanatlar ve Tasarım Fakültesi'), 'Gastronomi ve Mutfak Sanatları'),
((SELECT id FROM faculties WHERE name='Güzel Sanatlar ve Tasarım Fakültesi'), 'Peyzaj Mimarlığı'),
((SELECT id FROM faculties WHERE name='Spor Bilimleri Fakültesi'), 'Spor Yöneticiliği')
ON CONFLICT (faculty_id, name) DO NOTHING;

CREATE OR REPLACE VIEW view_faculty_departments AS
SELECT
    f.id AS faculty_id,
    f.name AS faculty_name,
    d.id AS department_id,
    d.name AS department_name
FROM faculties f
JOIN departments d ON d.faculty_id = f.id
ORDER BY f.name, d.name;

CREATE OR REPLACE VIEW view_approved_posts AS
SELECT
    p.id,
    p.title,
    p.content,
    p.category,
    p.created_at,
    u.name AS user_name,
    u.surname AS user_surname,
    f.name AS faculty_name,
    d.name AS department_name
FROM posts p
JOIN users u ON u.id = p.user_id
JOIN departments d ON d.id = p.department_id
JOIN faculties f ON f.id = d.faculty_id
WHERE p.status = 'approved'
ORDER BY p.created_at DESC;

CREATE OR REPLACE VIEW view_pending_posts AS
SELECT
    p.id,
    p.title,
    p.content,
    p.category,
    p.created_at,
    u.email,
    u.name,
    u.surname,
    d.name AS department_name
FROM posts p
JOIN users u ON u.id = p.user_id
JOIN departments d ON d.id = p.department_id
WHERE p.status = 'pending'
ORDER BY p.created_at ASC;

CREATE OR REPLACE VIEW view_department_post_counts AS
SELECT
    d.id AS department_id,
    d.name AS department_name,
    f.name AS faculty_name,
    COUNT(p.id) AS approved_post_count
FROM departments d
JOIN faculties f ON f.id = d.faculty_id
LEFT JOIN posts p ON p.department_id = d.id AND p.status = 'approved'
GROUP BY d.id, d.name, f.name
ORDER BY f.name, d.name;

CREATE OR REPLACE VIEW view_events_with_counts AS
SELECT
    e.*,
    COUNT(ep.user_id) FILTER (WHERE ep.status = 'joined') AS participant_count
FROM events e
LEFT JOIN event_participants ep ON ep.event_id = e.id
GROUP BY e.id;

CREATE OR REPLACE VIEW view_lost_found_active AS
SELECT
    l.id,
    l.title,
    l.item_type,
    l.category,
    l.location,
    l.event_date,
    l.description,
    l.contact_email,
    l.created_at
FROM lost_found_items l
WHERE l.status = 'active'
ORDER BY l.created_at DESC;

CREATE OR REPLACE VIEW view_admin_statistics AS
SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM faculties) AS total_faculties,
    (SELECT COUNT(*) FROM departments) AS total_departments,
    (SELECT COUNT(*) FROM posts) AS total_posts,
    (SELECT COUNT(*) FROM posts WHERE status = 'pending') AS pending_posts,
    (SELECT COUNT(*) FROM posts WHERE status = 'approved') AS approved_posts,
    (SELECT COUNT(*) FROM comments) AS total_comments,
    (SELECT COUNT(*) FROM events) AS total_events,
    (SELECT COUNT(*) FROM lost_found_items WHERE status = 'active') AS active_lost_found_items;

CREATE OR REPLACE FUNCTION get_departments_by_faculty(p_faculty_id INT)
RETURNS TABLE (
    department_id INT,
    department_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT d.id, d.name
    FROM departments d
    WHERE d.faculty_id = p_faculty_id
    ORDER BY d.name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_posts_by_department(p_department_id INT)
RETURNS TABLE (
    post_id INT,
    title VARCHAR,
    content TEXT,
    category VARCHAR,
    user_name VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.title,
        p.content,
        p.category,
        u.name,
        p.created_at
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.department_id = p_department_id
      AND p.status = 'approved'
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION search_posts(p_search_text TEXT)
RETURNS TABLE (
    post_id INT,
    title VARCHAR,
    content TEXT,
    category VARCHAR,
    faculty_name VARCHAR,
    department_name VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.title,
        p.content,
        p.category,
        f.name,
        d.name,
        p.created_at
    FROM posts p
    JOIN departments d ON d.id = p.department_id
    JOIN faculties f ON f.id = d.faculty_id
    WHERE p.status = 'approved'
      AND (
        p.title ILIKE '%' || p_search_text || '%'
        OR p.content ILIKE '%' || p_search_text || '%'
        OR p.category ILIKE '%' || p_search_text || '%'
        OR d.name ILIKE '%' || p_search_text || '%'
        OR f.name ILIKE '%' || p_search_text || '%'
      )
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION register_user(
    p_name VARCHAR,
    p_surname VARCHAR,
    p_email CITEXT,
    p_password_hash VARCHAR,
    p_student_no VARCHAR,
    p_department_id INT
)
RETURNS INT AS $$
DECLARE
    new_user_id INT;
BEGIN
    IF p_email::TEXT !~* '^[A-Z0-9._%+-]+@ogr\.inonu\.edu\.tr$' THEN
        RAISE EXCEPTION 'Only @ogr.inonu.edu.tr student email addresses are allowed';
    END IF;

    INSERT INTO users (name, surname, email, password_hash, student_no, department_id)
    VALUES (p_name, p_surname, p_email, p_password_hash, p_student_no, p_department_id)
    RETURNING id INTO new_user_id;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_departments_faculty_id ON departments(faculty_id);
CREATE INDEX IF NOT EXISTS idx_courses_department_id ON courses(department_id);
CREATE INDEX IF NOT EXISTS idx_posts_department_id ON posts(department_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_announcements_department_id ON announcements(department_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_source_external_id ON events(source, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lost_found_status ON lost_found_items(status);
CREATE INDEX IF NOT EXISTS idx_posts_search_trgm ON posts USING gin ((title || ' ' || content || ' ' || category) gin_trgm_ops);
