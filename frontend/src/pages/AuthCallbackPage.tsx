import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { inviteApi } from '../services/api';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      console.error('Authentication error:', error);
      navigate('/login?error=' + error);
      return;
    }

    if (token) {
      login(token);
      
      // Check for pending invite
      const pendingInvite = localStorage.getItem('pendingInvite');
      if (pendingInvite) {
        // Clear the pending invite
        localStorage.removeItem('pendingInvite');
        
        // Accept the invite after a short delay to ensure auth is set
        setTimeout(async () => {
          try {
            const response = await inviteApi.accept(pendingInvite);
            const groupId = response.data.group?.id;
            if (groupId) {
              navigate(`/groups/${groupId}`, {
                state: { message: t.inviteAccept.successMessage }
              });
            } else {
              navigate('/');
            }
          } catch (err) {
            console.error('Error accepting invite after login:', err);
            // Redirect to invite page to handle the error
            navigate(`/invite/${pendingInvite}`);
          }
        }, 500);
      } else {
        navigate('/');
      }
    } else {
      navigate('/login');
    }
  }, [searchParams, login, navigate, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-700">{t.authCallback.completing}</p>
      </div>
    </div>
  );
}
