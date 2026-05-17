import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BookOpenCheck, GraduationCap, Lock, LogIn, Mail, UserPlus } from 'lucide-react';
import { INONU_EMAIL_DOMAIN, signIn, signUp } from '../lib/auth';
import { api, type DepartmentOption, type FacultyOption } from '../lib/api';

type AuthMode = 'login' | 'register';

interface LoginProps {
  mode: AuthMode;
}

const yearOptions = ['Hazırlık', '1', '2', '3', '4'];

const initialForm = {
  email: '',
  password: '',
  passwordConfirm: '',
  fullName: '',
  facultyId: '',
  departmentId: '',
  year: '',
};

export function Login({ mode }: LoginProps) {
  const navigate = useNavigate();
  const isRegister = mode === 'register';
  const [formData, setFormData] = useState(initialForm);
  const [error, setError] = useState('');
  const [faculties, setFaculties] = useState<FacultyOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setError('');
  }, [mode]);

  useEffect(() => {
    api.faculties()
      .then(setFaculties)
      .catch((apiError) => setError(apiError instanceof Error ? apiError.message : 'Fakülteler yüklenemedi.'));

    api.departments()
      .then(setDepartments)
      .catch((apiError) => setError(apiError instanceof Error ? apiError.message : 'Bölümler yüklenemedi.'));
  }, []);

  const title = useMemo(() => (isRegister ? 'Kayıt Ol' : 'Giriş Yap'), [isRegister]);
  const actionIcon = isRegister ? UserPlus : LogIn;
  const ActionIcon = actionIcon;
  const filteredDepartments = useMemo(
    () => departments.filter((department) => String(department.faculty_id) === formData.facultyId),
    [departments, formData.facultyId],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (isRegister) {
        if (!formData.facultyId || !formData.departmentId) {
          setError('Fakülte ve bölüm seçimi zorunludur.');
          setIsSubmitting(false);
          return;
        }

        if (formData.password !== formData.passwordConfirm) {
          setError('Şifreler eşleşmiyor.');
          setIsSubmitting(false);
          return;
        }

      await signUp({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        departmentId: Number(formData.departmentId),
        year: formData.year,
      });
    } else {
      const signedInUser = await signIn({
        email: formData.email.trim(),
        password: formData.password,
      });
      navigate(signedInUser.role === 'admin' ? '/admin' : '/dashboard');
      return;
    }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Giriş bilgileri kontrol edilemedi.');
      setIsSubmitting(false);
      return;
    }

    navigate('/dashboard');
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'linear-gradient(115deg, #dcecff 0%, #aecaef 46%, #3f78dc 100%)' }}
    >
      <div
        className="hidden lg:flex lg:w-1/2 items-start justify-start p-12 pt-16 xl:pt-20 relative overflow-hidden"
        style={{ background: 'linear-gradient(125deg, #dcecff 0%, #adc8f0 30%, #5f8fe3 58%, #174cb8 100%)' }}
      >
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#0b1f4d]/18 to-transparent" />
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/55 blur-3xl" />
        <div className="absolute right-8 top-10 h-64 w-64 rounded-full bg-blue-100/25 blur-3xl" />
        <div className="relative max-w-xl text-[#0f172a]">
          <div
            className="mb-8 inline-flex rounded-[2rem] p-5 shadow-2xl ring-1 ring-white/35"
            style={{ background: 'linear-gradient(135deg, #dcecff 0%, #9fc1fb 52%, #326fe3 100%)' }}
          >
            <img src="/inonu-logo.png" alt="İnönü Üniversitesi" className="h-24 w-72 object-contain rounded-3xl bg-white/90 px-8 py-5 shadow-inner" />
          </div>
          <h1 className="text-5xl mb-5 drop-shadow-sm">İnönü Rehberi</h1>
          <p className="text-xl text-slate-700 mb-8 max-w-lg">
            Derslerden etkinliklere, kampüs yaşamını tek bir yerden takip et.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/75 backdrop-blur rounded-2xl p-5 border border-blue-100 shadow-sm">
              <BookOpenCheck className="w-7 h-7 mb-3 text-[#1e3a8a]" />
              <p className="text-sm text-slate-600">Bölüm tavsiyeleri</p>
              <p className="text-2xl">120+</p>
            </div>
            <div className="bg-white/75 backdrop-blur rounded-2xl p-5 border border-blue-100 shadow-sm">
              <GraduationCap className="w-7 h-7 mb-3 text-[#1e3a8a]" />
              <p className="text-sm text-slate-600">Öğrenci katkısı</p>
              <p className="text-2xl">85+</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-start justify-center p-4 pt-8 sm:p-8 lg:pt-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-20 w-52 items-center justify-center rounded-2xl bg-white">
                <img src="/inonu-logo.png" alt="İnönü Üniversitesi" className="h-16 w-48 object-contain" />
              </div>
              <h2 className="text-2xl mb-2">{title}</h2>
              <p className="text-gray-600">İnönü Üniversitesi öğrenci e-postanla devam et.</p>
            </div>

            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-sm mb-2">Ad Soyad</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    placeholder="Adın ve soyadın"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm mb-2">Üniversite E-posta</label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    placeholder={`ornek${INONU_EMAIL_DOMAIN}`}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Kayıt ve giriş için yalnızca {INONU_EMAIL_DOMAIN} kabul edilir.</p>
              </div>

              {isRegister && (
                <>
                  <div>
                    <label className="block text-sm mb-2">Fakülte</label>
                    <select
                      value={formData.facultyId}
                      onChange={(event) => setFormData({ ...formData, facultyId: event.target.value, departmentId: '' })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                      required
                    >
                      <option value="">Fakülte seç</option>
                      {faculties.map((faculty) => (
                        <option key={faculty.id} value={faculty.id}>
                          {faculty.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.facultyId && (
                    <div>
                      <label className="block text-sm mb-2">Bölüm</label>
                      <select
                        value={formData.departmentId}
                        onChange={(event) => setFormData({ ...formData, departmentId: event.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                        required
                      >
                        <option value="">Bölüm seç</option>
                        {filteredDepartments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                        {filteredDepartments.length === 0 && (
                          <option value="" disabled>
                            Bu fakülte için bölüm bulunamadı
                          </option>
                        )}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm mb-2">Sınıf</label>
                    <select
                      value={formData.year}
                      onChange={(event) => setFormData({ ...formData, year: event.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                      required
                    >
                      <option value="">Sınıf seç</option>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year === 'Hazırlık' ? 'Hazırlık' : `${year}. Sınıf`}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm mb-2">Şifre</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    placeholder="En az 6 karakter"
                    required
                  />
                </div>
              </div>

              {isRegister && (
                <div>
                  <label className="block text-sm mb-2">Şifre Tekrar</label>
                  <input
                    type="password"
                    value={formData.passwordConfirm}
                    onChange={(event) => setFormData({ ...formData, passwordConfirm: event.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    placeholder="Şifreni tekrar yaz"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#1e3a8a] text-white py-3 rounded-lg hover:bg-[#1e40af] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <ActionIcon className="w-5 h-5" />
                {isSubmitting ? 'İşleniyor...' : title}
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              {isRegister ? (
                <span className="text-gray-600">
                  Zaten hesabın var mı?{' '}
                  <Link to="/login" className="text-[#1e3a8a] hover:underline">Giriş yap</Link>
                </span>
              ) : (
                <span className="text-gray-600">
                  Hesabın yok mu?{' '}
                  <Link to="/register" className="text-[#1e3a8a] hover:underline">Kayıt ol</Link>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
