# 🏛️ FoncierSûr

**Plateforme SaaS de traçabilité foncière sécurisée par blockchain, pour le Sénégal.**

FoncierSûr numérise le cycle de vie d'un dossier foncier — de la soumission par le promoteur jusqu'à la certification notariale — en s'appuyant sur **Hyperledger Fabric** pour garantir un registre infalsifiable des étapes de validation, et sur **PostGIS** pour détecter automatiquement les chevauchements et anomalies géométriques.

> ⚠️ FoncierSûr n'est pas un système d'enregistrement légal. C'est un outil de **traçabilité et de preuve** : la blockchain n'enregistre jamais de données personnelles ou de titres de propriété eux-mêmes, seulement l'historique immuable des décisions prises sur un dossier.

---

## 📐 Architecture

```mermaid
graph TD
    subgraph Frontend["Frontend React"]
        P[Portail Promoteur]
        C[Portail Cadastre]
        N[Portail Notaire]
    end

    subgraph Backend["Backend Node.js / Express"]
        API[API REST]
        GEO[geospatialService<br/>PostGIS]
        DOC[documentService<br/>SHA-256]
        BC[blockchainService<br/>Fabric Gateway]
    end

    subgraph Data["Stockage"]
        PG[(PostgreSQL + PostGIS)]
    end

    subgraph Fabric["Réseau Hyperledger Fabric"]
        ORD[Orderer]
        O1[Peer Org1<br/>Promoteur]
        O2[Peer Org2<br/>Cadastre]
        O3[Peer Org3<br/>Notaire]
        CC[Chaincode parcelle]
    end

    P --> API
    C --> API
    N --> API
    API --> GEO --> PG
    API --> DOC --> PG
    API --> BC --> ORD
    ORD --> O1 & O2 & O3
    O1 & O2 & O3 --> CC
```

**Flux métier** : le Promoteur soumet une parcelle (géométrie + document) → contrôles PostGIS automatiques (validité, superficie, chevauchement) → transaction Fabric `SubmitParcel` → le Cadastre valide techniquement (`ValidateByCadastre`) → le Notaire certifie juridiquement (`CertifyByNotaire`). Chaque transition d'état est enregistrée de façon immuable sur le ledger Fabric.

| Rôle métier | Organisation Fabric | Responsabilité |
|---|---|---|
| Promoteur | `Org1MSP` | Soumet le dossier (géométrie, document) |
| Cadastre | `Org2MSP` | Valide la conformité technique |
| Notaire | `Org3MSP` | Certifie juridiquement et clôture le dossier |

---

## 🧰 Prérequis

