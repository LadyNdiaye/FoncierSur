/**
 * Retry pour les appels Fabric.
 * - On ne réessaie QUE les erreurs transitoires (réseau, pair indisponible, conflit de lecture).
 * - Les refus du chaincode (droits, mauvais statut, doublon…) ne sont JAMAIS réessayés.
 * - Chaque échec est loggué en JSON avec la stack trace.
 */
const MAX_ATTEMPTS = Number(process.env.FABRIC_MAX_RETRIES || 3);
const BASE_DELAY_MS = Number(process.env.FABRIC_RETRY_DELAY_MS || 500);

// Codes gRPC : 4 = DEADLINE_EXCEEDED, 14 = UNAVAILABLE
const TRANSIENT_CODES = new Set([4, 14]);
const TRANSIENT_PATTERN =
    /UNAVAILABLE|DEADLINE_EXCEEDED|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|No connection established|Connect Failed|MVCC_READ_CONFLICT|PHANTOM_READ_CONFLICT/i;

function isTransient(err) {
    if (!err) return false;
    if (TRANSIENT_CODES.has(err.code)) return true;
    return TRANSIENT_PATTERN.test(String(err.message || err));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(operation, fn) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            return await fn();
        } catch (err) {
            const transient = isTransient(err);
            console.error(
                JSON.stringify({
                    level: 'error',
                    service: 'fabric',
                    operation,
                    attempt,
                    maxAttempts: MAX_ATTEMPTS,
                    transient,
                    message: String(err && err.message),
                    stack: err && err.stack,
                })
            );
            if (!transient || attempt === MAX_ATTEMPTS) {
                if (err && typeof err === 'object') err.fabricAttempts = attempt;
                throw err;
            }
            await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
        }
    }
}

/** Enveloppe toutes les fonctions d'un objet avec withRetry. */
function wrapAll(obj) {
    return Object.fromEntries(
        Object.entries(obj).map(([name, fn]) => [
            name,
            typeof fn === 'function' ? (...args) => withRetry(name, () => fn(...args)) : fn,
        ])
    );
}

module.exports = { withRetry, wrapAll, isTransient };