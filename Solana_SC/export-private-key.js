// Export private key from Solana keypair to format for Phantom wallet
const fs = require('fs');
const bs58 = require('bs58'); // Base58 encoding

try {
  // Read the keypair file
  const keypairPath = process.env.HOME + '/.config/solana/id.json';
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  
  // Convert array to Uint8Array
  const secretKey = Uint8Array.from(keypairData);
  
  console.log('=== Private Key Export ===\n');
  console.log('1. Base58 format (for Phantom import):');
  console.log(bs58.encode(secretKey));
  console.log('\n2. Public Key:');
  
  // Import solana-web3.js if available
  try {
    const { Keypair } = require('@solana/web3.js');
    const keypair = Keypair.fromSecretKey(secretKey);
    console.log(keypair.publicKey.toString());
  } catch (e) {
    console.log('(install @solana/web3.js to show public key)');
  }
  
  console.log('\n=== How to import in Phantom ===');
  console.log('1. Open Phantom wallet');
  console.log('2. Go to Settings > Add/Connect Wallet > Import Private Key');
  console.log('3. Paste the Base58 string above');
  console.log('\n⚠️  KEEP THIS PRIVATE KEY SECRET!');
  
} catch (error) {
  console.error('Error:', error.message);
  console.log('\nMake sure:');
  console.log('1. Keypair file exists at ~/.config/solana/id.json');
  console.log('2. Install bs58: npm install bs58');
}
