import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function generateSupportKeyPair() {
  console.log('Generating NIST P-256 (prime256v1) EC key pair for Remote Support...');

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  const outputDir = process.cwd();
  const pubPath = path.join(outputDir, 'support_public.pem');
  const privPath = path.join(outputDir, 'support_private.pem');

  fs.writeFileSync(pubPath, publicKey, 'utf8');
  fs.writeFileSync(privPath, privateKey, 'utf8');

  console.log(`Generated and saved public key to: ${pubPath}`);
  console.log(`Generated and saved private key to: ${privPath}`);
  
  console.log('\n--- PUBLIC KEY PEM ---');
  console.log(publicKey);
  console.log('----------------------');
}

generateSupportKeyPair();
