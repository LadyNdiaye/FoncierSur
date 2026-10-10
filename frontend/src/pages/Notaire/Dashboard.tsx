import { useEffect, useState } from 'react';
import { getPendingNotaire } from './api';
import type { ParcelleResume } from './api';
import Header from './Header';

interface DashboardProps {
    onOpenParcelle: (parcelId: string, reference: string) => void;
    onViewHistory: (parcelId: string, reference: string) => void;
}

export default function Dashboard({ onOpenParcelle, onViewHistory }: DashboardProps) {
    const [parcelles, setParcelles] = useState<ParcelleResume[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    function load() {
        setLoading(true);
        setError(null);
        getPendingNotaire()
            .then(setParcelles)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        load();
    }, []);

    return (
        <div>
            <Header title="Dossiers à certifier" subtitle="Parcelles validées par le Cadastre, en attente de certification finale" />

            <div className="toolbar">
                <button onClick={load} disabled={loading}>↻ Actualiser</button>
            </div>

            {loading && <p>Chargement des dossiers...</p>}
            {error && <p className="alert alert-error">Erreur : {error}</p>}

            {!loading && !error && (
                parcelles.length === 0 ? (
                    <p className="empty-state">Aucun dossier en attente de certification.</p>
                ) : (
                    <table className="notaire-table">
                        <thead>
                            <tr>
                                <th>Référence</th>
                                <th>Type</th>
                                <th>Superficie</th>
                                <th>Statut</th>
                                <th>Soumis le</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {parcelles.map((p) => (
                                <tr key={p.id}>
                                    <td>{p.reference}</td>
                                    <td>{p.type}</td>
                                    <td>{p.superficie_declaree} m²</td>
                                    <td><span className="status-pill">{p.statut}</span></td>
                                    <td>{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                                    <td className="actions-cell">
                                        <button className="btn-primary" onClick={() => onOpenParcelle(p.id, p.reference)}>
                                            Examiner
                                        </button>
                                        <button onClick={() => onViewHistory(p.id, p.reference)}>Historique</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )
            )}
        </div>
    );
}
