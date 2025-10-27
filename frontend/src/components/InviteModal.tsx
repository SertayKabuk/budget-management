import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { inviteApi } from '../services/api';
import type { GroupInvite } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface InviteModalProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

export function InviteModal({ groupId, groupName, onClose }: InviteModalProps) {
  const { t } = useTranslation();
  const [expiresIn, setExpiresIn] = useState<number>(7); // Default 7 days
  const [maxUses, setMaxUses] = useState<number | undefined>(undefined);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fetch existing invites
  const { data: invites, refetch } = useQuery({
    queryKey: ['invites', groupId],
    queryFn: async () => {
      const response = await inviteApi.getAll(groupId);
      return response.data;
    },
  });

  // Create new invite mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await inviteApi.create(groupId, {
        expiresIn: expiresIn > 0 ? expiresIn : undefined,
        maxUses: maxUses && maxUses > 0 ? maxUses : undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      refetch();
    },
  });

  // Revoke invite mutation
  const revokeMutation = useMutation({
    mutationFn: async (code: string) => {
      await inviteApi.revoke(code);
    },
    onSuccess: () => {
      refetch();
    },
  });

  const getInviteUrl = (code: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/invite/${code}`;
  };

  const handleCopyLink = async (invite: GroupInvite) => {
    const url = getInviteUrl(invite.code);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(invite.code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareWhatsApp = (invite: GroupInvite) => {
    const url = getInviteUrl(invite.code);
    const message = encodeURIComponent(
      t.invites.whatsappMessage
        .replace('{groupName}', groupName)
        .replace('{url}', url)
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const activeInvites = invites?.filter((inv) => inv.status === 'ACTIVE') || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {t.invites.title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Create New Invite */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t.invites.createNew}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.invites.expiresIn}
                </label>
                <input
                  type="number"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.invites.expiresInPlaceholder}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t.invites.expiresInHelp}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.invites.maxUses}
                </label>
                <input
                  type="number"
                  value={maxUses || ''}
                  onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value) : undefined)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.invites.maxUsesPlaceholder}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t.invites.maxUsesHelp}
                </p>
              </div>

              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {createMutation.isPending ? t.invites.creating : t.invites.createButton}
              </button>
            </div>
          </div>

          {/* Existing Invites */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t.invites.activeCount.replace('{count}', activeInvites.length.toString())}
            </h3>
            {activeInvites.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {t.invites.noInvites}
              </p>
            ) : (
              <div className="space-y-3">
                {activeInvites.map((invite) => {
                  const inviteUrl = getInviteUrl(invite.code);
                  const isExpiringSoon = invite.expiresAt && 
                    new Date(invite.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
                  const isNearMaxUses = invite.maxUses && 
                    invite.usedCount >= invite.maxUses * 0.8;

                  return (
                    <div
                      key={invite.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {invite.code}
                            </span>
                            {isExpiringSoon && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                {t.invites.expiringSoon}
                              </span>
                            )}
                            {isNearMaxUses && (
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                {t.invites.nearLimit}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>
                              👤 {t.invites.invitedBy}: {invite.invitedBy?.name || 'Bilinmiyor'}
                            </div>
                            <div>
                              📅 {t.invites.createdAt}: {new Date(invite.createdAt).toLocaleDateString('tr-TR')}
                            </div>
                            {invite.expiresAt && (
                              <div>
                                ⏰ {t.invites.expiresAt}: {new Date(invite.expiresAt).toLocaleDateString('tr-TR')}
                              </div>
                            )}
                            <div>
                              📊 {t.invites.usage}: {invite.usedCount} {invite.maxUses ? `/ ${invite.maxUses}` : `(${t.invites.unlimited})`}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* URL Display */}
                      <div className="bg-gray-50 rounded p-2 mb-3 break-all text-xs text-gray-600">
                        {inviteUrl}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopyLink(invite)}
                          className="flex-1 bg-gray-600 text-white py-2 px-3 rounded-lg hover:bg-gray-700 text-sm font-medium flex items-center justify-center gap-2"
                        >
                          {copiedCode === invite.code ? (
                            <>
                              {t.invites.copied}
                            </>
                          ) : (
                            <>
                              {t.invites.copyLink}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleShareWhatsApp(invite)}
                          className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          {t.invites.shareWhatsApp}
                        </button>
                        <button
                          onClick={() => revokeMutation.mutate(invite.code)}
                          disabled={revokeMutation.isPending}
                          className="bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                        >
                          {t.invites.revoke}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
