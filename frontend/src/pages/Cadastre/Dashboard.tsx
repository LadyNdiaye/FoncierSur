import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { axiosClient } from '../../api/axiosClient'; // Ajuste le chemin selon ton arborescence
import BrandMark from '../../components/BrandMark';
import { formatSuperficie } from '../../utils/formatSuperficie';

interface Parcelle {
  id: string | number;
  reference: string;
  statut: string;
  localisation?: string;
  type?: string;
  superficie?: number | string;
}

export default function CadastreDashboard() {
  const [parcelles, setParcelles] = useState<Parcelle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const statusSyncPending = (location.state as { statusSyncPending?: boolean } | null)?.statusSyncPending;

  useEffect(() => {
    const fetchParcelles = async () => {
      try {
        const response = await axiosClient.get('/validations/cadastre');
        if (Array.isArray(response.data)) {
          setParcelles(response.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Erreur lors du chargement des dossiers.");
      } finally {
        setLoading(false);
      }
    };

    void fetchParcelles();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="workspace workspace--cadastre min-h-screen bg-gray-50 text-gray-900">
      <header className="flex justify-between items-center bg-white px-8 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center gap-2 font-black text-xl text-gray-900">
            <BrandMark />
            FoncierSûr
          </span>
          <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-semibold">
            Espace Cadastre
          </span>
        </div>
        <nav className="flex space-x-6 text-sm font-medium text-gray-600">
          <Link to="/cadastre" className="text-gray-900 font-bold">Dossiers à valider</Link>
          <Link to="/cadastre/historique" className="hover:text-gray-900 transition">Historique</Link>
          <Link to="/blockchain-proof" state={{ returnTo: '/cadastre' }} className="hover:text-gray-900 transition">Preuve blockchain</Link>
          <button onClick={handleLogout} className="text-red-600 hover:text-red-700 transition">
            Déconnexion
          </button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">En attente ({parcelles.length})</h2>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}
        {statusSyncPending && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800" role="status">
            Décision enregistrée. La mise à jour du service Promoteur est en attente et sera réessayée automatiquement.
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Chargement des dossiers...</div>
        ) : (
          <div className="grid gap-4">
            {parcelles.map((p) => (
              <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center hover:shadow-md transition">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-gray-900 text-lg">{p.reference}</span>
                    <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-md font-bold uppercase border border-amber-200">
                      {p.statut}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-2">
                    <span>{p.localisation || 'Non renseignée'}</span>
                    <span>•</span>
                    <span>{p.type}</span>
                    <span>•</span>
                    <span className="font-semibold text-gray-700">{formatSuperficie(p.superficie)}</span>
                  </p>
                </div>
                <Link
                  to={`/cadastre/valider/${p.id}`}
                  className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-black transition shadow-sm"
                >
                  Examiner
                </Link>
              </div>
            ))}
            {parcelles.length === 0 && (
              <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 text-gray-400 text-sm">
                Aucune parcelle en attente de validation technique.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}