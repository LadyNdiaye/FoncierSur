require('dotenv').config();
const { wrapAll } = require('../utils/retry');
const { connectAs } = require('../config/fabric');

const USE_MOCK = process.env.USE_MOCK_BLOCKCHAIN === 'true';

// Un mock qui répond toujours « succès » ne doit jamais tourner en production
if (USE_MOCK && process.env.NODE_ENV === 'production') {
    throw new Error('USE_MOCK_BLOCKCHAIN=true est interdit en production');
}

function mockResponse(action, args) {
    console.log(`[MOCK BLOCKCHAIN] ${action}`, args);
    return { txId: 'MOCK-' + Date.now(), status: 'success', mocked: true };
}

/**
 * Appelle une transaction d'écriture sur Fabric avec l'identité de l'organisation du rôle.
 * Lève une exception en cas d'échec (le backend ne modifie alors pas la base).
 * Les arguments doivent être des chaînes : undefined/null deviennent ''.
 */
async function ecrire(role, fonction, args) {
    const chaines = args.map((a) => (a === undefined || a === null ? '' : String(a)));
    const { contract, close } = await connectAs(role);
    try {
        const result = await contract.submitTransaction(fonction, ...chaines);
        return { status: 'success', message: Buffer.from(result).toString('utf8') };
    } finally {
        close();
    }
}

/** Cahier : SubmitParcel(parcelId, reference, docHash, userId). Org1 (Promoteur). */
async function submitParcel(parcelId, reference, docHash, userId) {
    if (USE_MOCK) return mockResponse('SubmitParcel', { parcelId, reference, docHash, userId });
    return ecrire('PROMOTEUR', 'SubmitParcel', [parcelId, reference, docHash, userId]);
}

/**
 * Cahier : ValidateByCadastre(parcelId, userId, status, comment). Org2 (Cadastre).
 * status : 'VALIDE_CADASTRE' | 'REJETE_CADASTRE'
 */
async function validateByCadastre(parcelId, userId, status, comment) {
    if (USE_MOCK) return mockResponse('ValidateByCadastre', { parcelId, userId, status, comment });
    return ecrire('CADASTRE', 'ValidateByCadastre', [parcelId, userId, status, comment]);
}

/** Cahier : CertifyByNotaire(parcelId, userId, comment). Org3 (Notaire). */
async function certifyByNotaire(parcelId, userId, comment) {
    if (USE_MOCK) return mockResponse('CertifyByNotaire', { parcelId, userId, comment });
    return ecrire('NOTAIRE', 'CertifyByNotaire', [parcelId, userId, comment]);
}

/** Rejet du Notaire (non défini par le cahier : ajout). Org3 (Notaire). */
async function rejectByNotaire(parcelId, userId, comment) {
    if (USE_MOCK) return mockResponse('RejectByNotaire', { parcelId, userId, comment });
    return ecrire('NOTAIRE', 'RejectByNotaire', [parcelId, userId, comment]);
}

async function queryParcel(parcelId, asRole = 'NOTAIRE') {
    if (USE_MOCK) {
        return { docType: 'ParcelProof', parcelId, status: 'SOUMISE', history: [], mocked: true };
    }

    const { contract, close } = await connectAs(asRole);
    try {
        const result = await contract.evaluateTransaction('QueryParcel', parcelId);
        return JSON.parse(Buffer.from(result).toString('utf8'));
    } finally {
        close();
    }
}

/** Historique complet des transactions Fabric pour une parcelle (preuve d'immuabilité). */
async function getParcelHistory(parcelId, asRole = 'NOTAIRE') {
    if (USE_MOCK) {
        return [{ txId: 'MOCK-TX', timestamp: new Date().toISOString(), value: null, mocked: true }];
    }

    const { contract, close } = await connectAs(asRole);
    try {
        const result = await contract.evaluateTransaction('GetParcelHistory', parcelId);
        return JSON.parse(Buffer.from(result).toString('utf8'));
    } finally {
        close();
    }
}

/** Vérifie que le hash fourni correspond au dernier hash enregistré sur le ledger. */
async function verifyDocument(parcelId, providedHash, asRole = 'NOTAIRE') {
    if (USE_MOCK) return true;

    const { contract, close } = await connectAs(asRole);
    try {
        const result = await contract.evaluateTransaction('VerifyDocument', parcelId, providedHash);
        return Buffer.from(result).toString('utf8') === 'true';
    } finally {
        close();
    }
}

// Retry (cahier : 3 tentatives) : uniquement sur les erreurs réseau, jamais sur un refus du chaincode
module.exports = wrapAll({
    submitParcel,
    validateByCadastre,
    certifyByNotaire,
    rejectByNotaire,
    queryParcel,
    getParcelHistory,
    verifyDocument,
});