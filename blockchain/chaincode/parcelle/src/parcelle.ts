import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';

interface TransactionEvent {
    event: string;
    actor: string;
    timestamp: string;
    comment?: string;
    hash?: string;
}

interface ParcelRecord {
    docType: string;
    parcelId: string;
    reference: string;
    status: string;
    docHash: string;
    creator: string;
    createdAt: string;
    updatedAt: string;
    history: TransactionEvent[];
}

// Mapping des organisations Fabric vers les rôles métier FoncierSur.
// Org1 = Promoteur, Org2 = Cadastre, Org3 = Notaire (test-network officiel).
const MSP_PROMOTEUR = 'Org1MSP';
const MSP_CADASTRE = 'Org2MSP';
const MSP_NOTAIRE = 'Org3MSP';

function getDeterministicTimestamp(ctx: Context): string {
    const ts = ctx.stub.getTxTimestamp();
    const millis = ts.seconds.toNumber() * 1000 + Math.floor(ts.nanos / 1e6);
    return new Date(millis).toISOString();
}

@Info({ title: 'ParcelleContract', description: 'Registre de preuves pour les parcelles FoncierSur' })
export class ParcelleContract extends Contract {

    @Transaction()
    public async Init(ctx: Context): Promise<void> {
        console.info('Chaincode parcelle initialisé');
    }

    /**
     * Méthode 1: Soumettre une parcelle
     * Appelée par l'organisation Promoteur (Org1MSP)
     */
    @Transaction()
    public async SubmitParcel(
        ctx: Context,
        parcelId: string,
        reference: string,
        docHash: string,
    ): Promise<string> {
        if (!this.isFromOrg(ctx, MSP_PROMOTEUR)) {
            throw new Error('Seul le Promoteur peut soumettre une parcelle');
        }

        const exists = await this.recordExists(ctx, parcelId);
        if (exists) {
            throw new Error(`La parcelle ${parcelId} existe déjà`);
        }

        const actor = ctx.clientIdentity.getID();
        const now = getDeterministicTimestamp(ctx);

        const record: ParcelRecord = {
            docType: 'ParcelProof',
            parcelId,
            reference,
            status: 'SOUMISE',
            docHash,
            creator: actor,
            createdAt: now,
            updatedAt: now,
            history: [
                {
                    event: 'SOUMISE',
                    actor,
                    timestamp: now,
                    hash: docHash,
                },
            ],
        };

        await ctx.stub.putState(parcelId, Buffer.from(JSON.stringify(record)));
        ctx.stub.setEvent('ParcelSubmitted', Buffer.from(parcelId));

        return `Parcelle ${reference} soumise avec succès`;
    }

    /**
     * Méthode 2: Valider par le Cadastre
     * Appelée par l'organisation Cadastre (Org2MSP)
     */
    @Transaction()
    public async ValidateByCadastre(
        ctx: Context,
        parcelId: string,
        decision: string,
        comment: string,
    ): Promise<string> {
        if (!this.isFromOrg(ctx, MSP_CADASTRE)) {
            throw new Error('Seul le Cadastre peut faire cette validation');
        }

        const record = await this.readRecord(ctx, parcelId);

        if (record.status !== 'SOUMISE') {
            throw new Error(`La parcelle doit être à l'état SOUMISE (état actuel: ${record.status})`);
        }

        const newStatus = decision === 'APPROUVE' ? 'VALIDE_CADASTRE' : 'REJETE_CADASTRE';
        const actor = ctx.clientIdentity.getID();
        const now = getDeterministicTimestamp(ctx);

        record.status = newStatus;
        record.updatedAt = now;
        record.history.push({
            event: newStatus,
            actor,
            timestamp: now,
            comment,
        });

        await ctx.stub.putState(parcelId, Buffer.from(JSON.stringify(record)));
        ctx.stub.setEvent('ParcelValidatedByCadastre', Buffer.from(parcelId));

        return `Parcelle ${record.reference} ${newStatus} par le Cadastre`;
    }

    /**
     * Méthode 3: Certifier par le Notaire
     * Appelée par l'organisation Notaire (Org3MSP)
     */
    @Transaction()
    public async CertifyByNotaire(
        ctx: Context,
        parcelId: string,
        decision: string,
        comment: string,
    ): Promise<string> {
        if (!this.isFromOrg(ctx, MSP_NOTAIRE)) {
            throw new Error('Seul le Notaire peut certifier');
        }

        const record = await this.readRecord(ctx, parcelId);

        if (record.status !== 'VALIDE_CADASTRE') {
            throw new Error(`La parcelle doit être validée par le Cadastre (état actuel: ${record.status})`);
        }

        const newStatus = decision === 'CERTIFIE' ? 'CERTIFIEE' : 'REJETE_NOTAIRE';
        const actor = ctx.clientIdentity.getID();
        const now = getDeterministicTimestamp(ctx);

        record.status = newStatus;
        record.updatedAt = now;
        record.history.push({
            event: newStatus,
            actor,
            timestamp: now,
            comment,
        });

        await ctx.stub.putState(parcelId, Buffer.from(JSON.stringify(record)));
        ctx.stub.setEvent('ParcelCertifiedByNotaire', Buffer.from(parcelId));

        return `Parcelle ${record.reference} ${newStatus} par le Notaire`;
    }

    /**
     * Méthode 4: Consulter une parcelle (accessible à tous les acteurs du channel)
     */
    @Transaction(false)
    @Returns('string')
    public async QueryParcel(ctx: Context, parcelId: string): Promise<string> {
        const record = await this.readRecord(ctx, parcelId);
        return JSON.stringify(record);
    }

    /**
     * Méthode 5: Historique complet des transactions d'une parcelle
     */
    @Transaction(false)
    @Returns('string')
    public async GetParcelHistory(ctx: Context, parcelId: string): Promise<string> {
        const iterator = await ctx.stub.getHistoryForKey(parcelId);
        const results: any[] = [];

        let result = await iterator.next();
        while (!result.done) {
            if (result.value) {
                results.push({
                    txId: result.value.txId,
                    timestamp: result.value.timestamp,
                    value: result.value.value
                        ? JSON.parse(Buffer.from(result.value.value).toString('utf8'))
                        : null,
                    isDelete: result.value.isDelete,
                });
            }
            result = await iterator.next();
        }
        await iterator.close();

        return JSON.stringify(results);
    }

    /**
     * Méthode 6: Vérifier l'intégrité d'un document
     * Compare le hash fourni avec celui du dernier événement de l'historique
     */
    @Transaction(false)
    @Returns('boolean')
    public async VerifyDocument(ctx: Context, parcelId: string, providedHash: string): Promise<boolean> {
        const record = await this.readRecord(ctx, parcelId);
        const lastEventWithHash = [...record.history].reverse().find((e) => e.hash);
        return lastEventWithHash?.hash === providedHash;
    }

    private isFromOrg(ctx: Context, mspId: string): boolean {
        return ctx.clientIdentity.getMSPID() === mspId;
    }

    private async recordExists(ctx: Context, parcelId: string): Promise<boolean> {
        const data = await ctx.stub.getState(parcelId);
        return data && data.length > 0;
    }

    private async readRecord(ctx: Context, parcelId: string): Promise<ParcelRecord> {
        const data = await ctx.stub.getState(parcelId);
        if (!data || data.length === 0) {
            throw new Error(`Aucune preuve trouvée sur le ledger pour la parcelle ${parcelId}`);
        }
        return JSON.parse(data.toString()) as ParcelRecord;
    }
}
