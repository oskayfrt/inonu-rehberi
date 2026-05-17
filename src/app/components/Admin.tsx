import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Ban,
  Calendar,
  ClipboardList,
  FileText,
  Flag,
  Image,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  api,
  type AdminPost,
  type AdminUser,
  type ApiEvent,
  type BlacklistEntry,
  type ContentReport,
  type DepartmentChangeRequest,
  type DepartmentOption,
  type ExperienceSubmission,
} from '../lib/api';
import { getCurrentUser } from '../lib/auth';
import { LoadingPanel } from './DesignStates';

const emptyEventForm = {
  title: '',
  description: '',
  eventDate: '',
  eventTime: '',
  location: '',
  category: 'Üniversite',
  organizer: 'İnönü Üniversitesi',
  imageUrl: '',
  sourceUrl: '',
};

const defaultBlacklistReason = 'Topluluk kurallarını ihlal ettiği için kara listeye alındı.';

type AdminSection = 'reports' | 'experiences' | 'posts' | 'events' | 'requests' | 'users' | 'blacklist';

const adminSections: Array<{ id: AdminSection; label: string }> = [
  { id: 'reports', label: 'Raporlar' },
  { id: 'experiences', label: 'Deneyimler' },
  { id: 'posts', label: 'Paylaşımlar' },
  { id: 'events', label: 'Etkinlikler' },
  { id: 'requests', label: 'Bölüm Talepleri' },
  { id: 'users', label: 'Kullanıcılar' },
  { id: 'blacklist', label: 'Kara Liste' },
];

function formatDate(dateString: string) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatStatus(status: string) {
  if (status === 'approved') return 'Yayında';
  if (status === 'pending') return 'Beklemede';
  if (status === 'rejected') return 'Reddedildi';
  return status;
}

function formatExperienceStatus(status: string) {
  if (status === 'pending') return 'Yeni';
  if (status === 'reviewed') return 'İncelendi';
  if (status === 'published') return 'Yayınlanabilir';
  if (status === 'archived') return 'Arşivlendi';
  return status;
}

function formatReportStatus(status: string) {
  if (status === 'pending') return 'Yeni Rapor';
  if (status === 'reviewed') return 'İncelendi';
  if (status === 'dismissed') return 'İşlem Yok';
  if (status === 'action_taken') return 'İşlem Yapıldı';
  return status;
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Lütfen JPG, PNG veya WebP formatında bir görsel seç.'));
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      reject(new Error('Görsel en fazla 4 MB olabilir.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Görsel okunamadı.'));
    reader.readAsDataURL(file);
  });
}

