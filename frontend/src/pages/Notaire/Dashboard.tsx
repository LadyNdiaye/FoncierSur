import { useEffect, useState } from 'react';
import { getHistoriqueNotaire, getPendingNotaire, nomCreateur } from './api';
import type { ParcelleResume } from './api';
import StatutBadge from './StatutBadge';

interface DashboardProps {
    onOpenParcelle: (parcelId: string, reference: string) => void;
    onViewHistory: (parcelId: string, reference: string) => void;
}

export default function Dashboard({ onOpenParcelle, onViewHistory }: DashboardProps) {
    const [aCertifier, setACertifier] = useState<ParcelleResume[]>([]);
    const [traites, setTraites] = useState<ParcelleResume[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    function load() {
        setLoading(true);
        setError(null);
        Promise.all([getPendingNotaire(), getHistoriqueNotaire()])
            .then(([attente, historique]) => {
                setACertifier(attente);
                setTraites(historique);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        load();
    }, []);

    const certifiees = traites.filter((p) => p.statut === 'CERTIFIEE').length;
    const rejetees = traites.filter((p) => p.statut === 'REJETE_NOTAIRE').length;

    const compteur = (libelle: string, valeur: number, couleur: string) => (
        <div className="nt-card nt-stat">
            <div className="nt-stat-label">{libelle}</div>
            <div className="nt-stat-value" style={{ color: couleur }}>{valeur}</div>
        </div>
    );

    return (
        <main className="nt-main">
            <div className="nt-title-row">
                <div>
                    <h1 className="nt-h1">Dossiers à certifier</h1>
                    <p className="nt-sub">Parcelles validées par le Cadastre, en attente de votre certification.</p>
                </div>
                <button type="button" className="nt-btn" onClick={load} disabled={loading}>↻ Actualiser</button>
            </div>

            {error && <div role="alert" className="nt-alert nt-alert-ko">{error}</div>}

            <div className="nt-stats">
                {compteur('À certifier', aCertifier.length, '#5B3A7A')}
                {compteur('Certifiées', certifiees, '#166534')}
                {compteur('Rejetées', rejetees, '#9F1239')}
            </div>

            <div className="nt-card nt-table-wrap">
                <table className="nt-table">
                    <thead>
                        <tr>
                            <th>Référence</th>
                            <th>Promoteur</th>
                            <th>Localisation</th>
                            <th>Surface</th>
                            <th>Statut</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {aCertifier.map((p) => (
                            <tr key={p.id}>
                                <td className="nt-strong">{p.reference}</td>
                                <td>{nomCreateur(p.createur)}</td>
                                <td>{p.localisation || '—'}</td>
                                <td className="nt-nowrap">{Number(p.superficie_declaree).toLocaleString('fr-FR')} m²</td>
                                <td><StatutBadge statut={p.statut} /></td>
                                <td className="nt-actions">
                                    <button type="button" className="nt-btn-link" onClick={() => onViewHistory(p.id, p.reference)}>
                                        Preuve blockchain
                                    </button>
                                    <button type="button" className="nt-btn nt-btn-primary" onClick={() => onOpenParcelle(p.id, p.reference)}>
                                        Examiner
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {loading && (
                            <tr><td colSpan={6} className="nt-empty">Chargement des dossiers…</td></tr>
                        )}
                        {!loading && !error && aCertifier.length === 0 && (
                            <tr><td colSpan={6} className="nt-empty">Aucun dossier en attente. Les parcelles validées par le Cadastre apparaîtront ici.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
