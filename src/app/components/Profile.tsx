import { useEffect, useState } from 'react';
import { BookOpen, Calendar, Edit2, Mail, Save, Send, Shield, User } from 'lucide-react';
import { api, type DepartmentOption } from '../lib/api';
import { formatStudentYear, getCurrentUser, updateCurrentUser, type AuthUser } from '../lib/auth';

export function Profile() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<AuthUser | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [requestedDepartmentId, setRequestedDepartmentId] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setEditedUser(currentUser);
    }

    if (currentUser?.role !== 'admin') {
      api.departments()
        .then(setDepartments)
        .catch(() => undefined);
    }
  }, []);

  const handleSave = async () => {
    if (!editedUser?.id) return;

    try {
      const { user: savedUser } = await api.updateUser(editedUser.id, {
        fullName: editedUser.fullName,
      });

      updateCurrentUser(savedUser);
      setUser(savedUser);
      setEditedUser(savedUser);
      setIsEditing(false);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Profil güncellenemedi.');
    }
  };

  const handleDepartmentRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id || !requestedDepartmentId) return;

    try {
      await api.createDepartmentChangeRequest({
        userId: user.id,
        requestedDepartmentId: Number(requestedDepartmentId),
        note: requestNote,
      });
      setSuccess('Bölüm değişikliği talebin gönderildi. En kısa sürede incelenecektir.');
      setError('');
      setRequestedDepartmentId('');
      setRequestNote('');
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Talep gönderilemedi.');
      setSuccess('');
    }
  };

  if (!user || !editedUser) return null;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Profilim</h1>
        <p className="text-gray-600">Hesap bilgilerini görüntüle ve veritabanında güncelle.</p>
        {success && <p className="text-green-600 mt-3">{success}</p>}
        {error && <p className="text-red-600 mt-3">{error}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <h2 className="mb-1">{user.fullName}</h2>
            <p className="text-gray-600 mb-4">{isAdmin ? 'Sistem Yöneticisi' : user.department}</p>
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm">
              {isAdmin ? 'Admin' : formatStudentYear(user.year)}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2>Hesap Bilgileri</h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af] transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Düzenle
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Kaydet
                  </button>
                  <button
                    onClick={() => {
                      setEditedUser(user);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    İptal
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Ad Soyad
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedUser.fullName}
                    onChange={(event) => setEditedUser({ ...editedUser, fullName: event.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                ) : (
                  <div className="px-4 py-3 bg-gray-50 rounded-lg">{user.fullName}</div>
                )}
              </div>

              <div>
                <label className="block text-sm mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  E-posta
                </label>
                <div className="px-4 py-3 bg-gray-100 rounded-lg text-gray-600">
                  {user.email}
                  <span className="text-xs ml-2">(Değiştirilemez)</span>
                </div>
              </div>

              {isAdmin ? (
                <div>
                  <label className="block text-sm mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Yetki
                  </label>
                  <div className="px-4 py-3 bg-blue-50 rounded-lg text-[#1e3a8a]">
                    Admin hesabı öğrenci bölümüne veya sınıfa bağlı değildir.
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Bölüm
                    </label>
                    <div className="px-4 py-3 bg-gray-100 rounded-lg text-gray-600">
                      {user.department}
                      <span className="text-xs ml-2">(Kayıttan sonra değiştirilemez)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Sınıf
                    </label>
                    <div className="px-4 py-3 bg-gray-50 rounded-lg">{formatStudentYear(user.year)}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {!isAdmin && (
            <div className="mt-6 bg-white rounded-2xl shadow-md p-6">
              <h2 className="mb-4">Bölüm Değişikliği Talebi</h2>
              <form onSubmit={handleDepartmentRequest} className="space-y-4">
                <select
                  value={requestedDepartmentId}
                  onChange={(event) => setRequestedDepartmentId(event.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  required
                >
                  <option value="">Yeni bölüm seç</option>
                  {departments
                    .filter((department) => department.id !== user.departmentId)
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name} - {department.faculty_name}
                      </option>
                    ))}
                </select>
                <textarea
                  value={requestNote}
                  onChange={(event) => setRequestNote(event.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] min-h-24"
                  placeholder="İstersen talep sebebini yaz."
                />
                <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-3 text-white hover:bg-[#1e40af]">
                  <Send className="w-4 h-4" />
                  Talep Gönder
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
