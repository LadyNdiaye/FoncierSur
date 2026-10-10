require('dotenv').config();
const {
    submitParcel,
    validateByCadastre,
    certifyByNotaire,
    queryParcel,
    getParcelHistory,
    verifyDocument,
} = require('../src/services/blockchainService');

async function main() {
    const parcelId = 'backend-test-' + Date.now();
    const docHash = 'hash-backend-test';
    console.log(`\n=== Test du workflow complet pour ${parcelId} ===\n`);

    console.log('1. Soumission (Promoteur)...');
    console.log('  ', await submitParcel(parcelId, 'REF-BACKEND-002', docHash), '\n');

    console.log('2. Validation Cadastre...');
    console.log('  ', await validateByCadastre(parcelId, 'APPROUVE', 'Dossier conforme'), '\n');

    console.log('3. Certification Notaire...');
    console.log('  ', await certifyByNotaire(parcelId, 'CERTIFIE', 'Certificat émis'), '\n');

    console.log('4. Lecture finale...');
    const record = await queryParcel(parcelId);
    console.log('  ', record, '\n');

    console.log('5. Historique complet (preuve d\'immuabilité)...');
    const history = await getParcelHistory(parcelId);
    console.log(`   ${history.length} transaction(s) trouvée(s) sur le ledger\n`);

    console.log('6. Vérification d\'intégrité du document...');
    const isValid = await verifyDocument(parcelId, docHash);
    console.log('   Hash valide:', isValid, '\n');

    if (record.status === 'CERTIFIEE' && history.length === 3 && isValid) {
        console.log('✅ Workflow complet + historique + intégrité validés depuis le backend !');
    } else {
        console.log('❌ Résultat inattendu — vérifier le détail ci-dessus.');
    }
}

main().catch((err) => {
    console.error('Erreur:', err);
    process.exit(1);
});
