// Point d'accès API pour l'Espace Notaire (cahier : tous les endpoints sont sous /api/v1).
// Backend unique (monolithe) : branché sur le vrai backend, les routes
// /validations/notaire* et /parcelles/:id/* correspondent exactement à
// validationController et parcelleController côté serveur.
//
// NB : le détail exact de `getPreuve` (historique Fabric brut, voir
// parcelleController.getParcelleProof côté backend) dépend de la forme
// retournée par le chaincode (GetParcelHistory) — à vérifier une fois le
// réseau Fabric test-network lancé. Le mapping ci-dessous reste donc
// volontairement défensif (valeurs par défaut si un champ manque).
const USE_MOCK = false;
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export interface Createur {
    nom?: string;
    prenom?: string;
}

export interface ParcelleResume {
    id: string;
    reference: string;
    type: string;
    localisation?: string | null;
    superficie_declaree: number | string;
    statut: string;
    createur?: Createur | null;
    createdAt: string;
}

export interface DocumentParcelle {
    id: string;
    nom_original: string;
    hash_sha256: string;
}

export interface ParcelleDetail extends ParcelleResume {
    nicad?: string | null;
    documents?: DocumentParcelle[];
}

/** Une transaction Fabric (réponse de GET /parcelles/:id/preuve) */
export interface EvenementFabric {
    txId: string;
    statut: string;
    libelle: string;
    role: string;
    msp: string;
    userId: string | null;
    commentaire: string | null;
    date: string;
}

export interface PreuveBlockchain {
    parcelId: string;
    reference: string;
    statutBase: string;
    surBlockchain: boolean;
    statutBlockchain?: string;
    evenements: EvenementFabric[];
    hashBase: string | null;
    hashBlockchain: string | null;
    /** true : identiques, false : différents, null : rien à comparer */
    hashIdentique: boolean | null;
}

export function nomCreateur(c?: Createur | null): string {
    if (!c) return '—';
    return `${c.prenom || ''} ${c.nom || ''}`.trim() || '—';
}

// ---------- Données de démonstration (repli si USE_MOCK = true) ----------

const HASH = '9f2c4a1de0b7c3aa5521e8d94f6b0a71c3d2e8f4a6b9c0d1e2f3a4b5c6d7b71e';
const HASH_BLOCKCHAIN_FAUX = '1a7e90c3d4f2b8a1c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a58d0';
const USER = '7c1e9a52-0b3d-4f6a-9d21-8e4b5c6d7f80';

const MOCK_PENDING: ParcelleDetail[] = [
    {
        id: 'p016', reference: 'REF-2026-016', type: 'URBAIN', localisation: 'Rufisque', superficie_declaree: 640,
        statut: 'VALIDE_CADASTRE', createur: { nom: 'Diop', prenom: 'Awa' }, createdAt: '2026-10-06T09:14:00.000Z',
        nicad: 'SN-RUF-0057', documents: [{ id: 'd1', nom_original: 'titre_foncier_016.pdf', hash_sha256: HASH }],
    },
    {
        id: 'p017', reference: 'REF-2026-017', type: 'URBAIN', localisation: 'Saly', superficie_declaree: 796,
        statut: 'VALIDE_CADASTRE', createur: { nom: 'Ba', prenom: 'Moussa' }, createdAt: '2026-10-07T08:30:00.000Z',
        nicad: 'SN-MBO-0113', documents: [{ id: 'd2', nom_original: 'plan_saly_017.pdf', hash_sha256: HASH }],
    },
    {
        id: 'p019', reference: 'REF-2026-019', type: 'RURAL', localisation: 'Kaolack', superficie_declaree: 14150,
        statut: 'VALIDE_CADASTRE', createur: { nom: 'Ndiaye', prenom: 'Fatou' }, createdAt: '2026-10-08T10:00:00.000Z',
        nicad: null, documents: [{ id: 'd3', nom_original: 'titre_019.pdf', hash_sha256: HASH }],
    },
];

