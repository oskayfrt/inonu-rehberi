const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || 'İstek tamamlanamadı.');
  }

  return data as T;
}

export interface DepartmentOption {
  id: number;
  name: string;
  faculty_id: number;
  faculty_name: string;
}

export interface FacultyOption {
  id: number;
  name: string;
}

export interface ApiUser {
  id: number;
  fullName: string;
  email: string;
  departmentId: number;
  department: string;
  year: string;
  role: string;
}

export interface ApiPost {
  id: number;
  userId: number;
  title: string;
  content: string;
  category: string;
  courseName?: string;
  course_name?: string;
  createdAt: string;
  departmentId: number;
  department: string;
  userName: string;
}

function normalizePost(post: ApiPost): ApiPost {
  return {
    ...post,
    courseName: (post.courseName || post.course_name || '').trim(),
  };
}

export interface ApiEvent {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  organizer: string;
  source: string;
  sourceUrl: string;
  imageUrl: string;
  participants: number;
}

export interface ApiAnnouncement {
  id: number;
  title: string;
  content: string;
  date: string;
  department: string;
  departmentId: number | null;
  faculty: string;
  facultyId: number | null;
  type: 'important' | 'info' | 'success';
  isPinned: boolean;
  source: string;
  sourceUrl: string;
}

export interface ApiLostFoundItem {
  id: number;
  userId: number | null;
  title: string;
  type: 'lost' | 'found';
  category: string;
  location: string;
  date: string;
  description: string;
  contact: string;
  imageUrl: string;
}

export interface FreshmanGuideCard {
  id: number;
  title: string;
  description: string;
  items: string[];
  locationLabel: string;
  locationUrl: string;
  icon: string;
  color: string;
  sortOrder: number;
}

export interface AdminPost {
  id: number;
  user_id: number;
  title: string;
  content: string;
  category: string;
  status: string;
  created_at: string;
  user_name: string;
  user_surname: string;
  email: string;
  department_name: string;
  faculty_name: string;
}

export interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  year: string;
  departmentId: number;
  department: string;
  faculty: string;
}

export interface BlacklistEntry {
  id: number;
  email: string;
  full_name: string;
  reason: string;
  created_at: string;
  admin_name: string | null;
  admin_surname: string | null;
}

export interface DepartmentChangeRequest {
  id: number;
  note: string | null;
  status: string;
  created_at: string;
  user_id: number;
  name: string;
  surname: string;
  email: string;
  current_department_name: string;
  requested_department_id: number;
  requested_department_name: string;
}

export interface ExperienceSubmission {
  id: number;
  title: string;
  category: string;
  content: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  user_id: number | null;
  user_name: string | null;
  user_surname: string | null;
  email: string | null;
  department_name: string | null;
  faculty_name: string | null;
}

export interface ContentReport {
  id: number;
  reporter_user_id: number | null;
  post_id: number | null;
  reported_user_id: number | null;
  reason: string;
  details: string | null;
  post_title: string | null;
  post_content: string | null;
  reported_user_name: string | null;
  reported_user_email: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reporter_name: string | null;
  reporter_surname: string | null;
  reporter_email: string | null;
}

