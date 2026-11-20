import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { axiosClient } from '../../api/axiosClient'; // Ajuste le chemin selon ton arborescence
import BrandMark from '../../components/BrandMark';
import { formatSuperficie } from '../../utils/formatSuperficie';

interface HistoriqueRecord {
  id: string | number;
  reference: string;
  proprio_nom?: string;
  superficie?: number | string;
  statut: string;
  updated_at?: string;
  created_at?: string;
}

function formatDate(value?: string): string {
  if (!value) return 'Non renseignée';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Non renseignée' : date.toLocaleDateString('fr-FR');
}

export default function CadastreHistorique() {
  const [historique, setHistorique] = useState<HistoriqueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistorique = async () => {
      try {
        const response = await axiosClient.get('/validations/cadastre/historique');
        if (Array.isArray(response.data)) {
          setHistorique(response.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Erreur lors du chargement de l'historique.");
      } finally {
        setLoading(false);
      }
    };

    void fetchHistorique();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Helper pour styliser dynamiquement les badges de statut
  const renderStatutBadge = (statut: string) => {
    if (statut === 'VALIDE_CADASTRE' || statut === 'CERTIFIEE') {
      return (
        <span className="px-2.5 py-1 text-xs rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {statut}
        </span>
      );
    }
    if (statut?.includes('REJETE')) {
      return (
        <span className="px-2.5 py-1 text-xs rounded-md font-semibold bg-red-50 text-red-700 border border-red-200">
          {statut}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs rounded-md font-semibold bg-gray-100 text-gray-700 border border-gray-200">
        {statut}
      </span>
    );
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
            Historique Cadastre
          </span>
        </div>
        <nav className="flex space-x-6 text-sm font-medium text-gray-600">
          <Link to="/cadastre" className="hover:text-gray-900 transition">Dossiers à valider</Link>
          <Link to="/cadastre/historique" className="text-gray-900 font-bold">Historique</Link>
          <Link to="/blockchain-proof" state={{ returnTo: '/cadastre' }} className="hover:text-gray-900 transition">Preuve blockchain</Link>
          <button onClick={handleLogout} className="text-red-600 hover:text-red-700 transition">
            Déconnexion
          </button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dossiers traités</h2>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Chargement de l'historique...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Référence</th>
                    <th className="px-6 py-3.5 text-left">Propriétaire</th>
                    <th className="px-6 py-3.5 text-left">Superficie</th>
                    <th className="px-6 py-3.5 text-left">Statut</th>
                    <th className="px-6 py-3.5 text-left">Date de traitement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {historique.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-bold text-gray-900">{h.reference}</td>
                      <td className="px-6 py-4">{h.proprio_nom || 'Non renseigné'}</td>
                      <td className="px-6 py-4">{formatSuperficie(h.superficie)}</td>
                      <td className="px-6 py-4">{renderStatutBadge(h.statut)}</td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {formatDate(h.updated_at || h.created_at)}
                      </td>
                    </tr>
                  ))}
                  {historique.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">
                        Aucun historique disponible pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}