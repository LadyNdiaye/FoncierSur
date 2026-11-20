import { type FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { axiosClient } from '../../api/axiosClient';
import BrandMark from '../../components/BrandMark';

export default function Register() {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axiosClient.post('/auth/register', {
        nom,
        prenom,
        email,
        password,
        role: 'PROMOTEUR',
      });

      navigate('/login', { replace: true, state: { registered: true } });
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen auth-screen--register min-h-screen flex flex-col md:flex-row bg-white text-gray-900">
      {/* Colonne de gauche : Slogan (Modèle Coumba) */}
      <div className="auth-screen__intro md:w-1/2 p-8 md:p-16 flex flex-col justify-between bg-gray-50 border-r border-gray-100">
        <div>
          <h1 className="mb-6 inline-flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
            <BrandMark />
            FoncierSûr
          </h1>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            Déclarez vos parcelles, suivez chaque étape.
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Un compte Promoteur vous permet de déposer vos dossiers et de consulter leur preuve sur la blockchain.
          </p>
        </div>
        <div className="mt-8 text-xs text-gray-400">
          Les comptes Cadastre et Notaire sont créés par l'administration.
        </div>
      </div>

      {/* Colonne de droite : Formulaire d'inscription */}
      <div className="auth-screen__content md:w-1/2 p-8 md:p-16 flex flex-col justify-center max-w-xl w-full mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Créer un compte</h2>
          <p className="text-xs text-gray-500">Compte Promoteur.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Nom</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Diop"
                className="w-full rounded-xl border border-gray-200 p-3.5 text-sm focus:border-gray-900 focus:outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Prénom</label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Awa"
                className="w-full rounded-xl border border-gray-200 p-3.5 text-sm focus:border-gray-900 focus:outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Adresse e-mail</label>
            <input
              name="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="nom@exemple.sn"
              className="w-full rounded-xl border border-gray-200 p-3.5 text-sm focus:border-gray-900 focus:outline-none transition"
              required
            />
          </div>

          <div>
            <label htmlFor="register-password" className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Mot de passe</label>
            <div className="relative">
              <input
                id="register-password"
                name="register-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                className="w-full rounded-xl border border-gray-200 p-3.5 pr-12 text-sm focus:border-gray-900 focus:outline-none transition"
                minLength={8}
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
            {loading ? 'Création en cours...' : 'Créer mon compte'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-500">
          Déjà inscrit ? <Link to="/login" className="font-semibold text-gray-900 underline hover:text-black">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}