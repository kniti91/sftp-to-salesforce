const forge = require('node-forge');
const fs = require('fs');

const pki = forge.pki;

// Generate key pair
const keys = pki.rsa.generateKeyPair(2048);

// Create a self-signed certificate
const cert = pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

// Subject and issuer
const attrs = [
  { name: 'commonName', value: 'Salesforce JWT Integration' },
  { name: 'organizationName', value: 'Your Company' },
  { name: 'countryName', value: 'US' }
];
cert.setSubject(attrs);
cert.setIssuer(attrs);

// Self-sign the certificate
cert.sign(keys.privateKey);

// Convert keys and cert to PEM format
const privateKeyPem = pki.privateKeyToPem(keys.privateKey);
const certPem = pki.certificateToPem(cert);

// Save files
fs.writeFileSync('server.key', privateKeyPem);
fs.writeFileSync('server.crt', certPem);

console.log('✅ Private key and X.509 certificate generated!');
