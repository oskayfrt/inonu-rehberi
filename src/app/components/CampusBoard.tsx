import { useEffect, useMemo, useState } from 'react';
import { FileText, Flag, Lightbulb, MapPin, Package, Search, Trash2, Users, X } from 'lucide-react';
import { api, type ApiPost } from '../lib/api';
import { getCurrentUser } from '../lib/auth';
import { EmptyState, LoadingPanel } from './DesignStates';
import { ReportPostModal } from './ReportPostModal';

const categories = [
  { value: 'all', label: 'Tümü', icon: Users },
  { value: 'campus-tip', label: 'Kampüs Önerisi', icon: MapPin },
  { value: 'student-affairs', label: 'Öğrenci İşleri', icon: FileText },
  { value: 'general', label: 'Genel Bilgi', icon: Package },
];

const categoryLabels: Record<string, string> = {
  'campus-tip': 'Kampüs Önerisi',
  'student-affairs': 'Öğrenci İşleri',
  general: 'Genel Bilgi',
};

const categoryVisuals: Record<string, { accent: string; panel: string }> = {
  'campus-tip': {
    accent: 'from-sky-600 to-cyan-500',
    panel: 'bg-sky-50 text-sky-700',
  },
  'student-affairs': {
    accent: 'from-indigo-600 to-blue-500',
    panel: 'bg-indigo-50 text-indigo-700',
  },
  general: {
    accent: 'from-[#1e3a8a] to-[#3b82f6]',
    panel: 'bg-blue-50 text-[#1e3a8a]',
  },
};

function getCategoryVisual(category: string) {
  return categoryVisuals[category] || categoryVisuals.general;
}

function formatDate(dateString: string) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function CampusBoard() {
  const user = getCurrentUser();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [selectedPost, setSelectedPost] = useState<ApiPost | null>(null);
  const [reportingPost, setReportingPost] = useState<ApiPost | null>(null);
  const [reportMessage, setReportMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPosts = () => {
    setIsLoading(true);
    api.posts({ scope: 'global', limit: 100 })
      .then((rows) => {
        setPosts(rows);
        setError('');
      })
      .catch((apiError) => setError(apiError instanceof Error ? apiError.message : 'Kampüs panosu yüklenemedi.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    const normalizedSearch = searchText.trim().toLocaleLowerCase('tr-TR');

    return posts.filter((post) => {
      const categoryMatches = activeCategory === 'all' || post.category === activeCategory;
      const searchMatches = !normalizedSearch
        || post.title.toLocaleLowerCase('tr-TR').includes(normalizedSearch)
        || post.content.toLocaleLowerCase('tr-TR').includes(normalizedSearch)
        || post.userName.toLocaleLowerCase('tr-TR').includes(normalizedSearch);

      return categoryMatches && searchMatches;
    });
  }, [activeCategory, posts, searchText]);

  const deleteOwnPost = async (postId: number) => {
    if (!user?.id) return;
    if (!window.confirm('Bu paylaşımı kaldırmak istediğine emin misin?')) return;

    try {
      await api.deletePost(user.id, postId);
      setPosts((current) => current.filter((post) => post.id !== postId));
      setError('');
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Paylaşım silinemedi.');
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-8 w-8 text-[#1e3a8a]" />
          <h1 className="text-3xl">Kampüs Panosu</h1>
        </div>
        <p className="mt-2 text-gray-600">
          Tüm öğrencilerin görebileceği kampüs önerileri, öğrenci işleri deneyimleri ve genel bilgiler.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.value}
                type="button"
                onClick={() => setActiveCategory(category.value)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 transition-colors ${
                  activeCategory === category.value
                    ? 'bg-[#1e3a8a] text-white'
                    : 'bg-white text-gray-700 shadow-sm hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {category.label}
              </button>
            );
          })}
        </div>

        <label className="flex min-w-full items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm lg:min-w-[340px]">
          <Search className="h-5 w-5 text-gray-500" />
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Pano içinde ara"
            className="w-full bg-transparent outline-none"
          />
        </label>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}
      {reportMessage && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          {reportMessage}
        </div>
      )}

      {isLoading ? (
        <LoadingPanel label="Kampüs panosu yükleniyor..." />
      ) : filteredPosts.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),360px))] justify-start gap-4">
          {filteredPosts.map((post) => {
            const visual = getCategoryVisual(post.category);

            return (
              <article
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="group relative cursor-pointer overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`relative min-h-[88px] bg-gradient-to-br ${visual.accent} p-4 text-white`}>
                  <div className="absolute right-3 top-3 opacity-20 transition-transform group-hover:scale-105">
                    <Package className="h-10 w-10" />
                  </div>
                  <span className="inline-flex rounded-full bg-white/18 px-2.5 py-1 text-xs backdrop-blur">
                    {categoryLabels[post.category] || post.category}
                  </span>
                  <h2 className="relative mt-3 line-clamp-2 pr-10 text-base leading-snug">{post.title}</h2>
                </div>

                <div className="p-4">
                  <p className="mb-4 line-clamp-2 text-sm leading-5 text-gray-700">{post.content}</p>
                  <div className="flex items-end justify-between gap-3 border-t border-gray-100 pt-3 text-sm text-gray-500">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-gray-700">{post.userName}</p>
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span>{formatDate(post.createdAt)}</span>
                        <span className={`max-w-[180px] truncate rounded-full px-2.5 py-1 text-xs ${visual.panel}`}>{post.department}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {post.userId === user?.id && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteOwnPost(post.id);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-2 text-sm text-red-600 shadow-sm transition-colors hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          Sil
                        </button>
                      )}
                      {post.userId !== user?.id && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setReportingPost(post);
                            setReportMessage('');
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-2 text-sm text-gray-500 shadow-sm transition-colors hover:bg-amber-50 hover:text-amber-700"
                          title="Paylaşımı raporla"
                          aria-label="Paylaşımı raporla"
                        >
                          <Flag className="h-4 w-4" />
                          Raporla
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title="Pano boş"
          description="Genel paylaşımlar yapıldığında burada görünecek. Kampüs önerisi, öğrenci işleri ve genel bilgi kategorileri herkesin panosunda listelenir."
        />
      )}

      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedPost(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] p-6 text-white">
              <div className="mb-4 flex items-start justify-between gap-4">
                <span className="rounded-full bg-white/18 px-3 py-1 text-sm backdrop-blur">
                  {categoryLabels[selectedPost.category] || selectedPost.category}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPost(null)}
                  className="rounded-lg bg-white/15 p-2 transition-colors hover:bg-white/25"
                  aria-label="Detayı kapat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <h2 className="text-2xl leading-tight">{selectedPost.title}</h2>
            </div>
            <div className="space-y-5 overflow-y-auto p-6">
              <p className="whitespace-pre-wrap leading-7 text-gray-800">{selectedPost.content}</p>
              <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4 text-sm text-gray-500">
                <span>{selectedPost.userName}</span>
                <span>{selectedPost.department}</span>
                <span>{formatDate(selectedPost.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportingPost && (
        <ReportPostModal
          post={reportingPost}
          onClose={() => setReportingPost(null)}
          onReported={() => setReportMessage('Raporunuz gönderildi. En kısa sürede inceleme başlatılacaktır.')}
        />
      )}
    </div>
  );
}