export const api = {
  health: () => request<{ ok: boolean }>('/health'),
  faculties: () => request<FacultyOption[]>('/faculties'),
  departments: () => request<DepartmentOption[]>('/departments'),
  register: (body: { fullName: string; email: string; password: string; departmentId: number; year: string }) =>
    request<{ user: ApiUser }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ user: ApiUser }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id: number, body: { fullName: string }) =>
    request<{ user: ApiUser }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  posts: (params: { departmentId?: number; userId?: number; scope?: 'department' | 'global'; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.departmentId) search.set('departmentId', String(params.departmentId));
    if (params.userId) search.set('userId', String(params.userId));
    if (params.scope) search.set('scope', params.scope);
    if (params.limit) search.set('limit', String(params.limit));
    return request<ApiPost[]>(`/posts${search.size ? `?${search.toString()}` : ''}`).then((posts) => posts.map(normalizePost));
  },
  createPost: (body: { userId: number; departmentId: number; title: string; content: string; category: string; courseName?: string }) =>
    request<{ post: unknown }>('/posts', { method: 'POST', body: JSON.stringify(body) }),
  deletePost: (userId: number, postId: number) =>
    request<{ ok: boolean }>(`/posts/${postId}`, { method: 'DELETE', body: JSON.stringify({ userId }) }),
  createExperience: (body: { userId: number; title: string; category: string; content: string }) =>
    request<{ id: number }>('/experiences', { method: 'POST', body: JSON.stringify(body) }),
  reportPost: (body: { reporterUserId: number; postId: number; reason: string; details: string }) =>
    request<{ id: number }>('/reports', { method: 'POST', body: JSON.stringify(body) }),
  events: () => request<ApiEvent[]>('/events'),
  announcements: (params: { departmentId?: number; facultyId?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.departmentId) search.set('departmentId', String(params.departmentId));
    if (params.facultyId) search.set('facultyId', String(params.facultyId));
    return request<ApiAnnouncement[]>(`/announcements${search.size ? `?${search.toString()}` : ''}`);
  },
  lostFound: () => request<ApiLostFoundItem[]>('/lost-found'),
  createLostFound: (body: {
    userId?: number;
    title: string;
    type: 'lost' | 'found';
    category: string;
    location: string;
    date: string;
    description: string;
    contact: string;
    imageUrl?: string;
  }) => request<{ id: number }>('/lost-found', { method: 'POST', body: JSON.stringify(body) }),
  deleteLostFound: (userId: number, itemId: number) =>
    request<{ ok: boolean }>(`/lost-found/${itemId}`, { method: 'DELETE', body: JSON.stringify({ userId }) }),
  freshmanGuide: () => request<FreshmanGuideCard[]>('/freshman-guide'),
  adminCreateFreshmanGuideCard: (adminUserId: number, body: Omit<FreshmanGuideCard, 'id'>) =>
    request<{ card: FreshmanGuideCard }>('/admin/freshman-guide', { method: 'POST', body: JSON.stringify({ adminUserId, ...body }) }),
  adminUpdateFreshmanGuideCard: (adminUserId: number, id: number, body: Omit<FreshmanGuideCard, 'id'>) =>
    request<{ card: FreshmanGuideCard }>(`/admin/freshman-guide/${id}`, { method: 'PATCH', body: JSON.stringify({ adminUserId, ...body }) }),
  adminDeleteFreshmanGuideCard: (adminUserId: number, id: number) =>
    request<{ ok: boolean }>(`/admin/freshman-guide/${id}`, { method: 'DELETE', body: JSON.stringify({ adminUserId }) }),
  createDepartmentChangeRequest: (body: { userId: number; requestedDepartmentId: number; note: string }) =>
    request<{ id: number }>('/department-change-requests', { method: 'POST', body: JSON.stringify(body) }),
  adminStatistics: (adminUserId: number) => request<Record<string, number>>(`/admin/statistics?adminUserId=${adminUserId}`),
  adminPosts: (adminUserId: number, status = 'all') => request<AdminPost[]>(`/admin/posts?adminUserId=${adminUserId}&status=${status}`),
  adminUpdatePostStatus: (adminUserId: number, postId: number, status: 'approved' | 'rejected' | 'pending') =>
    request<{ post: unknown }>(`/admin/posts/${postId}`, { method: 'PATCH', body: JSON.stringify({ adminUserId, status }) }),
  adminDeletePost: (adminUserId: number, postId: number) =>
    request<{ ok: boolean }>(`/admin/posts/${postId}`, { method: 'DELETE', body: JSON.stringify({ adminUserId }) }),
  adminEvents: (adminUserId: number) => request<ApiEvent[]>(`/admin/events?adminUserId=${adminUserId}`),
  adminCreateEvent: (adminUserId: number, body: {
    title: string;
    description: string;
    eventDate: string;
    eventTime: string;
    location: string;
    category: string;
    organizer: string;
    imageUrl: string;
    sourceUrl: string;
  }) => request<{ id: number }>('/admin/events', { method: 'POST', body: JSON.stringify({ adminUserId, ...body }) }),
  adminDeleteEvent: (adminUserId: number, eventId: number) =>
    request<{ ok: boolean }>(`/admin/events/${eventId}`, { method: 'DELETE', body: JSON.stringify({ adminUserId }) }),
  adminUsers: (adminUserId: number) => request<AdminUser[]>(`/admin/users?adminUserId=${adminUserId}`),
  adminUpdateUserDepartment: (adminUserId: number, userId: number, departmentId: number) =>
    request<{ ok: boolean }>(`/admin/users/${userId}/department`, { method: 'PATCH', body: JSON.stringify({ adminUserId, departmentId }) }),
  adminDeleteUser: (adminUserId: number, userId: number) =>
    request<{ ok: boolean }>(`/admin/users/${userId}`, { method: 'DELETE', body: JSON.stringify({ adminUserId }) }),
  adminBlacklist: (adminUserId: number) => request<BlacklistEntry[]>(`/admin/blacklist?adminUserId=${adminUserId}`),
  adminBlacklistUser: (adminUserId: number, userId: number, reason: string) =>
    request<{ ok: boolean }>(`/admin/users/${userId}/blacklist`, { method: 'POST', body: JSON.stringify({ adminUserId, reason }) }),
  adminRemoveFromBlacklist: (adminUserId: number, blacklistId: number) =>
    request<{ ok: boolean; email: string }>(`/admin/blacklist/${blacklistId}`, { method: 'DELETE', body: JSON.stringify({ adminUserId }) }),
  adminDepartmentChangeRequests: (adminUserId: number) =>
    request<DepartmentChangeRequest[]>(`/admin/department-change-requests?adminUserId=${adminUserId}`),
  adminResolveDepartmentChangeRequest: (adminUserId: number, requestId: number, status: 'approved' | 'rejected') =>
    request<{ ok: boolean }>(`/admin/department-change-requests/${requestId}`, { method: 'PATCH', body: JSON.stringify({ adminUserId, status }) }),
  adminExperiences: (adminUserId: number) =>
    request<ExperienceSubmission[]>(`/admin/experiences?adminUserId=${adminUserId}`),
  adminUpdateExperience: (adminUserId: number, experienceId: number, status: 'pending' | 'reviewed' | 'published' | 'archived', adminNote = '') =>
    request<{ ok: boolean }>(`/admin/experiences/${experienceId}`, { method: 'PATCH', body: JSON.stringify({ adminUserId, status, adminNote }) }),
  adminDeleteExperience: (adminUserId: number, experienceId: number) =>
    request<{ ok: boolean }>(`/admin/experiences/${experienceId}`, { method: 'DELETE', body: JSON.stringify({ adminUserId }) }),
  adminReports: (adminUserId: number) =>
    request<ContentReport[]>(`/admin/reports?adminUserId=${adminUserId}`),
  adminUpdateReport: (adminUserId: number, reportId: number, status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken') =>
    request<{ ok: boolean }>(`/admin/reports/${reportId}`, { method: 'PATCH', body: JSON.stringify({ adminUserId, status }) }),
};
