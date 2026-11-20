require('dotenv').config();
const {
    submitParcel,
    validateByCadastre,
    certifyByNotaire,
    rejectByNotaire,
    queryParcel,
    getParcelHistory,
    verifyDocument,
} = require('../src/services/blockchainService');
const { connectAs } = require('../src/config/fabric');

let echecs = 0;
function verifier(libelle, condition) {
    console.log(`   ${condition ? 'OK ' : 'ÉCHEC'}  ${libelle}`);
    if (!condition) echecs++;
}

/** Appelle directement le chaincode avec l'identité d'un rôle : doit être REFUSÉ par Fabric. */
async function doitEtreRefuse(libelle, role, fonction, args) {
    const { contract, close } = await connectAs(role);
    try {
        await contract.submitTransaction(fonction, ...args);
        verifier(libelle, false);
    } catch (err) {
        verifier(libelle, true);
    } finally {
        close();
    }
}

async function main() {
    const parcelId = 'backend-test-' + Date.now();
    const docHash = 'hash-backend-test';
    const userId = 'user-test-001';
    console.log(`\n=== Workflow complet pour ${parcelId} ===\n`);

    console.log('1. Soumission (Promoteur)');
    await submitParcel(parcelId, 'REF-BACKEND-002', docHash, userId);

    console.log('2. Un acteur ne peut pas faire le travail d\'un autre');
    await doitEtreRefuse('Le Notaire ne peut pas valider à la place du Cadastre', 'NOTAIRE', 'ValidateByCadastre', [parcelId, userId, 'VALIDE_CADASTRE', 'x']);
    await doitEtreRefuse('Le Promoteur ne peut pas valider à la place du Cadastre', 'PROMOTEUR', 'ValidateByCadastre', [parcelId, userId, 'VALIDE_CADASTRE', 'x']);
    await doitEtreRefuse('Le Cadastre ne peut pas certifier', 'CADASTRE', 'CertifyByNotaire', [parcelId, userId, 'x']);
    await doitEtreRefuse('Chaîne stricte : le Notaire ne peut pas certifier avant le Cadastre', 'NOTAIRE', 'CertifyByNotaire', [parcelId, userId, 'x']);
    await doitEtreRefuse('Le Cadastre ne peut pas soumettre une parcelle', 'CADASTRE', 'SubmitParcel', ['autre-' + Date.now(), 'REF', 'h', userId]);
    await doitEtreRefuse('Statut Cadastre invalide refusé', 'CADASTRE', 'ValidateByCadastre', [parcelId, userId, 'CERTIFIEE', 'x']);

    console.log('3. Validation Cadastre');
    await validateByCadastre(parcelId, userId, 'VALIDE_CADASTRE', 'Dossier conforme');
    await doitEtreRefuse('Double validation Cadastre refusée', 'CADASTRE', 'ValidateByCadastre', [parcelId, userId, 'VALIDE_CADASTRE', 'x']);

    console.log('4. Certification Notaire');
    await certifyByNotaire(parcelId, userId, 'Certificat émis');
    await doitEtreRefuse('Parcelle certifiée : plus aucune modification possible', 'NOTAIRE', 'RejectByNotaire', [parcelId, userId, 'x']);

    console.log('5. Lecture, historique et intégrité');
    const record = await queryParcel(parcelId);
    const history = await getParcelHistory(parcelId);
    verifier('statut final CERTIFIEE', record.status === 'CERTIFIEE');
    verifier('userId enregistré à chaque étape', record.history.every((e) => e.userId === userId));
    verifier('3 transactions dans l\'historique du ledger', history.length === 3);
    verifier('hash du document valide', (await verifyDocument(parcelId, docHash)) === true);
    verifier('hash modifié détecté', (await verifyDocument(parcelId, 'hash-falsifie')) === false);

    console.log('\n6. Rejet par le Notaire sur une seconde parcelle');
    const p2 = parcelId + '-rejet';
    await submitParcel(p2, 'REF-REJET', docHash, userId);
    await validateByCadastre(p2, userId, 'VALIDE_CADASTRE', 'OK');
    await rejectByNotaire(p2, userId, 'Acte incomplet');
    verifier('statut REJETE_NOTAIRE', (await queryParcel(p2)).status === 'REJETE_NOTAIRE');

    console.log('\n7. Rejet par le Cadastre sur une troisième parcelle');
    const p3 = parcelId + '-rejet-cadastre';
    await submitParcel(p3, 'REF-REJET-CAD', docHash, userId);
    await validateByCadastre(p3, userId, 'REJETE_CADASTRE', 'Plan non conforme');
    verifier('statut REJETE_CADASTRE', (await queryParcel(p3)).status === 'REJETE_CADASTRE');

    console.log(echecs === 0
        ? '\n✅ Workflow, contrôle des rôles, chaîne stricte, historique et intégrité validés depuis le backend.'
        : `\n❌ ${echecs} vérification(s) en échec — voir le détail ci-dessus.`);
    process.exit(echecs === 0 ? 0 : 1);
}

main().catch((err) => {
    console.error('Erreur:', err);
    process.exit(1);
});
