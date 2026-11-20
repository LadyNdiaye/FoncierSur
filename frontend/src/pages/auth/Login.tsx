import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { axiosClient } from '../../api/axiosClient';
import BrandMark from '../../components/BrandMark';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const [success, setSuccess] = useState(
    (location.state as { registered?: boolean } | null)?.registered === true,
  );
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!success) return;

    const timeoutId = window.setTimeout(() => {
      setSuccess(false);
      navigate(location.pathname, { replace: true, state: null });
    }, 2 * 60 * 1000);

    return () => window.clearTimeout(timeoutId);
  }, [location.pathname, navigate, success]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axiosClient.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      const role = response.data.user.role;
      if (role === 'PROMOTEUR') {
        navigate('/promoteur');
      } else if (role === 'CADASTRE') {
        navigate('/cadastre');
      } else if (role === 'NOTAIRE') {
        navigate('/notaire');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen auth-screen--login min-h-screen flex flex-col md:flex-row bg-white text-gray-900">
      {/* Colonne de gauche : Slogan et explications (Conforme maquette) */}
      <div className="auth-screen__intro md:w-1/2 p-8 md:p-16 flex flex-col justify-between bg-gray-50 border-r border-gray-100">
        <div>
          <h1 className="mb-6 inline-flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
            <BrandMark />
            FoncierSûr
          </h1>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            Le foncier sénégalais, traçable et infalsifiable.
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Chaque étape (dépôt, validation technique, certification notariale) est inscrite sur la blockchain et consultable à tout moment.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[#b6532b]" />
            Promoteur
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[#4f9b72]" />
            Cadastre
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[#8585bd]" />
            Notaire
          </span>
        </div>
      </div>

      {/* Colonne de droite : Formulaire de connexion */}
      <div className="auth-screen__content md:w-1/2 p-8 md:p-16 flex flex-col justify-center max-w-xl w-full mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Connexion</h2>
          <p className="text-xs text-gray-500">Votre espace s'ouvre selon le rôle de votre compte.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
            <p className="font-bold">Compte créé avec succès</p>
            <p className="mt-1 text-xs">Votre compte Promoteur est prêt. Connectez-vous avec l’adresse e-mail et le mot de passe choisis.</p>
          </div>
        )}

        <form onSubmit={handleLogin} autoComplete="off" className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Adresse e-mail
            </label>
            <input
              id="login-email"
              name="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              placeholder="nom@exemple.sn"
              className="w-full rounded-xl border border-gray-200 p-3.5 text-sm focus:border-gray-900 focus:outline-none transition"
              required
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="login-password"
                name="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 p-3.5 pr-12 text-sm focus:border-gray-900 focus:outline-none transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-900"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  {showPassword ? (
                    <>
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  ) : (
                    <>
                      <path d="M3 3l18 18" />
                      <path d="M10.6 5.2A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a15.5 15.5 0 0 1-3.2 3.9M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1.4 0 2.7-.3 3.8-.8" />
                      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-black transition disabled:opacity-50"
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-500">
          <p>
            Pas encore de compte Promoteur ?{' '}
            <Link to="/register" className="font-semibold text-gray-900 underline hover:text-black">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}