const MOCK_TRAITES: ParcelleDetail[] = [
    {
        id: 'p014', reference: 'REF-2026-014', type: 'URBAIN', localisation: 'Diamniadio', superficie_declaree: 1238,
        statut: 'CERTIFIEE', createur: { nom: 'Diop', prenom: 'Awa' }, createdAt: '2026-10-06T09:14:00.000Z',
        documents: [{ id: 'd4', nom_original: 'titre_014.pdf', hash_sha256: HASH }],
    },
    {
        id: 'p012', reference: 'REF-2026-012', type: 'URBAIN', localisation: 'Mbour', superficie_declaree: 920,
        statut: 'REJETE_NOTAIRE', createur: { nom: 'Ba', prenom: 'Moussa' }, createdAt: '2026-10-03T09:00:00.000Z',
        documents: [{ id: 'd5', nom_original: 'titre_012.pdf', hash_sha256: HASH }],
    },
];

function ev(txId: string, statut: string, libelle: string, role: string, msp: string, commentaire: string | null, date: string): EvenementFabric {
    return { txId, statut, libelle, role, msp, userId: USER, commentaire, date };
}

const SOUMISSION = (n: string) => ev(`3be1a7c90d2f4e5a8b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9a${n}`, 'SOUMISE', 'Soumission', 'Promoteur', 'Org1MSP', null, '2026-10-06T09:14:00Z');
const VALIDATION = (n: string) => ev(`a47f12de5c6b7a8998877665544332211ffeeddccbbaa9988776655443322${n}`, 'VALIDE_CADASTRE', 'Validation technique', 'Cadastre', 'Org2MSP', 'Géométrie conforme, aucun chevauchement.', '2026-10-08T11:02:00Z');

function mockPreuve(id: string): PreuveBlockchain {
    const tout = [...MOCK_PENDING, ...MOCK_TRAITES];
    const p = tout.find((x) => x.id === id) ?? tout[0];
    const base = { parcelId: p.id, reference: p.reference, statutBase: p.statut, surBlockchain: true, hashBase: HASH, hashBlockchain: HASH, hashIdentique: true as boolean | null };
    if (p.statut === 'CERTIFIEE') {
        return { ...base, statutBlockchain: 'CERTIFIEE', evenements: [SOUMISSION('c90a'), VALIDATION('de11'), ev('71c8e5a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0af3b5', 'CERTIFIEE', 'Certification', 'Notaire', 'Org3MSP', 'Acte vérifié, parties identifiées.', '2026-10-10T15:40:00Z')] };
    }
    if (p.statut === 'REJETE_NOTAIRE') {
        return { ...base, statutBlockchain: 'REJETE_NOTAIRE', evenements: [SOUMISSION('c91b'), VALIDATION('de12'), ev('90be4f21a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0a12', 'REJETE_NOTAIRE', 'Rejet notarial', 'Notaire', 'Org3MSP', 'Pièces d’identité incomplètes.', '2026-10-09T16:05:00Z')] };
    }
    const falsifie = p.id === 'p017';
    return { ...base, statutBlockchain: 'VALIDE_CADASTRE', evenements: [SOUMISSION('c92c'), VALIDATION('de13')], hashBlockchain: falsifie ? HASH_BLOCKCHAIN_FAUX : HASH, hashIdentique: !falsifie };
}

// ---------- Appels HTTP ----------

function authHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Appel JSON : lit le message { error } du backend pour afficher une erreur compréhensible */
async function appeler<T>(chemin: string, messageDefaut: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${BASE_URL}${chemin}`, {
            ...init,
            headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init?.headers || {}) },
        });
    } catch {
        throw new Error('Le serveur ne répond pas. Vérifiez que le backend est lancé.');
    }
    const corps = await res.json().catch(() => null);
    if (!res.ok) throw new Error(corps?.error || corps?.message || messageDefaut);
    return corps as T;
}

const attendre = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 150));

/** Parcelles validées par le Cadastre, en attente de certification */
export async function getPendingNotaire(): Promise<ParcelleResume[]> {
    if (USE_MOCK) return attendre(MOCK_PENDING);
    const liste = await appeler<any[]>('/validations/notaire', 'Impossible de récupérer les dossiers en attente');
    return liste.map((v) => ({
        id: v.id,
        reference: v.parcelle?.reference,
        type: v.parcelle?.type,
        localisation: v.parcelle?.localisation,
        superficie_declaree: v.parcelle?.superficie,
        statut: v.statut,
        createdAt: v.created_at,
    }));
}

/** Parcelles déjà traitées par le Notaire (CERTIFIEE, REJETE_NOTAIRE) */
export async function getHistoriqueNotaire(): Promise<ParcelleResume[]> {
    if (USE_MOCK) return attendre(MOCK_TRAITES);
    const liste = await appeler<any[]>('/validations/notaire/historique', "Impossible de récupérer l'historique des décisions");
    return liste.map((v) => ({
        id: v.id,
        reference: v.parcelle?.reference,
        type: v.parcelle?.type,
        localisation: v.parcelle?.localisation,
        superficie_declaree: v.parcelle?.superficie,
        statut: v.statut,
        createdAt: v.updated_at,
    }));
}

export async function getParcelleDetail(parcelId: string): Promise<ParcelleDetail> {
    if (USE_MOCK) {
        const p = [...MOCK_PENDING, ...MOCK_TRAITES].find((x) => x.id === parcelId);
        if (!p) throw new Error('Parcelle introuvable.');
        return attendre(p);
    }
    // parcelId ici est en réalité l'id de la Validation (clé utilisée par
    // Dashboard/Archive) ; validationController renvoie les infos de la
    // parcelle associée.
    const v = await appeler<any>(`/validations/notaire/${parcelId}`, 'Parcelle introuvable');
    return {
        id: parcelId,
        reference: v.reference,
        type: v.type,
        localisation: v.localisation,
        superficie_declaree: v.superficie,
        statut: v.statut,
        createdAt: v.created_at ?? new Date().toISOString(),
        nicad: v.nicad,
    };
}

/** Superficie calculée par PostGIS ; null si le contrôle n'est pas disponible */
export async function getSuperficieCalculee(parcelId: string): Promise<number | null> {
    if (USE_MOCK) return attendre(parcelId === 'p016' ? 637 : 790);
    try {
        const r = await appeler<{ data: { superficieCalculee: number | null } }>(`/parcelles/${parcelId}/controle-geo`, '');
        return r.data?.superficieCalculee ?? null;
    } catch {
        return null;
    }
}

/** Preuve Fabric : transactions et comparaison des empreintes */
export async function getPreuve(parcelId: string): Promise<PreuveBlockchain> {
    if (USE_MOCK) return attendre(mockPreuve(parcelId));
    const r = await appeler<any>(`/parcelles/${parcelId}/preuve`, 'Impossible de lire la blockchain');
    return {
        parcelId: r.parcelId,
        reference: r.reference,
        statutBase: r.statutBase,
        surBlockchain: Array.isArray(r.history) && r.history.length > 0,
        statutBlockchain: r.statutBase,
        evenements: [],
        hashBase: r.hashBase ?? null,
        hashBlockchain: r.hashIdentique === false ? null : r.hashBase ?? null,
        hashIdentique: r.hashIdentique ?? null,
    };
}

export async function certifyParcelle(
    parcelId: string,
    decision: 'CERTIFIE' | 'REJETE',
    motif: string,
): Promise<{ message: string }> {
    if (USE_MOCK) {
        console.log('[MOCK] certifyParcelle', { parcelId, decision, motif });
        return attendre({ message: `Décision ${decision === 'CERTIFIE' ? 'CERTIFIEE' : 'REJETE_NOTAIRE'} enregistrée (démonstration)` });
    }
    return appeler(`/validations/notaire/${parcelId}`, 'Échec de la décision', {
        method: 'POST',
        body: JSON.stringify({ decision: decision === 'CERTIFIE' ? 'APPROUVE' : 'REJETE', motif }),
    });
}
