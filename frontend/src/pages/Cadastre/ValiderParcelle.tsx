import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { axiosClient } from '../../api/axiosClient';
import BrandMark from '../../components/BrandMark';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import ParcelMapPreview from '../../components/ParcelMapPreview';
import { formatSuperficie } from '../../utils/formatSuperficie';

interface Parcelle {
  reference: string;
  type?: string;
  nicad?: string;
  localisation?: string;
  proprio_nom?: string;
  sha256?: string;
  superficie?: number | string;
  polygon?: unknown;
  coordinates?: unknown;
}

type Decision = 'APPROUVE' | 'REJETE';

export default function ValiderParcelle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [parcelle, setParcelle] = useState<Parcelle | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [motif, setMotif] = useState('');
  const [loading, setLoading] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null);

  useEffect(() => {
    const fetchParcelle = async () => {
      try {
        const response = await axiosClient.get(`/validations/cadastre/${id}`);
        setParcelle(response.data);
      } catch (err: any) {
        setLoadError(err.response?.data?.error || 'Impossible de charger le dossier à valider.');
      } finally {
        setFetching(false);
      }
    };

    void fetchParcelle();
  }, [id]);

  const requestDecision = (decision: Decision) => {
    if (decision === 'REJETE' && !motif.trim()) {
      setDecisionError('Le motif est obligatoire en cas de rejet.');
      return;
    }

    setDecisionError('');
    setPendingDecision(decision);
  };

  const handleDecision = async () => {
    if (!pendingDecision) return;

    setLoading(true);
    try {
      const response = await axiosClient.post(`/validations/cadastre/${id}`, { decision: pendingDecision, motif });
      navigate('/cadastre', {
        state: { statusSyncPending: response.data.synchronisationEnAttente === true },
      });
    } catch (err: any) {
      setDecisionError(err.response?.data?.error || 'Erreur lors de la validation du dossier.');
      setPendingDecision(null);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-12 text-center text-sm text-gray-400">Chargement du dossier...</div>;

  if (loadError || !parcelle) {
    return (
      <div className="workspace workspace--cadastre min-h-screen text-gray-900">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
          <span className="inline-flex items-center gap-2 font-black text-xl text-gray-900">
            <BrandMark />
            FoncierSûr
          </span>
          <Link to="/cadastre" className="text-sm font-semibold text-gray-900 hover:underline">
            Retour aux dossiers
          </Link>
        </header>
        <main className="mx-auto max-w-4xl p-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {loadError || 'Le dossier demandé est introuvable.'}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="workspace workspace--cadastre min-h-screen bg-gray-50 pb-12 text-gray-900">
      <header className="flex justify-between items-center bg-white px-8 py-4 border-b border-gray-200">
        <div className="flex items-center gap-5">
          <span className="inline-flex items-center gap-2 font-black text-xl text-gray-900">
            <BrandMark />
            FoncierSûr
          </span>
          <Link to="/cadastre" className="text-sm font-semibold text-gray-900 hover:underline">
            ← Retour aux dossiers
          </Link>
        </div>
        <span className="font-bold text-gray-900">Validation - {parcelle.reference}</span>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 p-8">
        <div className="grid items-start gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <ParcelMapPreview
            coordinates={parcelle.polygon ?? parcelle.coordinates}
            reference={parcelle.reference}
            localisation={parcelle.localisation}
          />

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 border-b border-gray-100 pb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Dossier soumis</span>
              <h2 className="mt-1 text-lg font-bold text-gray-900">{parcelle.reference}</h2>
            </div>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-gray-500">Localisation</dt>
                <dd className="mt-1 font-semibold text-gray-800">{parcelle.localisation || 'Non renseignée'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Type de zone</dt>
                <dd className="mt-1 font-semibold text-gray-800">{parcelle.type || 'Non renseigné'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">NICAD</dt>
                <dd className="mt-1 font-semibold text-gray-800">{parcelle.nicad || 'Non renseigné'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Superficie</dt>
                <dd className="mt-1 font-semibold text-gray-800">
                  {formatSuperficie(parcelle.superficie)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-gray-500">Propriétaire</dt>
                <dd className="mt-1 font-semibold text-gray-800">{parcelle.proprio_nom || 'Non renseigné'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-gray-500">Empreinte SHA-256</dt>
                <dd className="mt-1 break-all font-mono text-xs text-gray-700">{parcelle.sha256 || 'Non renseignée'}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <h3 className="font-bold text-gray-900">Avis technique</h3>
            <p className="mt-1 text-xs text-gray-500">
              Vérifiez les informations avant d’approuver ou de rejeter le dossier.
            </p>
          </div>
          <div>
            <label htmlFor="cadastre-motif" className="block text-xs font-semibold text-gray-600 mb-1.5">
              Motif de la décision (obligatoire en cas de rejet)
            </label>
            <textarea
              id="cadastre-motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex. Conforme aux plans directeurs de Diamniadio..."
              className="w-full rounded-xl border border-gray-200 p-3.5 text-sm focus:border-gray-900 focus:outline-none h-28 transition"
            />
          </div>

          {decisionError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {decisionError}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={() => requestDecision('APPROUVE')}
              className="rounded-md bg-[#b6532b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#98411f]"
            >
              Valider techniquement
            </button>
            <button
              onClick={() => requestDecision('REJETE')}
              className="rounded-md border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Rejeter
            </button>
          </div>
          <p className="text-xs text-gray-500">
            La décision est d'abord inscrite sur Fabric (Org2), puis enregistrée en base.
          </p>
        </section>
      </main>
      {pendingDecision && (
        <ConfirmationDialog
          confirmLabel={pendingDecision === 'APPROUVE' ? 'Confirmer la validation' : 'Confirmer le rejet'}
          destructive={pendingDecision === 'REJETE'}
          loading={loading}
          message={`Confirmez-vous votre décision pour la parcelle ${parcelle.reference} ?`}
          onCancel={() => setPendingDecision(null)}
          onConfirm={() => void handleDecision()}
          title="Confirmer la décision"
        />
      )}
    </div>
  );
}