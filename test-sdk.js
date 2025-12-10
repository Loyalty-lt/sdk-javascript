import { LoyaltySDK } from './dist/index.esm.js';

const API_KEY = process.env.LOYALTY_API_KEY || 'lty_E5YRglQw17VnxGqOgljTgjogh69B1l97ZRPBJBKL';
const API_SECRET = process.env.LOYALTY_API_SECRET || 'J8x8wc9EJFbt7W4HODaavtveejcVKZT57ZlLew6vPaaETdbgwkEQJrdeo1qGBpd7';

const sdk = new LoyaltySDK({
  apiKey: API_KEY,
  apiSecret: API_SECRET,
  environment: 'production',
  locale: 'lt',
  debug: true
});

async function testSDK() {
  try {
    console.log('1. Health check...');
    const health = await sdk.healthCheck();
    console.log('   ✓ Health:', health);

    console.log('\n2. Validate credentials...');
    const credentials = await sdk.validateCredentials();
    console.log('   ✓ Partner:', credentials.partner_name);

    console.log('\n3. Get shops (active only - default)...');
    const activeShops = await sdk.getShops();
    console.log('   ✓ Active shops:', activeShops.data?.length || 0);

    console.log('\n3b. Get shops (inactive)...');
    const inactiveShops = await sdk.getShops({ is_active: false });
    console.log('   ✓ Inactive shops:', inactiveShops.data?.length || 0);
    if (inactiveShops.data?.length > 0) {
      console.log('   First inactive shop:', inactiveShops.data[0].name);
    }

    console.log('\n4. Get loyalty cards...');
    const cards = await sdk.getLoyaltyCards({ per_page: 5 });
    console.log('   ✓ Cards:', cards.data?.length || 0);

    console.log('\n5. Generate QR Card Session...');
    const session = await sdk.generateQrCardSession('Test Terminal');
    console.log('   ✓ Session ID:', session.session_id);
    console.log('   ✓ QR Code:', session.qr_code);
    console.log('   ✓ Channel:', session.ably_channel);

    console.log('\n6. Get Ably Token...');
    const token = await sdk.getAblyToken(session.session_id);
    console.log('   ✓ Token received');
    console.log('   ✓ Channel:', token.channel);

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) console.error('   Code:', error.code);
  }
}

testSDK();
