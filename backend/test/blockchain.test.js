process.env.USE_MOCK_BLOCKCHAIN = 'false';
require('dotenv').config();

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const bc = require('../src/services/blockchainService');
const { connectAs } = require('../src/config/fabric');

const T = { timeout: 90000 };
const HASH = 'a3f5c6d7e8f9a3f5c6d7e8f9a3f5c6d7e8f9a3f5c6d7e8f9a3f5c6d7e8f9abcd';
const newId = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

// Appel direct du chaincode sous l'identité d'un rôle précis (pour tester les refus).
async function callAs(role, fn, ...args) {
  const { contract, close } = await connectAs(role);
  try {
    return await contract.submitTransaction(fn, ...args);
  } finally {
    close();
  }
}

// Vérifie que la promesse échoue ET que l'erreur contient le motif attendu.
async function assertRejects(promise, pattern) {
  try {
    await promise;
  } catch (err) {
    const text = JSON.stringify(err, Object.getOwnPropertyNames(err));
    assert.match(text, pattern, `Erreur inattendue : ${err.message}`);
    return;
  }
  assert.fail('La transaction aurait dû être refusée');
}

describe('Chaincode parcelle : workflow nominal', () => {
  it('Soumission -> Cadastre -> Notaire, avec historique et intégrité', T, async () => {
    const id = newId('wf');

    await bc.submitParcel(id, 'REF-TEST', HASH);
    let rec = await bc.queryParcel(id);
    assert.equal(rec.status, 'SOUMISE');
    assert.equal(rec.docHash, HASH);
    assert.equal(rec.history.length, 1);

    await bc.validateByCadastre(id, 'APPROUVE', 'Dossier conforme');
    rec = await bc.queryParcel(id);
    assert.equal(rec.status, 'VALIDE_CADASTRE');

    await bc.certifyByNotaire(id, 'CERTIFIE', 'Certificat émis');
    rec = await bc.queryParcel(id);
    assert.equal(rec.status, 'CERTIFIEE');
    assert.equal(rec.history.length, 3);
    assert.deepEqual(
      rec.history.map((h) => h.event),
      ['SOUMISE', 'VALIDE_CADASTRE', 'CERTIFIEE']
    );

    const ledger = await bc.getParcelHistory(id);
    assert.equal(ledger.length, 3, 'Une transaction distincte par étape');
    const txIds = new Set(ledger.map((e) => e.txId));
    assert.equal(txIds.size, 3, 'Les txId doivent être tous différents');

    assert.equal(await bc.verifyDocument(id, HASH), true);
    assert.equal(await bc.verifyDocument(id, 'hash-falsifie'), false);
  });

  it('Rejet par le Cadastre : le Notaire ne peut plus certifier', T, async () => {
    const id = newId('rej');
    await bc.submitParcel(id, 'REF-REJ', HASH);
    await bc.validateByCadastre(id, 'REJETE', 'Pièces manquantes');
    assert.equal((await bc.queryParcel(id)).status, 'REJETE_CADASTRE');

    await assertRejects(bc.certifyByNotaire(id, 'CERTIFIE', 'test'), /REJETE_CADASTRE/);
  });
});

describe('Chaincode parcelle : sécurité par organisation', () => {
  it('Le Cadastre ne peut pas soumettre une parcelle', T, async () => {
    await assertRejects(
      callAs('CADASTRE', 'SubmitParcel', newId('sec'), 'REF', HASH),
      /Seul le Promoteur/
    );
  });

  it('Le Promoteur ne peut pas valider pour le Cadastre', T, async () => {
    const id = newId('sec');
    await bc.submitParcel(id, 'REF', HASH);
    await assertRejects(
      callAs('PROMOTEUR', 'ValidateByCadastre', id, 'APPROUVE', 'x'),
      /Seul le Cadastre/
    );
  });

  it('Le Cadastre ne peut pas certifier pour le Notaire', T, async () => {
    const id = newId('sec');
    await bc.submitParcel(id, 'REF', HASH);
    await bc.validateByCadastre(id, 'APPROUVE', 'ok');
    await assertRejects(
      callAs('CADASTRE', 'CertifyByNotaire', id, 'CERTIFIE', 'x'),
      /Seul le Notaire/
    );
  });
});

describe('Chaincode parcelle : règles de transition', () => {
  it('Le Notaire ne peut pas certifier avant la validation du Cadastre', T, async () => {
    const id = newId('tr');
    await bc.submitParcel(id, 'REF', HASH);
    await assertRejects(bc.certifyByNotaire(id, 'CERTIFIE', 'x'), /Cadastre/);
  });

  it('Une parcelle ne peut pas être soumise deux fois', T, async () => {
    const id = newId('dup');
    await bc.submitParcel(id, 'REF', HASH);
    await assertRejects(bc.submitParcel(id, 'REF', HASH), /existe déjà/);
  });

  it('Une parcelle inconnue est introuvable', T, async () => {
    await assertRejects(bc.queryParcel(newId('inconnue')), /Aucune preuve/);
  });
});