export function Admin() {
  const currentUser = getCurrentUser();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [requests, setRequests] = useState<DepartmentChangeRequest[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [experiences, setExperiences] = useState<ExperienceSubmission[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [selectedDepartments, setSelectedDepartments] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [activeSection, setActiveSection] = useState<AdminSection>('reports');
  const [openUserMenuId, setOpenUserMenuId] = useState<number | null>(null);

  const adminId = currentUser?.id || 0;

  const loadAdminData = async () => {
    if (!adminId) return;

    setError('');
    setIsLoading(true);

    try {
      const [statsData, postRows, eventRows, userRows, departmentRows, requestRows, blacklistRows, experienceRows, reportRows] = await Promise.all([
        api.adminStatistics(adminId),
        api.adminPosts(adminId, 'all'),
        api.adminEvents(adminId),
        api.adminUsers(adminId),
        api.departments(),
        api.adminDepartmentChangeRequests(adminId),
        api.adminBlacklist(adminId),
        api.adminExperiences(adminId),
        api.adminReports(adminId),
      ]);

      setStats(statsData);
      setPosts(postRows);
      setEvents(eventRows);
      const visibleUsers = userRows.filter((user) => user.role !== 'admin');

      setUsers(visibleUsers);
      setDepartments(departmentRows);
      setRequests(requestRows);
      setBlacklist(blacklistRows);
      setExperiences(experienceRows);
      setReports(reportRows);
      setSelectedDepartments(Object.fromEntries(visibleUsers.map((user) => [user.id, user.departmentId])));
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Admin verileri yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, [adminId]);

  const statCards = useMemo(() => [
    { label: 'Kullanıcı', value: stats.total_users || 0 },
    { label: 'Paylaşım', value: stats.total_posts || 0 },
    { label: 'Yayında', value: stats.approved_posts || 0 },
    { label: 'Bekleyen Deneyim', value: stats.pending_experiences || 0 },
    { label: 'Bekleyen Rapor', value: stats.pending_reports || 0 },
    { label: 'Kara Liste', value: stats.blacklisted_users || 0 },
  ], [stats]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLocaleLowerCase('tr-TR');
    if (!query) return users;

    return users.filter((user) => {
      const searchable = [
        user.fullName,
        user.email,
        user.role,
        user.department,
        user.faculty,
        user.year,
      ].join(' ').toLocaleLowerCase('tr-TR');

      return searchable.includes(query);
    });
  }, [userSearch, users]);

  const activeReports = useMemo(
    () => reports.filter((report) => report.status === 'pending' && (report.post_id || report.reported_user_id)),
    [reports],
  );

  const runAdminAction = async (action: () => Promise<void>) => {
    setMessage('');
    setError('');

    try {
      await action();
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'İşlem tamamlanamadı.');
    }
  };

  const deletePost = async (postId: number) => {
    if (!window.confirm('Bu paylaşım kalıcı olarak silinsin mi?')) return;

    await runAdminAction(async () => {
      await api.adminDeletePost(adminId, postId);
      setMessage('Paylaşım silindi.');
      await loadAdminData();
    });
  };

  const blacklistUser = async (userId: number, email?: string) => {
    const reason = window.prompt(
      `${email || 'Bu kullanıcı'} kara listeye alınacak. Sebep yaz:`,
      defaultBlacklistReason,
    );

    if (!reason) return;

    await runAdminAction(async () => {
      await api.adminBlacklistUser(adminId, userId, reason);
      setOpenUserMenuId(null);
      setMessage('Kullanıcı silindi, paylaşımları kaldırıldı ve e-postası kara listeye alındı.');
      await loadAdminData();
    });
  };

  const deleteUser = async (userId: number, email?: string) => {
    if (!window.confirm(`${email || 'Bu kullanÄ±cÄ±'} sistemden silinsin mi? PaylaÅŸÄ±mlarÄ± ve kayÄ±tlarÄ± da kaldÄ±rÄ±lacak.`)) return;

    await runAdminAction(async () => {
      await api.adminDeleteUser(adminId, userId);
      setMessage('KullanÄ±cÄ± sistemden silindi.');
      setOpenUserMenuId(null);
      await loadAdminData();
    });
  };

  const removeFromBlacklist = async (blacklistId: number, email: string) => {
    if (!window.confirm(`${email} kara listeden çıkarılsın mı? Bu mail tekrar kayıt olabilir.`)) return;

    await runAdminAction(async () => {
      await api.adminRemoveFromBlacklist(adminId, blacklistId);
      setMessage('Kullanıcı kara listeden çıkarıldı. Aynı e-posta ile tekrar kayıt olabilir.');
      await loadAdminData();
    });
  };

  const updatePostStatus = async (postId: number, status: 'approved' | 'rejected') => {
    await runAdminAction(async () => {
      await api.adminUpdatePostStatus(adminId, postId, status);
      setMessage(status === 'approved' ? 'Paylaşım yayına alındı.' : 'Paylaşım gizlendi.');
      await loadAdminData();
    });
  };

  const handleEventImageFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await readImageFile(file);
      setEventForm((current) => ({ ...current, imageUrl }));
      setError('');
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'Görsel seçilemedi.');
    } finally {
      event.target.value = '';
    }
  };

  const createEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    await runAdminAction(async () => {
      await api.adminCreateEvent(adminId, eventForm);
      setEventForm(emptyEventForm);
      setMessage('Etkinlik eklendi.');
      await loadAdminData();
    });
  };

  const deleteEvent = async (eventId: number) => {
    if (!window.confirm('Bu etkinlik silinsin mi?')) return;

    await runAdminAction(async () => {
      await api.adminDeleteEvent(adminId, eventId);
      setMessage('Etkinlik silindi.');
      await loadAdminData();
    });
  };

  const changeUserDepartment = async (userId: number) => {
    const departmentId = selectedDepartments[userId];
    if (!departmentId) return;

    await runAdminAction(async () => {
      await api.adminUpdateUserDepartment(adminId, userId, departmentId);
      setOpenUserMenuId(null);
      setMessage('Kullanıcının bölümü güncellendi.');
      await loadAdminData();
    });
  };

  const resolveRequest = async (requestId: number, status: 'approved' | 'rejected') => {
    await runAdminAction(async () => {
      await api.adminResolveDepartmentChangeRequest(adminId, requestId, status);
      setMessage(status === 'approved' ? 'Bölüm değişikliği onaylandı.' : 'Bölüm değişikliği reddedildi.');
      await loadAdminData();
    });
  };

  const updateExperienceStatus = async (
    experienceId: number,
    status: 'pending' | 'reviewed' | 'published' | 'archived',
  ) => {
    await runAdminAction(async () => {
      await api.adminUpdateExperience(adminId, experienceId, status);
      setMessage('Deneyim bildirimi güncellendi.');
      await loadAdminData();
    });
  };

  const deleteExperience = async (experienceId: number) => {
    if (!window.confirm('Bu deneyim bildirimi silinsin mi?')) return;

    await runAdminAction(async () => {
      await api.adminDeleteExperience(adminId, experienceId);
      setMessage('Deneyim bildirimi silindi.');
      await loadAdminData();
    });
  };

  const updateReportStatus = async (
    reportId: number,
    status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken',
  ) => {
    await runAdminAction(async () => {
      await api.adminUpdateReport(adminId, reportId, status);
      setMessage('Rapor durumu güncellendi.');
      await loadAdminData();
    });
  };

  const deleteReportedPost = async (report: ContentReport) => {
    const postId = report.post_id;

    if (!postId) {
      await runAdminAction(async () => {
        await api.adminUpdateReport(adminId, report.id, 'action_taken');
        setMessage('Paylaşım zaten sistemde bulunmadığı için rapor kapatıldı.');
        await loadAdminData();
      });
      return;
    }

    if (!window.confirm('Raporlanan paylaşım kalıcı olarak silinsin mi?')) return;

    await runAdminAction(async () => {
      try {
        await api.adminDeletePost(adminId, postId);
        setMessage('Raporlanan paylaşım silindi ve rapor kapatıldı.');
      } catch (apiError) {
        const apiMessage = apiError instanceof Error ? apiError.message : '';

        if (!apiMessage.includes('Paylaşım bulunamadı')) {
          throw apiError;
        }

        setMessage('Paylaşım zaten sistemde bulunmadığı için rapor kapatıldı.');
      }

      await api.adminUpdateReport(adminId, report.id, 'action_taken');
      await loadAdminData();
    });
  };

  const blacklistReportedUser = async (report: ContentReport) => {
    const reportedUserId = report.reported_user_id;

    if (!reportedUserId) {
      await runAdminAction(async () => {
        await api.adminUpdateReport(adminId, report.id, 'action_taken');
        setMessage('Kullanıcı zaten sistemde bulunmadığı için rapor kapatıldı.');
        await loadAdminData();
      });
      return;
    }

    const reason = window.prompt(
      `${report.reported_user_email || 'Bu kullanıcı'} kara listeye alınacak. Sebep yaz:`,
      `Raporlanan içerik nedeniyle: ${report.reason}`,
    );

    if (!reason) return;

    await runAdminAction(async () => {
      try {
        await api.adminBlacklistUser(adminId, reportedUserId, reason);
        setMessage('Raporlanan kullanıcı kara listeye alındı ve rapor kapatıldı.');
      } catch (apiError) {
        const apiMessage = apiError instanceof Error ? apiError.message : '';

        if (!apiMessage.includes('Kullanıcı bulunamadı')) {
          throw apiError;
        }

        setMessage('Kullanıcı zaten sistemde bulunmadığı için rapor kapatıldı.');
      }

      await api.adminUpdateReport(adminId, report.id, 'action_taken');
      await loadAdminData();
    });
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Bu sayfaya yalnızca admin kullanıcılar erişebilir.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#1e3a8a]" />
            Admin Paneli
          </h1>
          <p className="text-gray-600">Paylaşım, etkinlik, kullanıcı, bölüm ve kara liste yönetimi</p>
        </div>
        <button
          onClick={loadAdminData}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-white hover:bg-[#1e40af]"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {message && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">{message}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}
      {isLoading && <LoadingPanel label="Admin verileri yükleniyor..." />}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="min-h-[112px] rounded-2xl bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5">
            <p className="text-sm text-gray-500">{card.label}</p>
            <h2 className="mt-2">{card.value}</h2>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {adminSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm transition-colors ${
                activeSection === section.id
                  ? 'bg-[#1e3a8a] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-[#1e3a8a]'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <section className={activeSection === 'reports' ? 'rounded-2xl bg-white p-6 shadow-md' : 'hidden'}>
        <h2 className="mb-2 flex items-center gap-2">
          <Flag className="w-5 h-5 text-red-600" />
          Raporlanan İçerikler
        </h2>
        <p className="mb-5 text-sm text-gray-500">
          Öğrenciler uygunsuz gördükleri paylaşımları buraya raporlar. Gerekirse paylaşımı silebilir veya kullanıcıyı kara listeye alabilirsin.
        </p>
        <div className="space-y-4">
          {activeReports.map((report) => (
            <div key={report.id} className="rounded-xl border border-red-100 bg-red-50/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-4xl">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-red-700">
                      {formatReportStatus(report.status)}
                    </span>
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-700">
                      {report.reason}
                    </span>
                  </div>
                  <h3>{report.post_title || 'Silinmiş paylaşım'}</h3>
                  <p className="mt-2 text-gray-700">{report.post_content || 'Paylaşım içeriği artık sistemde yok.'}</p>
                  {report.details && <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-gray-700">Rapor açıklaması: {report.details}</p>}
                  <p className="mt-3 text-sm text-gray-600">
                    Raporlanan: {report.reported_user_name || 'Silinmiş kullanıcı'} {report.reported_user_email ? `• ${report.reported_user_email}` : ''}
                  </p>
                  <p className="text-sm text-gray-500">
                    Raporlayan: {`${report.reporter_name || ''} ${report.reporter_surname || ''}`.trim() || 'Bilinmiyor'} {report.reporter_email ? `• ${report.reporter_email}` : ''} • {formatDate(report.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => updateReportStatus(report.id, 'reviewed')} className="rounded-lg bg-white px-3 py-2 text-[#1e3a8a] shadow-sm hover:bg-blue-50">
                    İncelendi
                  </button>
                  <button type="button" onClick={() => updateReportStatus(report.id, 'dismissed')} className="rounded-lg bg-white px-3 py-2 text-gray-700 shadow-sm hover:bg-gray-100">
                    İşlem Yok
                  </button>
                  {report.post_id && (
                    <button type="button" onClick={() => deleteReportedPost(report)} className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100">
                      <Trash2 className="w-4 h-4" />
                      Paylaşımı Sil
                    </button>
                  )}
                  {report.reported_user_id && (
                    <button type="button" onClick={() => blacklistReportedUser(report)} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-700">
                      <Ban className="w-4 h-4" />
                      Kara Liste
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {activeReports.length === 0 && <p className="text-gray-500">Açık rapor bulunmuyor.</p>}
        </div>
      </section>

      <section className={activeSection === 'experiences' ? 'rounded-2xl bg-white p-6 shadow-md' : 'hidden'}>
        <h2 className="mb-2 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[#1e3a8a]" />
          Deneyim Bildirimleri
        </h2>
        <p className="mb-5 text-sm text-gray-500">
          Öğrenciler kampüs, bölüm, ders veya öğrenci işleri deneyimlerini form üzerinden inceleme sürecine gönderir.
        </p>
        <div className="space-y-4">
          {experiences.map((experience) => (
            <div key={experience.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-4xl">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-[#1e3a8a]">
                      {formatExperienceStatus(experience.status)}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-700">
                      {experience.category}
                    </span>
                  </div>
                  <h3>{experience.title}</h3>
                  <p className="mt-2 text-gray-700">{experience.content}</p>
                  <p className="mt-3 text-sm text-gray-500">
                    {`${experience.user_name || ''} ${experience.user_surname || ''}`.trim() || 'Silinmiş kullanıcı'} {experience.email ? `• ${experience.email}` : ''} • {experience.department_name || 'Bölüm yok'} • {formatDate(experience.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => updateExperienceStatus(experience.id, 'reviewed')} className="rounded-lg bg-[#1e3a8a] px-3 py-2 text-white hover:bg-[#1e40af]">
                    İncelendi
                  </button>
                  <button onClick={() => updateExperienceStatus(experience.id, 'published')} className="rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-700">
                    Yayınlanabilir
                  </button>
                  <button onClick={() => updateExperienceStatus(experience.id, 'archived')} className="rounded-lg bg-amber-500 px-3 py-2 text-white hover:bg-amber-600">
                    Arşivle
                  </button>
                  <button onClick={() => deleteExperience(experience.id)} className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {experiences.length === 0 && <p className="text-gray-500">Henüz öğrenci deneyimi gönderilmedi.</p>}
        </div>
      </section>

      <section className={activeSection === 'posts' ? 'rounded-2xl bg-white p-6 shadow-md' : 'hidden'}>
        <h2 className="mb-2 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#1e3a8a]" />
          Paylaşım Moderasyonu
        </h2>
        <p className="mb-5 text-sm text-gray-500">
          Yeni paylaşımlar direkt yayınlanır. Kural ihlalinde paylaşımı silebilir veya kullanıcıyı kara listeye alabilirsin.
        </p>
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3>{post.title}</h3>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-[#1e3a8a]">
                      {formatStatus(post.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    {post.department_name} • {post.email} • {formatDate(post.created_at)}
                  </p>
                  <p className="text-gray-700">{post.content}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.status !== 'approved' && (
                    <button onClick={() => updatePostStatus(post.id, 'approved')} className="rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-700">
                      Yayına Al
                    </button>
                  )}
                  {post.status !== 'rejected' && (
                    <button onClick={() => updatePostStatus(post.id, 'rejected')} className="rounded-lg bg-amber-500 px-3 py-2 text-white hover:bg-amber-600">
                      Gizle
                    </button>
                  )}
                  <button onClick={() => deletePost(post.id)} className="rounded-lg bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => blacklistUser(post.user_id, post.email)} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-700">
                    <Ban className="w-4 h-4" />
                    Kara Liste
                  </button>
                </div>
              </div>
            </div>
          ))}
          {posts.length === 0 && <p className="text-gray-500">Henüz paylaşım yok.</p>}
        </div>
      </section>

      <section className={activeSection === 'events' ? 'grid grid-cols-1 xl:grid-cols-2 gap-6' : 'hidden'}>
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#1e3a8a]" />
            Etkinlik Ekle
          </h2>
          <form onSubmit={createEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 md:col-span-2" placeholder="Etkinlik adı" value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} required />
            <input type="date" className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3" value={eventForm.eventDate} onChange={(event) => setEventForm({ ...eventForm, eventDate: event.target.value })} required />
            <input className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3" placeholder="Saat" value={eventForm.eventTime} onChange={(event) => setEventForm({ ...eventForm, eventTime: event.target.value })} />
            <input className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3" placeholder="Kategori" value={eventForm.category} onChange={(event) => setEventForm({ ...eventForm, category: event.target.value })} />
            <input className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3" placeholder="Konum" value={eventForm.location} onChange={(event) => setEventForm({ ...eventForm, location: event.target.value })} />
            <input className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3" placeholder="Düzenleyen" value={eventForm.organizer} onChange={(event) => setEventForm({ ...eventForm, organizer: event.target.value })} />
            <input className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3" placeholder="Görsel URL" value={eventForm.imageUrl} onChange={(event) => setEventForm({ ...eventForm, imageUrl: event.target.value })} />
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-gray-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">
              <Upload className="h-4 w-4" />
              Bilgisayardan Görsel Seç
              <input type="file" accept="image/*" onChange={handleEventImageFile} className="sr-only" />
            </label>
            {eventForm.imageUrl && (
              <div className="md:col-span-2 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 text-sm text-gray-600">
                  <span className="inline-flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Etkinlik görseli seçildi
                  </span>
                  <button type="button" onClick={() => setEventForm({ ...eventForm, imageUrl: '' })} className="rounded-md p-1 text-gray-500 hover:bg-white hover:text-red-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <img src={eventForm.imageUrl} alt="" className="h-44 w-full object-cover" />
              </div>
            )}
            <input className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 md:col-span-2" placeholder="Kaynak URL" value={eventForm.sourceUrl} onChange={(event) => setEventForm({ ...eventForm, sourceUrl: event.target.value })} />
            <textarea className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 md:col-span-2 min-h-28" placeholder="Açıklama" value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} required />
            <button className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-3 text-white hover:bg-[#1e40af]">
              <Plus className="w-4 h-4" />
              Etkinlik Ekle
            </button>
          </form>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="mb-4">Etkinlik Listesi</h2>
          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {events.map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div>
                  <h4>{event.title}</h4>
                  <p className="text-sm text-gray-500">{formatDate(event.date)} • {event.location}</p>
                </div>
                <button onClick={() => deleteEvent(event.id)} className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={activeSection === 'requests' ? 'rounded-2xl bg-white p-6 shadow-md' : 'hidden'}>
        <h2 className="mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-[#1e3a8a]" />
          Bölüm Değişikliği Talepleri
        </h2>
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4>{request.name} {request.surname}</h4>
                  <p className="text-sm text-gray-600">{request.current_department_name} → {request.requested_department_name}</p>
                  {request.note && <p className="mt-2 text-gray-700">{request.note}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => resolveRequest(request.id, 'approved')} className="rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-700">Onayla</button>
                  <button onClick={() => resolveRequest(request.id, 'rejected')} className="rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-700">Reddet</button>
                </div>
              </div>
            </div>
          ))}
          {requests.length === 0 && <p className="text-gray-500">Bekleyen bölüm değişikliği talebi yok.</p>}
        </div>
      </section>

      <section className={activeSection === 'users' ? 'rounded-2xl bg-white p-6 shadow-md' : 'hidden'}>
        <h2 className="mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#1e3a8a]" />
          Kullanıcı Yönetimi
        </h2>
        <div className="mb-4">
          <div className="relative w-full xl:max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              placeholder="Ad, e-posta veya bölüm ara"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {filteredUsers.length} / {users.length} kullanıcı gösteriliyor.
          </p>
        </div>
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <div key={user.id} className="relative grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 items-center">
              <div className="min-w-0">
                <h4 className="truncate">{user.fullName}</h4>
                <p className="truncate text-sm text-gray-600">{user.email} • {user.department}</p>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenUserMenuId(openUserMenuId === user.id ? null : user.id)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-100"
                  aria-label="Kullanıcı işlemleri"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>

                {openUserMenuId === user.id && (
                  <div className="absolute right-0 top-12 z-30 w-96 max-w-[calc(100vw-3rem)] rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-900">Kullanıcı İşlemleri</p>
                      <p className="mt-1 truncate text-xs text-gray-500">{user.email}</p>
                    </div>

                    <label className="mb-3 block">
                      <span className="mb-2 block text-xs font-medium text-gray-500">Bölüm değiştir</span>
                      <select
                        value={selectedDepartments[user.id] || user.departmentId || ''}
                        onChange={(event) => setSelectedDepartments({ ...selectedDepartments, [user.id]: Number(event.target.value) })}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                      >
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name} - {department.faculty_name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => changeUserDepartment(user.id)}
                      className="mb-3 w-full rounded-lg bg-[#1e3a8a] px-4 py-3 text-white transition-colors hover:bg-[#1e40af]"
                    >
                      Bölümü Güncelle
                    </button>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => deleteUser(user.id, user.email)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-3 text-red-700 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Kullanıcıyı Sil
                      </button>
                      <button
                        type="button"
                        onClick={() => blacklistUser(user.id, user.email)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-white transition-colors hover:bg-red-700"
                      >
                        <Ban className="w-4 h-4" />
                        Kara Liste
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-gray-500">
              Aramaya uyan kullanıcı bulunamadı.
            </div>
          )}
        </div>
      </section>

      <section className={activeSection === 'blacklist' ? 'rounded-2xl bg-white p-6 shadow-md' : 'hidden'}>
        <h2 className="mb-4 flex items-center gap-2">
          <Ban className="w-5 h-5 text-red-600" />
          Kara Liste
        </h2>
        <div className="space-y-3">
          {blacklist.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-red-100 bg-red-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4>{entry.full_name || entry.email}</h4>
                  <p className="text-sm text-gray-700">{entry.email}</p>
                  <p className="mt-2 text-sm text-red-700">{entry.reason}</p>
                  <p className="mt-2 text-xs text-gray-500">{formatDate(entry.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromBlacklist(entry.id, entry.email)}
                  className="rounded-lg bg-white px-4 py-3 text-[#1e3a8a] shadow-sm transition-colors hover:bg-blue-50"
                >
                  Kara Listeden Çıkar
                </button>
              </div>
            </div>
          ))}
          {blacklist.length === 0 && <p className="text-gray-500">Kara listede kullanıcı yok.</p>}
        </div>
      </section>
    </div>
  );
}
