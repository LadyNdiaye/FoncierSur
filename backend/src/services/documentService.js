// Hachage des documents déposés (cahier des charges : intégrité documentaire).
// Module de Mame Ndiaya Gaye, repris ici pour la seule fonction de hash :
// le stockage en base se fait directement sur le champ `sha256` de
// Parcelle (schéma de Carla), il n'y a pas de table Document séparée.
const fs = require('fs');
const crypto = require('crypto');

/**
 * Calcule le hash SHA-256 d'un fichier sur disque, en streaming (ne charge
 * pas tout le fichier en mémoire). C'est cette empreinte qui doit être
 * comparée à celle enregistrée sur la blockchain pour prouver qu'un
 * document n'a pas été modifié après son dépôt (écran Notaire).
 */
function calculerHashFichier(cheminFichier) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(cheminFichier);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

module.exports = { calculerHashFichier };
