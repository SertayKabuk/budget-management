import { useState, useEffect } from 'react';
import { userApi } from '../services/api';
import type { User } from '../types';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
}

export default function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<User & { 
    sharedGroups?: { id: string; name: string }[];
    isSharedMember?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userApi.getPublicProfile(userId);
      setProfile(response.data);
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError('Profil yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
    alert(`${label} kopyalandı!`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Kullanıcı Profili</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">Yükleniyor...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {!loading && !error && profile && (
            <div className="space-y-6">
              {/* Profile Picture & Name */}
              <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
                {profile.picture ? (
                  <img 
                    src={profile.picture} 
                    alt={profile.name}
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center ring-4 ring-gray-100">
                    <span className="text-white text-3xl font-semibold">
                      {profile.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">{profile.name}</h3>
                  <p className="text-sm text-gray-600">{profile.email}</p>
                </div>
              </div>

              {/* Shared Groups */}
              {profile.sharedGroups && profile.sharedGroups.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Ortak Gruplar</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.sharedGroups.map(group => (
                      <span 
                        key={group.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                      >
                        {group.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">İletişim Bilgileri</h4>
                
                {profile.phone && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Telefon</p>
                        <p className="text-lg font-medium text-gray-900">{profile.phone}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(profile.phone!, 'Telefon')}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        📋 Kopyala
                      </button>
                    </div>
                  </div>
                )}

                {profile.iban && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-600 mb-1">IBAN</p>
                        <p className="text-base font-mono font-medium text-gray-900 break-all">
                          {profile.iban}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(profile.iban!, 'IBAN')}
                        className="ml-4 text-indigo-600 hover:text-indigo-800 text-sm font-medium whitespace-nowrap"
                      >
                        📋 Kopyala
                      </button>
                    </div>
                  </div>
                )}

                {!profile.phone && !profile.iban && (
                  <p className="text-sm text-gray-500 italic">
                    Kullanıcı henüz iletişim bilgisi eklememiş
                  </p>
                )}
              </div>

              {/* Member Since */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Üyelik: <span className="font-medium text-gray-900">{formatDate(profile.createdAt)}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
