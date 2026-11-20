import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';

interface TransactionEvent {
    event: string;
    actor: string;      // identité Fabric (certificat) de l'appelant
    userId: string;     // utilisateur FoncierSûr (cahier : paramètre userId)
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
    creatorUserId: string;
    createdAt: string;
    updatedAt: string;
    history: TransactionEvent[];
}

// Org1 = Promoteur, Org2 = Cadastre, Org3 = Notaire (test-network officiel).
const MSP_PROMOTEUR = 'Org1MSP';
const MSP_CADASTRE = 'Org2MSP';
const MSP_NOTAIRE = 'Org3MSP';

const STATUTS_CADASTRE = ['VALIDE_CADASTRE', 'REJETE_CADASTRE'];

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
     * Cahier : SubmitParcel(parcelId, reference, docHash, userId)
     * Appelée par l'organisation Promoteur (Org1MSP)
     */
    @Transaction()
    public async SubmitParcel(
        ctx: Context,
        parcelId: string,
        reference: string,
        docHash: string,
        userId: string,
    ): Promise<string> {
        if (!this.isFromOrg(ctx, MSP_PROMOTEUR)) {
            throw new Error('Seul le Promoteur peut soumettre une parcelle');
        }
        this.requireUserId(userId);

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
            creatorUserId: userId,
            createdAt: now,
            updatedAt: now,
            history: [
                {
                    event: 'SOUMISE',
                    actor,
                    userId,
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
     * Cahier : ValidateByCadastre(parcelId, userId, status, comment)
     * status : 'VALIDE_CADASTRE' (approbation) ou 'REJETE_CADASTRE' (rejet)
     * Appelée par l'organisation Cadastre (Org2MSP)
     */
    @Transaction()
    public async ValidateByCadastre(
        ctx: Context,
        parcelId: string,
        userId: string,
        status: string,
        comment: string,
    ): Promise<string> {
        if (!this.isFromOrg(ctx, MSP_CADASTRE)) {
            throw new Error('Seul le Cadastre peut faire cette validation');
        }
        this.requireUserId(userId);
        if (!STATUTS_CADASTRE.includes(status)) {
            throw new Error(`Statut invalide "${status}" (attendu : ${STATUTS_CADASTRE.join(' ou ')})`);
        }

        const record = await this.readRecord(ctx, parcelId);

        if (record.status !== 'SOUMISE') {
            throw new Error(`La parcelle doit être à l'état SOUMISE (état actuel: ${record.status})`);
        }

        await this.changeStatus(ctx, record, status, userId, comment);
        ctx.stub.setEvent('ParcelValidatedByCadastre', Buffer.from(parcelId));

        return `Parcelle ${record.reference} ${status} par le Cadastre`;
    }

    /**
     * Cahier : CertifyByNotaire(parcelId, userId, comment)
     * Appelée par l'organisation Notaire (Org3MSP)
     */
    @Transaction()
    public async CertifyByNotaire(
        ctx: Context,
        parcelId: string,
        userId: string,
        comment: string,
    ): Promise<string> {
        const record = await this.preparerNotaire(ctx, parcelId, userId);

        await this.changeStatus(ctx, record, 'CERTIFIEE', userId, comment);
        ctx.stub.setEvent('ParcelCertifiedByNotaire', Buffer.from(parcelId));

        return `Parcelle ${record.reference} CERTIFIEE par le Notaire`;
    }

    /**
     * Ajout (le cahier ne définit pas le rejet du Notaire) : RejectByNotaire(parcelId, userId, comment)
     * La signature de CertifyByNotaire reste celle du cahier.
     */
    @Transaction()
    public async RejectByNotaire(
        ctx: Context,
        parcelId: string,
        userId: string,
        comment: string,
    ): Promise<string> {
        const record = await this.preparerNotaire(ctx, parcelId, userId);

        await this.changeStatus(ctx, record, 'REJETE_NOTAIRE', userId, comment);
        ctx.stub.setEvent('ParcelRejectedByNotaire', Buffer.from(parcelId));

        return `Parcelle ${record.reference} REJETE_NOTAIRE par le Notaire`;
    }

    /**
     * Consulter une parcelle (accessible à tous les acteurs du channel)
     */
    @Transaction(false)
    @Returns('string')
    public async QueryParcel(ctx: Context, parcelId: string): Promise<string> {
        const record = await this.readRecord(ctx, parcelId);
        return JSON.stringify(record);
    }

    /**
     * Historique complet des transactions d'une parcelle
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
     * Vérifier l'intégrité d'un document
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

    private requireUserId(userId: string): void {
        if (!userId || !userId.trim()) {
            throw new Error('userId obligatoire');
        }
    }

    /** Contrôles communs à la certification et au rejet du Notaire (organisation, userId, chaîne stricte). */
    private async preparerNotaire(ctx: Context, parcelId: string, userId: string): Promise<ParcelRecord> {
        if (!this.isFromOrg(ctx, MSP_NOTAIRE)) {
            throw new Error('Seul le Notaire peut certifier');
        }
        this.requireUserId(userId);

        const record = await this.readRecord(ctx, parcelId);
        if (record.status !== 'VALIDE_CADASTRE') {
            throw new Error(`La parcelle doit être validée par le Cadastre (état actuel: ${record.status})`);
        }
        return record;
    }

    private async changeStatus(
        ctx: Context,
        record: ParcelRecord,
        newStatus: string,
        userId: string,
        comment: string,
    ): Promise<void> {
        const now = getDeterministicTimestamp(ctx);
        record.status = newStatus;
        record.updatedAt = now;
        record.history.push({
            event: newStatus,
            actor: ctx.clientIdentity.getID(),
            userId,
            timestamp: now,
            comment,
        });
        await ctx.stub.putState(record.parcelId, Buffer.from(JSON.stringify(record)));
    }

    private async recordExists(ctx: Context, parcelId: string): Promise<boolean> {
        const data = await ctx.stub.getState(parcelId);
        return !!data && data.length > 0;
    }

    private async readRecord(ctx: Context, parcelId: string): Promise<ParcelRecord> {
        const data = await ctx.stub.getState(parcelId);
        if (!data || data.length === 0) {
            throw new Error(`Aucune preuve trouvée sur le ledger pour la parcelle ${parcelId}`);
        }
        return JSON.parse(data.toString()) as ParcelRecord;
    }
}