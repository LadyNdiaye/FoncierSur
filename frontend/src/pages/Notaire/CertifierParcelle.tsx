import { useEffect, useState } from 'react';
import { certifyParcelle, getParcelleDetail, getPreuve, getSuperficieCalculee, nomCreateur } from './api';
import type { ParcelleDetail, PreuveBlockchain } from './api';
import StatutBadge from './StatutBadge';

interface CertifierParcelleProps {
    parcelId: string;
    onBack: () => void;
    onCertified: () => void;
    onViewHistory: (parcelId: string, reference: string) => void;
}

const dateFr = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');

export default function CertifierParcelle({ parcelId, onBack, onCertified, onViewHistory }: CertifierParcelleProps) {
    const [parcelle, setParcelle] = useState<ParcelleDetail | null>(null);
    const [superficieCalculee, setSuperficieCalculee] = useState<number | null>(null);
    const [preuve, setPreuve] = useState<PreuveBlockchain | null>(null);
    const [preuveChargee, setPreuveChargee] = useState(false);
    const [motif, setMotif] = useState('');
    const [motifError, setMotifError] = useState<string | null>(null);
    const [confirmation, setConfirmation] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        getParcelleDetail(parcelId)
            .then(setParcelle)
            .catch((err) => setError(err.message));
        getSuperficieCalculee(parcelId).then(setSuperficieCalculee);
        // Si la blockchain ne répond pas, on l'indique : on n'invente jamais un résultat de comparaison
        getPreuve(parcelId)
            .then(setPreuve)
            .catch(() => setPreuve(null))
            .finally(() => setPreuveChargee(true));
    }, [parcelId]);

    async function handleDecision(decision: 'CERTIFIE' | 'REJETE') {
        if (motif.trim().length < 5) {
            setConfirmation(false);
            setMotifError('Merci de préciser un commentaire (5 caractères minimum).');
            return;
        }
        setMotifError(null);
        setSubmitting(true);
        setError(null);
        try {
            const result = await certifyParcelle(parcelId, decision, motif.trim());
            setConfirmation(false);
            setSuccess(result.message);
            setTimeout(onCertified, 1500);
        } catch (err: any) {
            setConfirmation(false);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (error && !parcelle) {
        return (
            <main className="nt-main">
                <div role="alert" className="nt-alert nt-alert-ko">{error}</div>
                <button type="button" className="nt-btn" onClick={onBack}>← Retour aux dossiers</button>
            </main>
        );
    }
    if (!parcelle) return <main className="nt-main"><p className="nt-sub">Chargement du dossier…</p></main>;

    const peutDecider = parcelle.statut === 'VALIDE_CADASTRE' && !success;
    const hashDifferent = preuve?.hashIdentique === false;
    const validationCadastre = preuve?.evenements.find((e) => e.statut === 'VALIDE_CADASTRE');
    const document = parcelle.documents?.[0];

    return (
        <main className="nt-main nt-narrow">
            <button type="button" className="nt-btn-link" onClick={onBack}>← Retour aux dossiers</button>

            <div className="nt-title-row">
                <h1 className="nt-h1">Certifier {parcelle.reference}</h1>
                <StatutBadge statut={parcelle.statut} />
            </div>

            <section className="nt-card nt-section">
                <h2 className="nt-h2">Synthèse du dossier</h2>
                <dl className="nt-dl">
                    <div><dt>Promoteur</dt><dd>{nomCreateur(parcelle.createur)}</dd></div>
                    <div><dt>Localisation</dt><dd>{parcelle.localisation || '—'}</dd></div>
                    <div><dt>Type / NICAD</dt><dd>{parcelle.type} · {parcelle.nicad || '—'}</dd></div>
                    <div><dt>Surface déclarée</dt><dd>{Number(parcelle.superficie_declaree).toLocaleString('fr-FR')} m²</dd></div>
                    <div><dt>Surface calculée</dt><dd>{superficieCalculee != null ? `${superficieCalculee.toLocaleString('fr-FR')} m²` : '—'}</dd></div>
                    <div>
                        <dt>Validée par le Cadastre</dt>
                        <dd>{validationCadastre ? `${validationCadastre.msp} · ${dateFr(validationCadastre.date)}` : '—'}</dd>
                    </div>
                </dl>
            </section>

            <section className="nt-card nt-section">
                <h2 className="nt-h2">Intégrité du document</h2>
                {document && <p className="nt-sub nt-tight">Dernier document : <strong>{document.nom_original}</strong></p>}
                {!document && <p className="nt-sub nt-tight">Aucun document déposé pour ce dossier.</p>}

                <div className="nt-hash-row">
                    <div>
                        <div className="nt-hash-label">Empreinte en base</div>
                        <div className={`nt-hash ${hashDifferent ? 'is-ko' : ''}`}>{preuve?.hashBase ?? document?.hash_sha256 ?? '—'}</div>
                    </div>
                    <div>
                        <div className="nt-hash-label">Empreinte sur la blockchain</div>
                        <div className={`nt-hash ${hashDifferent ? 'is-ko' : ''}`}>{preuve?.hashBlockchain ?? '—'}</div>
                    </div>
                </div>

                {preuveChargee && !preuve && (
                    <div role="alert" className="nt-alert nt-alert-warn">
                        La vérification blockchain est indisponible pour le moment. Réessayez avant de certifier.
                    </div>
                )}
                {preuve?.hashIdentique === true && (
                    <div role="status" className="nt-alert nt-alert-ok">✓ Les deux empreintes sont identiques : le document n’a pas été modifié.</div>
                )}
                {hashDifferent && (
                    <div role="alert" className="nt-alert nt-alert-ko">
                        ✕ Les empreintes ne correspondent pas. Le document a été modifié après son dépôt : ne certifiez pas ce dossier, rejetez-le avec un motif.
                    </div>
                )}

                <button type="button" className="nt-btn-link" onClick={() => onViewHistory(parcelle.id, parcelle.reference)}>
                    Voir les transactions Fabric de ce dossier →
                </button>
            </section>

            <section className="nt-card nt-section">
                <h2 className="nt-h2">Décision du Notaire</h2>
                {peutDecider ? (
                    <>
                        <label htmlFor="motif" className="nt-label">Commentaire (obligatoire)</label>
                        <textarea
                            id="motif"
                            className="nt-textarea"
                            value={motif}
                            onChange={(e) => {
                                setMotif(e.target.value);
                                if (motifError) setMotifError(null);
                            }}
                            rows={3}
                            placeholder="Ex. Acte vérifié, parties identifiées…"
                        />
                        {motifError && <div role="alert" className="nt-alert nt-alert-ko">{motifError}</div>}
                        {error && <div role="alert" className="nt-alert nt-alert-ko">{error}</div>}

                        <div className="nt-btn-row">
                            {!hashDifferent && (
                                <button type="button" className="nt-btn nt-btn-ok" onClick={() => setConfirmation(true)} disabled={submitting}>
                                    ✓ Certifier la parcelle
                                </button>
                            )}
                            <button type="button" className="nt-btn nt-btn-ko" onClick={() => handleDecision('REJETE')} disabled={submitting}>
                                ✕ Rejeter
                            </button>
                        </div>
                        <p className="nt-hint">Action irréversible : la décision est inscrite sur la blockchain (Org3MSP).</p>
                    </>
                ) : success ? (
                    <div role="status" className="nt-alert nt-alert-ok">{success}</div>
                ) : (
                    <p className="nt-sub nt-tight">Ce dossier n’est plus en attente de certification (statut : {parcelle.statut}).</p>
                )}
            </section>

            {confirmation && (
                <div className="nt-overlay" role="dialog" aria-modal="true" aria-labelledby="titre-confirmation">
                    <div className="nt-modal">
                        <h2 id="titre-confirmation" className="nt-h2">Certifier {parcelle.reference} ?</h2>
                        <p className="nt-sub nt-tight">La décision sera inscrite sur la blockchain et ne pourra plus être modifiée.</p>
                        <div className="nt-btn-row nt-end">
                            <button type="button" className="nt-btn" onClick={() => setConfirmation(false)}>Annuler</button>
                            <button type="button" className="nt-btn nt-btn-ok" onClick={() => handleDecision('CERTIFIE')} disabled={submitting}>
                                {submitting ? 'Inscription…' : 'Certifier'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
