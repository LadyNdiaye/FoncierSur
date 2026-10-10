const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const NETWORK_PATH = process.env.FABRIC_NETWORK_PATH;
const CHANNEL_NAME = process.env.FABRIC_CHANNEL_NAME || 'fonciersur-channel';
const CHAINCODE_NAME = process.env.FABRIC_CHAINCODE_NAME || 'parcelle';

// Mapping rôle métier -> organisation Fabric
const ORG_CONFIG = {
    PROMOTEUR: {
        mspId: 'Org1MSP',
        orgDomain: 'org1.example.com',
        peerEndpoint: 'localhost:7051',
        peerHostAlias: 'peer0.org1.example.com',
    },
    CADASTRE: {
        mspId: 'Org2MSP',
        orgDomain: 'org2.example.com',
        peerEndpoint: 'localhost:9051',
        peerHostAlias: 'peer0.org2.example.com',
    },
    NOTAIRE: {
        mspId: 'Org3MSP',
        orgDomain: 'org3.example.com',
        peerEndpoint: 'localhost:11051',
        peerHostAlias: 'peer0.org3.example.com',
    },
};

function orgPaths(orgDomain) {
    const base = path.join(NETWORK_PATH, 'organizations', 'peerOrganizations', orgDomain);
    return {
        certDir: path.join(base, 'users', `User1@${orgDomain}`, 'msp', 'signcerts'),
        keyDir: path.join(base, 'users', `User1@${orgDomain}`, 'msp', 'keystore'),
        tlsCertPath: path.join(base, 'peers', `peer0.${orgDomain}`, 'tls', 'ca.crt'),
    };
}

function readFirstFile(dir) {
    const files = fs.readdirSync(dir);
    if (files.length === 0) {
        throw new Error(`Aucun fichier trouvé dans ${dir}`);
    }
    return fs.readFileSync(path.join(dir, files[0]));
}

async function newGrpcConnection(orgDomain, peerEndpoint, peerHostAlias) {
    const { tlsCertPath } = orgPaths(orgDomain);
    const tlsRootCert = fs.readFileSync(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

/**
 * Établit une connexion Gateway pour le rôle métier donné (PROMOTEUR, CADASTRE, NOTAIRE).
 * Retourne { gateway, contract, close } — appeler close() une fois la transaction terminée.
 */
async function connectAs(role) {
    const org = ORG_CONFIG[role];
    if (!org) {
        throw new Error(`Rôle inconnu: ${role}. Attendu: PROMOTEUR, CADASTRE, ou NOTAIRE`);
    }

    const { certDir, keyDir } = orgPaths(org.orgDomain);
    const credentials = readFirstFile(certDir);
    const privateKeyPem = readFirstFile(keyDir);
    const privateKey = crypto.createPrivateKey(privateKeyPem);

    const client = await newGrpcConnection(org.orgDomain, org.peerEndpoint, org.peerHostAlias);

    const gateway = connect({
        client,
        identity: { mspId: org.mspId, credentials },
        signer: signers.newPrivateKeySigner(privateKey),
        evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
        endorseOptions: () => ({ deadline: Date.now() + 15000 }),
        submitOptions: () => ({ deadline: Date.now() + 5000 }),
        commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
    });

    const network = gateway.getNetwork(CHANNEL_NAME);
    const contract = network.getContract(CHAINCODE_NAME);

    return {
        gateway,
        contract,
        close: () => {
            gateway.close();
            client.close();
        },
    };
}

module.exports = { connectAs, ORG_CONFIG };
