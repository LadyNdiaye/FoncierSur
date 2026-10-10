#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
FAB="$ROOT/blockchain/fabric-network"
TN="$FAB/test-network"
CH=fonciersur-channel
CC=parcelle
VER=1.0
SEQ=1

[ -d "$FAB/bin" ] || (cd "$FAB" && ./install-fabric.sh docker binary)
(cd "$ROOT/blockchain/chaincode/parcelle" && npm install)

cd "$TN"
./network.sh down || true
./network.sh up createChannel -c $CH -ca
(cd addOrg3 && ./addOrg3.sh up -c $CH -ca) || true

export PATH="$FAB/bin:$PATH"
export FABRIC_CFG_PATH="$FAB/config/"
export ORDERER_CA="$TN/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=Org3MSP
export CORE_PEER_TLS_ROOTCERT_FILE="$TN/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$TN/organizations/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp"
export CORE_PEER_ADDRESS=localhost:11051

for i in 1 2 3 4 5 6 7 8 9 10; do
  peer channel fetch 0 channel-artifacts/$CH.block -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com -c $CH --tls --cafile "$ORDERER_CA" && break
  echo "Org3 pas encore membre, nouvel essai ($i/10)..."
  sleep 3
done
peer channel join -b channel-artifacts/$CH.block || true
./scripts/setAnchorPeer.sh 3 $CH || true
for i in 1 2 3; do ./network.sh deployCC -ccn $CC -ccp ../../chaincode/parcelle -ccl typescript -c $CH -ccv $VER -ccs $SEQ && break; echo "deployCC a échoué, nouvel essai ($i/3)..."; sleep 5; done

export PATH="$FAB/bin:$PATH"
export FABRIC_CFG_PATH="$FAB/config/"
export ORDERER_CA="$TN/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=Org3MSP
export CORE_PEER_TLS_ROOTCERT_FILE="$TN/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$TN/organizations/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp"
export CORE_PEER_ADDRESS=localhost:11051

peer lifecycle chaincode install $CC.tar.gz
PKG=$(peer lifecycle chaincode calculatepackageid $CC.tar.gz)
peer lifecycle chaincode approveformyorg -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com --tls --cafile "$ORDERER_CA" \
  --channelID $CH --name $CC --version $VER --package-id "$PKG" --sequence $SEQ
peer lifecycle chaincode querycommitted --channelID $CH --name $CC
echo "Réseau prêt."
