import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { axiosClient } from '../api/axiosClient';
import BrandMark from '../components/BrandMark';

interface BlockchainProofResult {
  reference: string;
  statut?: string;
  txId?: string;
  sha256?: string;
  timestamp?: string;
}

function getReturnPath(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('returnTo' in state)) {
    return '/promoteur';
  }

  const returnTo = state.returnTo;
  return returnTo === '/cadastre' || returnTo === '/notaire' || returnTo === '/promoteur'
    ? returnTo
    : '/promoteur';
}

export default function BlockchainProof() {
  const [searchQuery, setSearchQuery] = useState('');
  const [proofData, setProofData] = useState<BlockchainProofResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const returnPath = getReturnPath(location.state);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setProofData(null);

    try {
      const response = await axiosClient.get(`/blockchain/proof/${encodeURIComponent(searchQuery)}`);
      setProofData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Aucune preuve blockchain trouvée pour cette référence.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workspace workspace--public min-h-screen bg-gray-50 text-gray-900">
      <header className="flex justify-between items-center bg-white px-8 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center gap-2 font-black text-xl text-gray-900">
            <BrandMark />
            FoncierSûr
          </span>
        </div>
        <Link to={returnPath} className="text-sm font-semibold text-gray-900 hover:underline">
          Retour à mon espace
        </Link>
      </header>

      <main className="max-w-4xl mx-auto p-8 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-3xl font-extrabold text-gray-900">Preuve d'ancrage immutable</h2>
          <p className="text-xs text-gray-500">
            Recherchez une référence foncière ou un hash SHA-256 pour vérifier la validité du Titre Foncier sur Hyperledger Fabric.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3 max-w-xl mx-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ex. SN-DKR-2026-001 ou 9f2c4a1..."
            className="flex-1 rounded-xl border border-gray-200 p-3.5 text-sm focus:border-gray-900 focus:outline-none bg-white shadow-sm"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white px-6 py-3.5 rounded-xl text-xs font-bold hover:bg-black transition shadow-sm disabled:opacity-50"
          >
            {loading ? 'Recherche...' : 'Vérifier'}
          </button>
        </form>

        {error && (
          <div className="max-w-xl mx-auto rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-600 font-medium text-center">
            {error}
          </div>
        )}

        {proofData && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">✔ Registre Blockchain Authentifié</span>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{proofData.reference}</h3>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-md">
                {proofData.statut || 'Non renseigné'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-400 block uppercase font-semibold">Tx ID (Hyperledger Fabric)</span>
                <span className="font-mono text-xs text-gray-900 break-all">{proofData.txId || 'Non renseigné'}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-400 block uppercase font-semibold">Empreinte numérique (SHA-256)</span>
                <span className="font-mono text-xs text-gray-900 break-all">{proofData.sha256 || 'Non renseignée'}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-400 block uppercase font-semibold">Organisations validatrices</span>
                <span className="text-xs font-semibold text-gray-800">Org1 (Cadastre) • Org2 (Notaires)</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-400 block uppercase font-semibold">Horodatage d'ancrage</span>
                <span className="text-xs font-semibold text-gray-800">
                  {proofData.timestamp ? new Date(proofData.timestamp).toLocaleString() : 'Non renseigné'}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}