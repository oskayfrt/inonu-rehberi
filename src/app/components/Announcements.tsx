import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, Building2, Calendar, CheckCircle, ExternalLink, Info, Megaphone, Pin } from 'lucide-react';
import { api, type ApiAnnouncement } from '../lib/api';
import { getCurrentUser, type AuthUser } from '../lib/auth';
import { getInonuDepartmentUrl } from '../lib/inonuLinks';
import { EmptyState, LoadingPanel } from './DesignStates';

function formatDate(dateString: string) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getTypeConfig(type: string) {
  const configs: Record<string, { icon: typeof Info; color: string; bgColor: string; label: string }> = {
    important: {
      icon: AlertCircle,
      color: 'text-red-700',
      bgColor: 'bg-red-50 border-red-200',
      label: 'Önemli',
    },
    info: {
      icon: Info,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-200',
      label: 'Bilgilendirme',
    },
    success: {
      icon: CheckCircle,
      color: 'text-green-700',
      bgColor: 'bg-green-50 border-green-200',
      label: 'Güncelleme',
    },
  };

  return configs[type] || configs.info;
}

function AnnouncementCard({ announcement }: { announcement: ApiAnnouncement }) {
  const config = getTypeConfig(announcement.type);
  const Icon = config.icon;

  return (
    <div className={`bg-white rounded-2xl shadow-md hover:shadow-lg transition-all p-6 border-l-4 ${
      announcement.isPinned ? 'border-l-[#1e3a8a]' : 'border-l-transparent'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${config.bgColor}`}>
          <Icon className={`w-6 h-6 ${config.color}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="flex-1">{announcement.title}</h3>
            {announcement.isPinned && <Pin className="w-5 h-5 text-[#1e3a8a] flex-shrink-0" />}
          </div>
          <p className="text-gray-700 mb-4">{announcement.content}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(announcement.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>{announcement.department}</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs ${config.bgColor} ${config.color}`}>
              {config.label}
            </span>
            {announcement.sourceUrl && (
              <a href={announcement.sourceUrl} target="_blank" rel="noreferrer" className="text-[#1e3a8a] hover:underline">
                Resmi kaynak
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Announcements() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      navigate('/login');
      return;
    }

    setUser(currentUser);

    if (currentUser.role === 'admin') {
      setIsLoading(false);
      return;
    }

    if (!currentUser.departmentId) {
      setLoadError('Bölüm bilgisi bulunamadı. Lütfen çıkış yapıp tekrar giriş yap.');
      setIsLoading(false);
      return;
    }

    api.announcements({ departmentId: currentUser.departmentId })
      .then(setAnnouncements)
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Duyurular yüklenemedi.'))
      .finally(() => setIsLoading(false));
  }, [navigate]);

  const isAdmin = user?.role === 'admin';
  const pinnedAnnouncements = announcements.filter((announcement) => announcement.isPinned);
  const regularAnnouncements = announcements.filter((announcement) => !announcement.isPinned);
  const departmentUrl = user && !isAdmin ? getInonuDepartmentUrl(user.department) : '';

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 flex items-center gap-3">
          <Megaphone className="w-8 h-8 text-[#1e3a8a]" />
          Duyurular
        </h1>
        <p className="text-gray-600">
          {isAdmin
            ? 'Admin hesabı öğrenci bölümüne bağlı değildir.'
            : user
              ? `${user.department} resmi bölüm duyuruları`
              : 'Bölüm duyuruları yükleniyor'}
        </p>
        {loadError && <p className="text-red-600 mt-3">{loadError}</p>}
      </div>

      {isLoading && (
        <LoadingPanel label="Duyurular yükleniyor..." />
      )}

      {!isLoading && isAdmin && (
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="mb-3">Admin Görünümü</h2>
          <p className="text-gray-600">
            Duyurular öğrencinin kayıtlı bölümüne göre gösterilir. Admin hesabı öğrenci olmadığı için
            burada Kimya, Bilgisayar Mühendisliği veya başka bir bölüm duyurusu otomatik açılmaz.
          </p>
        </div>
      )}

      {!isLoading && user && !isAdmin && (
        <a
          href={departmentUrl}
          target="_blank"
          rel="noreferrer"
          className="mb-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-gray-700 shadow-sm transition-colors hover:text-[#1e3a8a] hover:shadow-md"
        >
          <Building2 className="w-5 h-5 text-[#1e3a8a]" />
          <span>{user.department}</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      )}

      {pinnedAnnouncements.length > 0 && (
        <div className="mb-8">
          <h2 className="flex items-center gap-2 mb-4">
            <Pin className="w-5 h-5 text-[#1e3a8a]" />
            Sabitlenmiş Duyurular
          </h2>
          <div className="space-y-4">
            {pinnedAnnouncements.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))}
          </div>
        </div>
      )}

      {regularAnnouncements.length > 0 && (
        <div>
          <h2 className="mb-4">Tüm Duyurular</h2>
          <div className="space-y-4">
            {regularAnnouncements.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && !isAdmin && announcements.length === 0 && (
        <EmptyState
          icon={Megaphone}
          title="Duyuru bulunamadı"
          description="Bölümüne ait resmi duyuru veya genel üniversite duyurusu eklendiğinde burada görünecek."
        />
      )}
    </div>
  );
}
