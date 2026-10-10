require('dotenv').config();
const { connectAs } = require('../config/fabric');

const USE_MOCK = process.env.USE_MOCK_BLOCKCHAIN === 'true';

function mockResponse(action, args) {
    console.log(`[MOCK BLOCKCHAIN] ${action}`, args);
    return { txId: 'MOCK-' + Date.now(), status: 'success', mocked: true };
}

/**
 * Soumettre une parcelle. Appelé pour le compte du Promoteur.
 * L'identité de l'acteur est portée par le certificat (Org1MSP), pas par un paramètre.
 */
async function submitParcel(parcelId, reference, docHash) {
    if (USE_MOCK) return mockResponse('SubmitParcel', { parcelId, reference, docHash });

    const { contract, close } = await connectAs('PROMOTEUR');
    try {
        const result = await contract.submitTransaction('SubmitParcel', parcelId, reference, docHash);
        return { status: 'success', message: Buffer.from(result).toString('utf8') };
    } finally {
        close();
    }
}

/**
 * Validation Cadastre. decision: 'APPROUVE' | 'REJETE'
 */
async function validateByCadastre(parcelId, decision, comment) {
    if (USE_MOCK) return mockResponse('ValidateByCadastre', { parcelId, decision, comment });

    const { contract, close } = await connectAs('CADASTRE');
    try {
        const result = await contract.submitTransaction('ValidateByCadastre', parcelId, decision, comment);
        return { status: 'success', message: Buffer.from(result).toString('utf8') };
    } finally {
        close();
    }
}

/**
 * Certification Notaire. decision: 'CERTIFIE' | 'REJETE'
 */
async function certifyByNotaire(parcelId, decision, comment) {
    if (USE_MOCK) return mockResponse('CertifyByNotaire', { parcelId, decision, comment });

    const { contract, close } = await connectAs('NOTAIRE');
    try {
        const result = await contract.submitTransaction('CertifyByNotaire', parcelId, decision, comment);
        return { status: 'success', message: Buffer.from(result).toString('utf8') };
    } finally {
        close();
    }
}

async function queryParcel(parcelId, asRole = 'NOTAIRE') {
    if (USE_MOCK) {
        return {
            docType: 'ParcelProof',
            parcelId,
            status: 'SOUMISE',
            history: [],
            mocked: true,
        };
    }

    const { contract, close } = await connectAs(asRole);
    try {
        const result = await contract.evaluateTransaction('QueryParcel', parcelId);
        return JSON.parse(Buffer.from(result).toString('utf8'));
    } finally {
        close();
    }
}

/**
 * Historique complet des transactions Fabric pour une parcelle (preuve d'immuabilité).
 */
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

/**
 * Vérifie que le hash fourni correspond au dernier hash enregistré sur le ledger.
 */
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

module.exports = {
    submitParcel,
    validateByCadastre,
    certifyByNotaire,
    queryParcel,
    getParcelHistory,
    verifyDocument,
};