| Outil | Version recommandée | Vérifier avec |
|---|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 24.x ou plus récent | `docker --version` |
| [Node.js](https://nodejs.org/) | 20.x LTS | `node --version` |
| [Git](https://git-scm.com/) | toute version récente | `git --version` |
| WSL2 (si Windows) | Ubuntu 22.04+ | `wsl --version` |

> 💡 Le réseau blockchain télécharge automatiquement les images Docker Hyperledger Fabric (~2 Go) au premier lancement — prévoyez une connexion correcte pour cette étape unique.

---

## 🚀 Démarrage en 5 minutes

### 1. Cloner le projet

```bash
git clone https://github.com/LadyNdiaye/FoncierSur.git
cd FoncierSur
```

### 2. Démarrer le réseau blockchain (Hyperledger Fabric)

```bash
cd blockchain/fabric-network/test-network
./network.sh up createChannel -c fonciersur-channel -ca
./addOrg3/addOrg3.sh up -c fonciersur-channel
```

### 3. Déployer le chaincode

```bash
./network.sh deployCC -ccn parcelle -ccp ../../chaincode/parcelle -ccl typescript -c fonciersur-channel -ccv 1.0 -ccs 1
```

> Le script `deployCC` installe et approuve automatiquement pour Org1 et Org2 seulement. Voir la section [Réseau blockchain — commandes détaillées](#-réseau-blockchain--commandes-détaillées) plus bas pour l'installation manuelle sur Org3 (Notaire).

### 4. Démarrer la base de données et le backend

```bash
cd ../../../backend
cp .env.example .env
npm install
npm start
```

### 5. Démarrer le frontend

```bash
cd ../frontend
npm install
npm run dev
```

### 6. Ouvrir l'application

| Portail | URL |
|---|---|
| Application (Vite) | http://localhost:5173 |
| API Backend | http://localhost:5000/api/v1 |

---

## 📸 Aperçu des 3 portails

### Espace Promoteur
_(dessin du polygone sur la carte, upload du document, suivi du dossier)_

![Portail Promoteur](docs/screenshots/promoteur.png)

### Espace Cadastre
_(liste des dossiers soumis, visualisation des chevauchements, validation technique)_

![Portail Cadastre](docs/screenshots/cadastre.png)

### Espace Notaire
_(certification finale, historique des transactions blockchain, vérification d'intégrité)_

![Portail Notaire](docs/screenshots/notaire.png)

> 📁 Placez vos captures d'écran dans `docs/screenshots/` sous ces noms exacts pour qu'elles s'affichent automatiquement ici.

---

## 🎥 Vidéo de démonstration

▶️ **[Voir la démo complète du workflow (Soumission → Validation → Certification)](LIEN_YOUTUBE_OU_LOOM_ICI)**

---

## 🗂️ Structure du projet

---

## ⛓️ Réseau blockchain — commandes détaillées

### Mapping organisations ↔ rôles métier

| Organisation Fabric | Rôle métier | Port peer |
|---|---|---|
| `Org1MSP` | Promoteur | `localhost:7051` |
| `Org2MSP` | Cadastre | `localhost:9051` |
| `Org3MSP` | Notaire | `localhost:11051` |

> Le réseau utilise le **test-network officiel** de `fabric-samples`, avec **Fabric CA** pour la génération des identités.

### Installer le chaincode manuellement sur Org3 (Notaire)

Le script `deployCC` ne couvre qu'Org1 et Org2. Après l'avoir lancé :

```bash
cd blockchain/fabric-network/test-network
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem

export CORE_PEER_LOCALMSPID="Org3MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp
export CORE_PEER_ADDRESS=localhost:11051

peer lifecycle chaincode install parcelle.tar.gz

# Récupérer le PACKAGE_ID affiché ci-dessus, puis :
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile "$ORDERER_CA" \
  --channelID fonciersur-channel --name parcelle --version 1.0 \
  --package-id <PACKAGE_ID> --sequence 1

peer lifecycle chaincode querycommitted --channelID fonciersur-channel --name parcelle
```

### Mettre à jour le chaincode après une modification

```bash
./network.sh deployCC -ccn parcelle -ccp ../../chaincode/parcelle -ccl typescript -c fonciersur-channel -ccv <NOUVELLE_VERSION> -ccs <NOUVELLE_SEQUENCE>
```

Puis répéter la procédure manuelle Org3 ci-dessus avec les nouvelles valeurs.

### Vérifier que la blockchain fonctionne (démo CLI)

```bash
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile "$ORDERER_CA" \
  -C fonciersur-channel -n parcelle \
  --peerAddresses localhost:7051 --tlsRootCertFiles organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem \
  --peerAddresses localhost:9051 --tlsRootCertFiles organizations/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem \
  -c '{"function":"SubmitParcel","Args":["test-001","REF-001","hash123"]}'

peer chaincode query -C fonciersur-channel -n parcelle \
  -c '{"function":"GetParcelHistory","Args":["test-001"]}'
```

### Arrêter et nettoyer le réseau

```bash
cd blockchain/fabric-network/test-network
./network.sh down
```

⚠️ Supprime les volumes (ledgers) — le chaincode devra être redéployé depuis la version 1 après un redémarrage complet.

### Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `access denied: creator org unknown` | Certificats désynchronisés | `./network.sh down` puis `up` à nouveau |
| `ProposalResponsePayloads do not match` | Code non-déterministe dans le chaincode | Utiliser `ctx.stub.getTxTimestamp()`, jamais l'horloge système |
| `Peer binary and configuration files not found` | `bin/`/`config/` absents | Relancer `install-fabric.sh docker binary` |

---

## 👥 Équipe

| Membre | Rôle |
|---|---|
| Ndeye Coumba Ndiaye | Lead Blockchain — réseau Fabric, chaincode, Espace Notaire |
| Carla Diatta | Backend Core — authentification, API, Espace Cadastre |
| Mame Ndiaya Gaye | Géospatial — PostGIS, gestion documentaire, Espace Promoteur |

Projet réalisé dans le cadre du Projet de Fin de Formation (PFF), ISEP Diamniadio.
