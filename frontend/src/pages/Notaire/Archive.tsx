import { useEffect, useState } from 'react';
import { getHistorique } from './api';
import type { HistoriqueEntry } from './api';
import Header from './Header';

interface ArchiveProps {
    parcelId: string;
    reference?: string;
    onBack: () => void;
}

export default function Archive({ parcelId, reference, onBack }: ArchiveProps) {
    const [history, setHistory] = useState<HistoriqueEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getHistorique(parcelId)
            .then(setHistory)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [parcelId]);

    return (
        <div>
            <button className="back-button" onClick={onBack}>&larr; Retour</button>
            <Header
                title={`Historique blockchain — ${reference ?? parcelId}`}
                subtitle="Chaque ligne correspond à une transaction distincte, immuable, enregistrée sur le ledger Hyperledger Fabric"
            />

            {loading && <p>Chargement...</p>}
            {error && <p className="alert alert-error">{error}</p>}

            {!loading && !error && (
                <ul className="timeline">
                    {history.map((entry, idx) => (
                        <li key={entry.txId} className={`timeline-item ${idx === 0 ? 'latest' : ''}`}>
                            <p><strong>Statut :</strong> {entry.value?.status ?? '—'}</p>
                            <p>
                                <strong>Horodatage :</strong>{' '}
                                {new Date(entry.timestamp.seconds * 1000).toLocaleString('fr-FR')}
                            </p>
                            <code>TxID : {entry.txId}</code>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
