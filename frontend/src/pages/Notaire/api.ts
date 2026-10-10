// Point d'accès API pour l'Espace Notaire.
// USE_MOCK = true tant que le backend/axiosClient de l'équipe n'est pas branché.
// Pour basculer sur la vraie API : USE_MOCK = false, et adapter BASE_URL si besoin.

const USE_MOCK = true;
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export interface ParcelleResume {
    id: string;
    reference: string;
    type: string;
    superficie_declaree: number;
    statut: string;
    createur_id: string;
    created_at: string;
}

export interface ParcelleDetail extends ParcelleResume {
    docHash: string;
    nicad?: string;
}

export interface TransactionEvent {
    event: string;
    actor: string;
    timestamp: string;
    comment?: string;
    hash?: string;
}

export interface HistoriqueEntry {
    txId: string;
    timestamp: { seconds: number };
    value: { status: string } | null;
    isDelete: boolean;
}

const MOCK_PARCELLES: ParcelleResume[] = [
    {
        id: 'parcelle-mock-001',
        reference: 'REF-2026-101',
        type: 'URBAIN',
        superficie_declaree: 1200,
        statut: 'VALIDE_CADASTRE',
        createur_id: 'promoteur-demo',
        created_at: '2026-09-20T10:00:00.000Z',
    },
    {
        id: 'parcelle-mock-002',
        reference: 'REF-2026-102',
        type: 'RURAL',
        superficie_declaree: 3400,
        statut: 'VALIDE_CADASTRE',
        createur_id: 'promoteur-demo',
        created_at: '2026-09-21T08:30:00.000Z',
    },
];

function authHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getPendingNotaire(): Promise<ParcelleResume[]> {
    if (USE_MOCK) return Promise.resolve(MOCK_PARCELLES);

    const res = await fetch(`${BASE_URL}/validations/notaire`, {
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw new Error('Impossible de récupérer les dossiers en attente');
    return res.json();
}

export async function getParcelleDetail(parcelId: string): Promise<ParcelleDetail> {
    if (USE_MOCK) {
        const base = MOCK_PARCELLES.find((p) => p.id === parcelId) ?? MOCK_PARCELLES[0];
        return Promise.resolve({ ...base, docHash: 'a3f5c6d7e8f9-hash-demo' });
    }

    const res = await fetch(`${BASE_URL}/parcelles/${parcelId}`, {
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw new Error('Parcelle introuvable');
    return res.json();
}

export async function certifyParcelle(
    parcelId: string,
    decision: 'CERTIFIE' | 'REJETE',
    motif: string,
): Promise<{ message: string }> {
    if (USE_MOCK) {
        console.log('[MOCK] certifyParcelle', { parcelId, decision, motif });
        return Promise.resolve({ message: `Décision ${decision} enregistrée (mock)` });
    }

    const res = await fetch(`${BASE_URL}/validations/notaire/${parcelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ decision, motif }),
    });
    if (!res.ok) throw new Error('Échec de la certification');
    return res.json();
}

export async function getHistorique(parcelId: string): Promise<HistoriqueEntry[]> {
    if (USE_MOCK) {
        return Promise.resolve([
            {
                txId: 'a837a240057d...',
                timestamp: { seconds: 1789986597 },
                value: { status: 'CERTIFIEE' },
                isDelete: false,
            },
            {
                txId: '7fe5360f6c81...',
                timestamp: { seconds: 1789986577 },
                value: { status: 'VALIDE_CADASTRE' },
                isDelete: false,
            },
            {
                txId: '20b2737ad32b...',
                timestamp: { seconds: 1789986544 },
                value: { status: 'SOUMISE' },
                isDelete: false,
            },
        ]);
    }

    const res = await fetch(`${BASE_URL}/validations/${parcelId}/historique`, {
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw new Error("Impossible de récupérer l'historique");
    return res.json();
}
