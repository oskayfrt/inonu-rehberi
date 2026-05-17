import { api } from './api';

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  departmentId: number;
  department: string;
  year: string;
  role?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  fullName: string;
  departmentId: number;
  year: string;
}

const AUTH_STORAGE_KEY = 'campus-guide:user';
export const INONU_EMAIL_DOMAIN = '@ogr.inonu.edu.tr';
const ADMIN_EMAIL_DOMAIN = '@inonu.edu.tr';

const fallbackUser: AuthUser = {
  id: 0,
  fullName: 'İnönü Öğrencisi',
  email: 'ogrenci@ogr.inonu.edu.tr',
  departmentId: 0,
  department: 'Bilgisayar Mühendisliği',
  year: '2',
  role: 'student',
};

export function isInonuEmail(email: string) {
  return email.trim().toLocaleLowerCase('tr-TR').endsWith(INONU_EMAIL_DOMAIN);
}

function isAllowedLoginEmail(email: string) {
  const normalizedEmail = email.trim().toLocaleLowerCase('tr-TR');
  return normalizedEmail.endsWith(INONU_EMAIL_DOMAIN) || normalizedEmail.endsWith(ADMIN_EMAIL_DOMAIN);
}

function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase('tr-TR');
}

function assertInonuEmail(email: string) {
  if (!isInonuEmail(email)) {
    throw new Error('Sadece @ogr.inonu.edu.tr uzantılı öğrenci e-posta adresleri kabul edilir.');
  }
}

function assertLoginEmail(email: string) {
  if (!isAllowedLoginEmail(email)) {
    throw new Error('Sadece İnönü Üniversitesi e-posta adresleri kabul edilir.');
  }
}

function safeParseUser(value: string | null): AuthUser | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<AuthUser>;

    if (!parsed.email || !isAllowedLoginEmail(parsed.email) || !parsed.id) return null;
    if ((parsed.role || fallbackUser.role) !== 'admin' && !isInonuEmail(parsed.email)) return null;

    return {
      id: parsed.id,
      fullName: parsed.fullName || fallbackUser.fullName,
      email: parsed.email,
      departmentId: parsed.departmentId || fallbackUser.departmentId,
      department: parsed.department || fallbackUser.department,
      year: parsed.year || fallbackUser.year,
      role: parsed.role || fallbackUser.role,
    };
  } catch {
    return null;
  }
}

function persistUser(user: AuthUser) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function getCurrentUser(): AuthUser | null {
  return safeParseUser(localStorage.getItem(AUTH_STORAGE_KEY));
}

export async function signIn(input: LoginInput): Promise<AuthUser> {
  const email = normalizeEmail(input.email);
  assertLoginEmail(email);
  const { user } = await api.login({ email, password: input.password });

  persistUser(user);
  return user;
}

export async function signUp(input: RegisterInput): Promise<AuthUser> {
  const email = normalizeEmail(input.email);
  assertInonuEmail(email);
  const { user } = await api.register({
    fullName: input.fullName,
    email,
    password: input.password,
    departmentId: input.departmentId,
    year: input.year,
  });

  persistUser(user);
  return user;
}

export function updateCurrentUser(user: AuthUser) {
  persistUser(user);
}

export function signOut() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function formatStudentYear(year: string) {
  return year === 'Hazırlık' ? 'Hazırlık' : `${year}. Sınıf`;
}
