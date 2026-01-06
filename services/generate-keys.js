const fs = require('fs');
const { generateKeyPairSync } = require('crypto');

// Generate 2048-bit RSA key pair
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Save private key
fs.writeFileSync('server.key', privateKey);
console.log('Private key saved to server.key');

// Save public certificate (you will upload this to Salesforce)
fs.writeFileSync('server.crt', publicKey);
console.log('Public certificate saved to server.crt');
