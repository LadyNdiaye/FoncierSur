import { useEffect, useState } from 'react';
import { getHistoriqueNotaire, getPendingNotaire, getPreuve } from './api';
import type { EvenementFabric, ParcelleResume, PreuveBlockchain } from './api';
import StatutBadge from './StatutBadge';

interface ArchiveProps {
    parcelId?: string;
    reference?: string;
    onBack: () => void;
}

// Couleur du point de la timeline selon le statut inscrit
const POINT: Record<string, string> = {
    SOUMISE: '#D97706',
    VALIDE_CADASTRE: '#2563EB',
    REJETE_CADASTRE: '#DC2626',
    CERTIFIEE: '#16A34A',
    REJETE_NOTAIRE: '#E11D48',
};

const dateHeure = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

function Evenement({ e }: { e: EvenementFabric }) {
    return (
        <li className="nt-event">
            <div className="nt-rail">
                <span className="nt-dot" style={{ backgroundColor: POINT[e.statut] || '#A8A29E' }} />
                <span className="nt-line" />
            </div>
            <div className="nt-card nt-event-card">
                <div className="nt-event-head">
                    <b>{e.libelle}</b>
                    <span className="nt-muted-s">{dateHeure(e.date)}</span>
                </div>
                <div className="nt-muted">{e.role} · {e.msp} · statut {e.statut}</div>
                {e.commentaire && <div className="nt-event-comment">« {e.commentaire} »</div>}
                {e.userId && <div className="nt-mono">utilisateur {e.userId}</div>}
                <div className="nt-mono">tx {e.txId}</div>
            </div>
        </li>
    );
}

/** Historique des transactions Fabric d'une parcelle : la preuve consultable en soutenance */
export default function Archive({ parcelId, onBack }: ArchiveProps) {
    const [parcelles, setParcelles] = useState<ParcelleResume[]>([]);
    const [choisie, setChoisie] = useState<string | undefined>(parcelId);
    const [preuve, setPreuve] = useState<PreuveBlockchain | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Parcelles consultables : à certifier + déjà traitées
    useEffect(() => {
        Promise.all([getPendingNotaire(), getHistoriqueNotaire()])
            .then(([attente, traites]) => {
                const vues = new Set<string>();
                const toutes = [...attente, ...traites].filter((p) => (vues.has(p.id) ? false : (vues.add(p.id), true)));
                setParcelles(toutes);
                setChoisie((actuelle) => actuelle ?? toutes[0]?.id);
            })
            .catch((err) => setError(err.message));
    }, []);

    useEffect(() => {
        if (!choisie) return;
        setLoading(true);
        setError(null);
        getPreuve(choisie)
            .then(setPreuve)
            .catch((err) => {
                setPreuve(null);
                setError(err.message);
            })
            .finally(() => setLoading(false));
    }, [choisie]);

    return (
        <main className="nt-main nt-medium">
            <button type="button" className="nt-btn-link" onClick={onBack}>← Retour</button>
            <h1 className="nt-h1">Preuve blockchain</h1>
            <p className="nt-sub">Chaque événement est horodaté et signé par l’organisation émettrice.</p>

            <div className="nt-chips">
                {parcelles.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        className={`nt-chip ${p.id === choisie ? 'is-active' : ''}`}
                        onClick={() => setChoisie(p.id)}
                    >
                        {p.reference}
                    </button>
                ))}
                {parcelles.length === 0 && !error && <p className="nt-sub nt-tight">Aucun dossier à consulter pour le moment.</p>}
            </div>

            {error && <div role="alert" className="nt-alert nt-alert-ko">{error}</div>}
            {loading && <p className="nt-sub">Lecture de la blockchain…</p>}

            {preuve && !loading && (
                <>
                    <div className="nt-summary">
                        <h2 className="nt-h2 nt-flat">{preuve.reference}</h2>
                        <StatutBadge statut={preuve.statutBlockchain || preuve.statutBase} />
                        {preuve.hashIdentique === true && <span className="nt-ok-text">✓ Empreinte du document conforme</span>}
                        {preuve.hashIdentique === false && <span className="nt-ko-text">✕ Empreinte différente de la blockchain</span>}
                    </div>

                    {!preuve.surBlockchain ? (
                        <p className="nt-sub">Cette parcelle n’est pas encore inscrite sur la blockchain.</p>
                    ) : (
                        <ol className="nt-timeline">
                            {preuve.evenements.map((e) => (
                                <Evenement key={e.txId} e={e} />
                            ))}
                        </ol>
                    )}
                </>
            )}
        </main>
    );
}
