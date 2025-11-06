import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';
import type { User } from '../types';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    iban: '',
    phone: '',
    bio: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userApi.getProfile();
      setProfile(response.data);
      setFormData({
        name: response.data.name || '',
        iban: response.data.iban || '',
        phone: response.data.phone || '',
        bio: response.data.bio || '',
      });
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(t.profile.updateError);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError(t.profile.validation.nameRequired);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await userApi.updateProfile({
        name: formData.name.trim(),
        iban: formData.iban.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        bio: formData.bio.trim() || undefined,
      });

      setProfile(response.data);
      setSuccess(true);
      
      // Refresh auth token to update user name in context
      const currentToken = localStorage.getItem('auth_token');
      if (currentToken) {
        login(currentToken);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(t.profile.updateError);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-600">{t.profile.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link 
          to="/" 
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-2 inline-block"
        >
          {t.profile.backToHome}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{t.profile.title}</h1>
        <p className="mt-1 text-sm text-gray-600">{t.profile.subtitle}</p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <span className="text-xl mr-2">✓</span>
            <span>{t.profile.updateSuccess}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <span className="text-xl mr-2">⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture & Info Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              {profile?.picture ? (
                <img 
                  src={profile.picture} 
                  alt={profile.name}
                  className="w-32 h-32 rounded-full mx-auto object-cover ring-4 ring-gray-100"
                />
              ) : (
                <div className="w-32 h-32 rounded-full mx-auto bg-indigo-600 flex items-center justify-center ring-4 ring-gray-100">
                  <span className="text-white text-5xl font-semibold">
                    {profile?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <h2 className="mt-4 text-xl font-semibold text-gray-900">{profile?.name}</h2>
              <p className="text-sm text-gray-600">{profile?.email}</p>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">{t.profile.fields.role}:</span>
                    <span className="font-medium">
                      {profile?.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">{t.profile.fields.memberSince}:</span>
                    <span className="font-medium">{formatDate(profile?.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
            {/* Personal Information */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t.profile.personalInfo}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    {t.profile.fields.name}
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder={t.profile.fields.namePlaceholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    {t.profile.fields.email}
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t.profile.fields.emailReadonly}
                  </p>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    {t.profile.fields.phone}
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder={t.profile.fields.phonePlaceholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t.profile.fields.phoneHelp}
                  </p>
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    {t.profile.fields.bio}
                  </label>
                  <textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    placeholder={t.profile.fields.bioPlaceholder}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t.profile.fields.bioHelp}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t.profile.paymentInfo}
              </h3>
              
              <div>
                <label htmlFor="iban" className="block text-sm font-medium text-gray-700 mb-1">
                  {t.profile.fields.iban}
                </label>
                <input
                  type="text"
                  id="iban"
                  value={formData.iban}
                  onChange={(e) => handleChange('iban', e.target.value.toUpperCase())}
                  placeholder={t.profile.fields.ibanPlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                  maxLength={32}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t.profile.fields.ibanHelp}
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="p-6 bg-gray-50 rounded-b-lg">
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {saving ? t.profile.saving : t.profile.save}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
