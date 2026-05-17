import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatStudentYear, getCurrentUser, type AuthUser } from '../lib/auth';
import { api, type ApiEvent, type ApiPost } from '../lib/api';
import { LoadingPanel } from './DesignStates';

const slideColors = [
  'from-[#1e3a8a] via-[#3b82f6] to-[#60a5fa]',
  'from-purple-600 via-purple-500 to-pink-500',
  'from-green-600 via-teal-500 to-blue-500',
  'from-orange-600 via-red-500 to-pink-500',
];

const categoryImages: Record<string, string> = {
  Konser: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1800&q=80',
  'Kariyer Fuarı': 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1800&q=80',
  'Proje Fırsatı': 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1800&q=80',
  Üniversite: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1800&q=80',
  'Kültür Sanat': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1800&q=80',
  Malatya: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80',
};

function formatDate(dateString: string) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getEventImage(event: ApiEvent) {
  return event.imageUrl || categoryImages[event.category] || categoryImages.Üniversite;
}

function formatRelativeDate(dateString: string) {
  if (!dateString) return '';

  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / 86400000));

  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return '1 gün önce';
  return `${diffDays} gün önce`;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [recentPosts, setRecentPosts] = useState<ApiPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      navigate('/login');
      return;
    }

    setUser(currentUser);

    Promise.all([
      api.events(),
      currentUser.role === 'admin'
        ? Promise.resolve([])
        : api.posts({ departmentId: currentUser.departmentId, limit: 3 }),
    ])
      .then(([eventRows, postRows]) => {
        setEvents(eventRows);
        setRecentPosts(postRows);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Veriler yüklenemedi.'))
      .finally(() => setIsLoading(false));
  }, [navigate]);

  const isAdmin = user?.role === 'admin';
  const carouselEvents = useMemo(() => events.slice(0, 6), [events]);
  const featuredEvent = carouselEvents[currentSlide] || carouselEvents[0];
  const otherEvents = useMemo(() => events.slice(6, 9), [events]);

  useEffect(() => {
    if (carouselEvents.length < 2) return;

    const interval = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselEvents.length);
    }, 7000);

    return () => window.clearInterval(interval);
  }, [carouselEvents.length]);

  const nextSlide = () => {
    if (carouselEvents.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % carouselEvents.length);
  };

  const prevSlide = () => {
    if (carouselEvents.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + carouselEvents.length) % carouselEvents.length);
  };

  const openEventDetail = (event: ApiEvent) => {
    if (event.sourceUrl) {
      window.open(event.sourceUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    navigate('/events');
  };

  if (!user) return null;

  return (
    <div className="p-0">
      <div className="px-4 pt-4 md:px-8 md:pt-8 mb-8">
        {featuredEvent ? (
          <section className="overflow-hidden rounded-3xl bg-white shadow-xl">
            <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_440px]">
              <button
                type="button"
                onClick={() => openEventDetail(featuredEvent)}
                className="group relative min-h-[360px] overflow-hidden text-left lg:min-h-[520px]"
              >
                <img
                  src={getEventImage(featuredEvent)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="eager"
                  onError={(event) => {
                    event.currentTarget.src = 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1800&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-10">
                  <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
                    <CalendarIcon className="h-4 w-4" />
                    {formatDate(featuredEvent.date)}
                  </span>
                  <h2 className="mb-4 max-w-4xl text-3xl leading-tight md:text-5xl">{featuredEvent.title}</h2>
                  <p className="line-clamp-3 max-w-3xl text-base leading-7 text-white/90 md:text-xl">{featuredEvent.description}</p>
                </div>

                {carouselEvents.length > 1 && (
                  <div className="absolute right-5 top-5 flex gap-2">
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        prevSlide();
                      }}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/30"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </span>
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        nextSlide();
                      }}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/30"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </span>
                  </div>
                )}
              </button>

              <aside className="flex max-h-[520px] flex-col border-t border-gray-100 bg-white p-5 lg:border-l lg:border-t-0">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-[#1e3a8a]">Resmi ve güncel</p>
                    <h2 className="text-2xl">Yaklaşan Etkinlikler</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/events')}
                    className="rounded-xl bg-blue-50 px-4 py-2 text-sm text-[#1e3a8a] hover:bg-blue-100"
                  >
                    Tümü
                  </button>
                </div>

                <div className="space-y-3 overflow-y-auto pr-1">
                  {carouselEvents.map((event, index) => {
                    const isActive = index === currentSlide;

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setCurrentSlide(index)}
                        className={`grid w-full grid-cols-[64px_1fr] gap-4 rounded-2xl p-3 text-left transition-all ${
                          isActive
                            ? 'bg-blue-50 ring-2 ring-[#1e3a8a]/20'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className={`flex h-16 w-16 flex-col items-center justify-center rounded-xl border text-center ${
                          isActive ? 'border-[#1e3a8a] bg-white text-[#1e3a8a]' : 'border-gray-200 bg-gray-50 text-gray-600'
                        }`}>
                          <strong className="text-xl leading-none">{new Date(event.date).toLocaleDateString('tr-TR', { day: 'numeric' })}</strong>
                          <span className="mt-1 text-xs">{new Date(event.date).toLocaleDateString('tr-TR', { month: 'short' })}</span>
                        </span>
                        <span className="min-w-0">
                          <span className="line-clamp-2 font-semibold text-gray-900">{event.title}</span>
                          <span className="mt-2 flex flex-wrap gap-2 text-sm text-gray-500">
                            <span className="line-clamp-1">{event.location || 'İnönü Üniversitesi'}</span>
                            {event.time && <span>{event.time}</span>}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>
            </div>
          </section>
        ) : (
          <div className="rounded-3xl bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] p-10 text-center text-white shadow-xl">
            <CalendarIcon className="mx-auto mb-5 h-16 w-16 opacity-90" />
            <h2 className="mb-3 text-3xl">Henüz etkinlik yok</h2>
            <p className="text-blue-100">Veritabanına etkinlik eklendiğinde burada görünecek.</p>
          </div>
        )}
      </div>

      <div className="px-4 md:px-8 mb-8">
        <h1 className="text-3xl mb-2">Hoş Geldiniz, {user.fullName}</h1>
        <p className="text-gray-600">
          {isAdmin ? 'Sistem Yöneticisi' : `${user.department} • ${formatStudentYear(user.year || '')}`}
        </p>
        {loadError && <p className="text-red-600 mt-3">{loadError}</p>}
      </div>

      {!isAdmin ? (
        <div className="px-4 md:px-8 mb-8">
          <h2 className="mb-4">{user.department} - Son Tavsiyeler</h2>
          {isLoading ? (
            <LoadingPanel label="Son tavsiyeler yükleniyor..." />
          ) : recentPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentPosts.map((post) => (
                <div key={post.id} className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all">
                  <h4 className="mb-2">{post.title}</h4>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md">{post.category}</span>
                    <span>{formatRelativeDate(post.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow-sm text-gray-600">
              Bu bölüm için yayınlanmış paylaşım yok.
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 md:px-8 mb-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-2">Admin Görünümü</h2>
            <p className="text-gray-600">
              Admin hesabı öğrenci bölümü ve sınıfı taşımaz. Öğrenci paylaşımları, kullanıcılar ve kara liste işlemleri admin panelinden yönetilir.
            </p>
          </div>
        </div>
      )}

      <div className="px-4 md:px-8 mb-8">
        <h2 className="mb-4">Yaklaşan Diğer Etkinlikler</h2>
        {otherEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {otherEvents.map((event) => (
              <div key={event.id} className="group overflow-hidden bg-white rounded-xl shadow-md hover:-translate-y-1 hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/events')}>
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img
                    src={getEventImage(event)}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-sm text-[#1e3a8a] shadow-sm">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="mb-2 line-clamp-2">{event.title}</h3>
                  <p className="mb-3 line-clamp-3 min-h-[60px] text-sm leading-5 text-gray-600">{event.description}</p>
                  <div className="line-clamp-1 text-sm text-[#1e3a8a]">{event.location} {event.time && `• ${event.time}`}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl shadow-sm text-gray-600">
            Ek etkinlik bulunmuyor.
          </div>
        )}
      </div>
    </div>
  );
}
