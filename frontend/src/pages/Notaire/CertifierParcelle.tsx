import { useEffect, useState } from 'react';
import { certifyParcelle, getParcelleDetail } from './api';
import type { ParcelleDetail } from './api';
import Header from './Header';

interface CertifierParcelleProps {
    parcelId: string;
    onBack: () => void;
    onCertified: () => void;
    onViewHistory: (parcelId: string, reference: string) => void;
}

export default function CertifierParcelle({ parcelId, onBack, onCertified, onViewHistory }: CertifierParcelleProps) {
    const [parcelle, setParcelle] = useState<ParcelleDetail | null>(null);
    const [motif, setMotif] = useState('');
    const [motifError, setMotifError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        getParcelleDetail(parcelId)
            .then(setParcelle)
            .catch((err) => setError(err.message));
    }, [parcelId]);

    async function handleDecision(decision: 'CERTIFIE' | 'REJETE') {
        if (motif.trim().length < 5) {
            setMotifError('Merci de préciser un motif (5 caractères minimum).');
            return;
        }
        setMotifError(null);
        setSubmitting(true);
        setError(null);
        try {
            const result = await certifyParcelle(parcelId, decision, motif);
            setSuccess(result.message);
            setTimeout(onCertified, 1200);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (error && !parcelle) return <p style={{ color: 'crimson' }}>Erreur : {error}</p>;
    if (!parcelle) return <p>Chargement...</p>;

    return (
        <div>
            <button onClick={onBack}>&larr; Retour au tableau de bord</button>
            <Header title={`Certification — ${parcelle.reference}`} subtitle={`Dossier ${parcelle.id}`} />

            <section style={{ margin: '16px 0', padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
                <p><strong>Type :</strong> {parcelle.type}</p>
                <p><strong>Superficie déclarée :</strong> {parcelle.superficie_declaree} m²</p>
                <p><strong>Statut actuel :</strong> {parcelle.statut}</p>
                <p><strong>Empreinte SHA-256 du document :</strong></p>
                <code style={{ display: 'block', wordBreak: 'break-all', background: '#f3f4f6', padding: 8 }}>
                    {parcelle.docHash}
                </code>
                <button
                    style={{ marginTop: 8 }}
                    onClick={() => onViewHistory(parcelle.id, parcelle.reference)}
                >
                    📜 Voir l'historique blockchain complet
                </button>
            </section>

            <label htmlFor="motif">Commentaire / motif (obligatoire)</label>
            <textarea
                id="motif"
                value={motif}
                onChange={(e) => {
                    setMotif(e.target.value);
                    if (motifError) setMotifError(null);
                }}
                rows={3}
                style={{ width: '100%', margin: '8px 0' }}
                placeholder="Dossier conforme, pièces vérifiées..."
            />
            {motifError && <p style={{ color: 'crimson', margin: '0 0 8px' }}>{motifError}</p>}

            {error && <p style={{ color: 'crimson' }}>{error}</p>}
            {success && <p style={{ color: 'green' }}>{success}</p>}

            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleDecision('CERTIFIE')} disabled={submitting}>
                    ✅ Certifier
                </button>
                <button onClick={() => handleDecision('REJETE')} disabled={submitting}>
                    ❌ Rejeter
                </button>
            </div>
        </div>
    );
}
