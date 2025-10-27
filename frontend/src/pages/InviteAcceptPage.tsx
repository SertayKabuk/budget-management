import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { inviteApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';

export default function InviteAcceptPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  // Fetch invite details
  const { data: invite, isLoading, error: fetchError } = useQuery({
    queryKey: ['invite', code],
    queryFn: async () => {
      if (!code) throw new Error('No invite code provided');
      const response = await inviteApi.getByCode(code);
      return response.data;
    },
    enabled: !!code,
    retry: false,
  });

  // Accept invite mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!code) throw new Error('No invite code');
      const response = await inviteApi.accept(code);
      return response.data;
    },
    onSuccess: (data) => {
      // Navigate to the group page
      if (data.group?.id) {
        navigate(`/groups/${data.group.id}`, { 
          state: { message: t.inviteAccept.successMessage } 
        });
      } else {
        navigate('/');
      }
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.error || err.message || 'Daveti kabul ederken bir hata oluştu';
      setError(errorMsg);
    },
  });

  // Store invite code in localStorage if user is not logged in
  useEffect(() => {
    if (!user && code) {
      localStorage.setItem('pendingInvite', code);
      navigate('/login', { state: { returnTo: `/invite/${code}` } });
    } else if (user && code) {
      // User is logged in, clear any pending invite
      localStorage.removeItem('pendingInvite');
    }
  }, [user, code, navigate]);

  // Auto-accept if user is already a member
  useEffect(() => {
    if (invite?.alreadyMember && invite.group?.id) {
      navigate(`/groups/${invite.group.id}`, {
        state: { message: t.inviteAccept.alreadyMember }
      });
    }
  }, [invite, navigate, t]);

  const handleAccept = () => {
    acceptMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t.inviteAccept.loading}</p>
        </div>
      </div>
    );
  }

  if (fetchError || !invite) {
    const errorMessage = (fetchError as any)?.response?.data?.error || t.inviteAccept.invalidMessage;
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.inviteAccept.invalidTitle}</h1>
            <p className="text-gray-600">{errorMessage}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium"
          >
            {t.inviteAccept.backHome}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {/* Success State - Show Group Info */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.inviteAccept.invitationTitle}</h1>
          <p className="text-gray-600">
            {t.inviteAccept.invitedBy.replace('{name}', invite.invitedBy?.name || '')}
          </p>
        </div>

        {/* Group Details */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
            👥 {invite.group?.name}
          </h2>
          {invite.group?.description && (
            <p className="text-gray-700 mb-3">{invite.group.description}</p>
          )}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>👤 {invite.group?._count?.members || 0} {t.inviteAccept.members}</span>
            {invite.expiresAt && (
              <span>⏰ {t.inviteAccept.expiresOn}: {new Date(invite.expiresAt).toLocaleDateString('tr-TR')}</span>
            )}
          </div>
        </div>

        {/* Invite Metadata */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-600 space-y-1">
          {invite.invitedBy?.picture && (
            <div className="flex items-center gap-2 mb-2">
              <img 
                src={invite.invitedBy.picture} 
                alt={invite.invitedBy.name}
                className="w-8 h-8 rounded-full"
              />
              <span className="font-medium">{invite.invitedBy.name}</span>
            </div>
          )}
          <div>📅 {t.invites.createdAt}: {new Date(invite.createdAt).toLocaleDateString('tr-TR')}</div>
          {invite.maxUses && (
            <div>📊 {t.inviteAccept.usesRemaining}: {invite.maxUses - invite.usedCount}</div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleAccept}
            disabled={acceptMutation.isPending}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
          >
            {acceptMutation.isPending ? t.inviteAccept.accepting : t.inviteAccept.acceptButton}
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 font-medium"
          >
            {t.inviteAccept.cancelButton}
          </button>
        </div>

        {/* Additional Info */}
        <p className="text-xs text-gray-500 text-center mt-6">
          {t.inviteAccept.infoText}
        </p>
      </div>
    </div>
  );
}
