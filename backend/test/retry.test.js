process.env.FABRIC_RETRY_DELAY_MS = '1';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { withRetry, isTransient } = require('../src/utils/retry');

// Ces tests n'ont pas besoin du réseau Fabric.
describe('Retry Fabric', () => {
  it('reconnaît les erreurs réseau comme transitoires', () => {
    assert.equal(isTransient(new Error('14 UNAVAILABLE: No connection established')), true);
    assert.equal(isTransient({ code: 4, message: 'timeout' }), true);
  });

  it('ne considère pas un refus du chaincode comme transitoire', () => {
    assert.equal(isTransient(new Error('chaincode response 500, Seul le Cadastre peut faire cette validation')), false);
  });

  it('réessaie 3 fois une erreur transitoire puis échoue', async () => {
    let appels = 0;
    await assert.rejects(
      withRetry('test', async () => { appels++; throw new Error('UNAVAILABLE'); }),
      /UNAVAILABLE/
    );
    assert.equal(appels, 3);
  });

  it('ne réessaie jamais un refus du chaincode', async () => {
    let appels = 0;
    await assert.rejects(
      withRetry('test', async () => { appels++; throw new Error('Seul le Notaire peut certifier'); }),
      /Seul le Notaire/
    );
    assert.equal(appels, 1);
  });
});
