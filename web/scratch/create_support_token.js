import { SignJWT, importPKCS8 } from 'jose';
import fs from 'fs';
import path from 'path';

async function createSupportToken() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node create_support_token.js <machineId> [durationHours] [supportEmail] [supportName]');
    console.log('Example: node create_support_token.js a1b2c3d4e5f6 24 support@shufeltdesigns.com "Support Engineer"');
    process.exit(1);
  }

  const machineId = args[0];
  const durationHours = parseInt(args[1] || '24', 10);
  const supportEmail = args[2] || 'support@shufeltdesigns.com';
  const supportName = args[3] || 'Remote Support Admin';

  const privKeyPath = path.join(process.cwd(), 'support_private.pem');

  if (!fs.existsSync(privKeyPath)) {
    console.error(`Error: Private key not found at ${privKeyPath}. Please run generate_support_keypair.js first.`);
    process.exit(1);
  }

  try {
    const privateKeyPem = fs.readFileSync(privKeyPath, 'utf8');
    const privateKey = await importPKCS8(privateKeyPem, 'ES256');

    console.log(`Generating support token for Machine ID: ${machineId}`);
    console.log(`Duration: ${durationHours} hours`);
    console.log(`User: ${supportName} (${supportEmail})`);

    const token = await new SignJWT({
      machineId,
      supportEmail,
      supportName
    })
      .setProtectedHeader({ alg: 'ES256' })
      .setIssuedAt()
      .setExpirationTime(`${durationHours}h`)
      .sign(privateKey);

    console.log('\n--- GENERATED SUPPORT TOKEN ---');
    console.log(token);
    console.log('--------------------------------\n');
  } catch (err) {
    console.error('Failed to generate support token:', err);
    process.exit(1);
  }
}

createSupportToken();
