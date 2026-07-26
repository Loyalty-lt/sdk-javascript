import { LoyaltySDK } from '../dist/index.esm.js';

// Initialize SDK with real configuration
const sdk = new LoyaltySDK({
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  partnerId: 'your-partner-id',
  environment: 'staging', // or 'production'
  locale: 'lt',
  debug: true
});

async function main() {
  try {
    console.log('🚀 Loyalty.lt SDK pavyzdys');
    console.log('SDK versija:', sdk.getVersion());
    
    // 1. Request OTP for authentication
    console.log('\n📱 Prašomas OTP kodas...');
    await sdk.requestOtp('+37060000000', 'login');
    console.log('✅ OTP kodas išsiųstas sėkmingai');

    // Note: In real application, you would get OTP from user input
    // For demo purposes, we'll use a mock OTP '123456'
    
    // 2. Login with OTP
    console.log('\n🔐 Prisijungiama su OTP kodu...');
    try {
      const authResponse = await sdk.login('+37060000000', '123456');
      console.log('✅ Prisijungta sėkmingai:', authResponse.user);
      
      // 3. Get user profile
      console.log('\n👤 Gaunama vartotojo informacija...');
      const user = await sdk.me();
      console.log('📋 Vartotojo profilis:', user);

      // 4. Get loyalty cards
      console.log('\n💳 Gaunamos lojalumo kortelės...');
      const cards = await sdk.getLoyaltyCards();
      console.log(`📊 Rasta ${cards.data.length} kortelių:`, cards.data);

      // 5. Get points balance for first card (if exists)
      if (cards.data.length > 0) {
        const firstCard = cards.data[0];
        console.log(`\n🔢 Gaunamas taškų balansas kortelei ${firstCard.id}...`);
        const balance = await sdk.getPointsBalance(firstCard.id);
        console.log('💰 Taškų balansas:', balance);
      }

      // 6. Get active offers
      console.log('\n🎁 Gaunami aktyvūs pasiūlymai...');
      const offers = await sdk.getOffers({ is_active: true });
      console.log(`🛍️ Rasta ${offers.data.length} pasiūlymų:`, offers.data);

      // 7. Get active coupons
      console.log('\n🎫 Gaunami aktyvūs kuponai...');
      const coupons = await sdk.getCoupons({ status: 'active' });
      console.log(`🎪 Rasta ${coupons.data.length} kuponų:`, coupons.data);

      // 8. Get shops
      console.log('\n🏪 Gaunamos parduotuvės...');
      const shops = await sdk.getShops({ is_active: true });
      console.log(`🛍️ Rasta ${shops.data.length} parduotuvių:`, shops.data);

      // 9. Shop location search (example coordinates for Kaunas)
      console.log('\n📍 Ieškoma parduotuvių Kaune...');
      const nearbyShops = await sdk.getShopsByLocation(54.8985, 23.9036, 5); // 5km radius
      console.log(`📌 Rasta ${nearbyShops.length} parduotuvių netoli:`, nearbyShops);

              // 10. WebSocket subscription example (if available)
      if (sdk.isAuthenticated()) {
        console.log('\n🔄 Prisijungiama prie WebSocket...');
        
        // Subscribe to user events
        const userSubscription = sdk.subscribeToUserEvents(user.id, (message) => {
          console.log('📢 Vartotojo įvykis:', message);
        });

        // Subscribe to notifications
        const notificationSubscription = sdk.subscribeToNotifications((message) => {
          console.log('🔔 Pranešimas:', message);
        });

        console.log('✅ WebSocket prenumeratos aktyvios');
        
        // Cleanup after 10 seconds (for demo)
        setTimeout(() => {
          console.log('\n🧹 Valomas WebSocket...');
          if (userSubscription) userSubscription.unsubscribe();
          if (notificationSubscription) notificationSubscription.unsubscribe();
          console.log('✅ WebSocket prenumeratos atšauktos');
        }, 10000);
      }

    } catch (authError) {
      console.error('❌ Prisijungimo klaida:', authError.message);
      console.log('💡 Patikrinkite ar OTP kodas teisingas arba naudokite tikrą telefono numerį');
    }

  } catch (error) {
    console.error('❌ Klaida:', error.message);
    if (error.code) {
      console.error('🔍 Klaidos kodas:', error.code);
    }
    if (error.statusCode) {
      console.error('🌐 HTTP statusas:', error.statusCode);
    }
  }
}

// QR Login example
async function qrLoginExample() {
  console.log('\n📱 QR prisijungimo pavyzdys');
  
  try {
    // Generate QR login session
    const qrSession = await sdk.generateQrLogin('Desktop Browser');
    console.log('🔗 QR kodas sugeneruotas:', qrSession.qr_code);
    console.log('⏰ Galioja iki:', qrSession.expires_at);

    // Subscribe to QR login events
    const subscription = sdk.subscribeToQrLogin(qrSession.session_id, (message) => {
      console.log('📱 QR įvykis:', message.data);
      
      switch (message.data.status) {
        case 'scanned':
          console.log('📷 QR kodas nuskenuotas!');
          break;
        case 'confirmed':
          console.log('✅ Prisijungimas patvirtintas!');
          console.log('👤 Vartotojas:', message.data.user);
          break;
        case 'expired':
          console.log('⌛ QR kodas baigė galioti');
          break;
        case 'cancelled':
          console.log('❌ Prisijungimas atšauktas');
          break;
      }
    });

    console.log('🔄 Laukiama QR kodo nuskenavimo...');
    
    // Cleanup after 60 seconds
    setTimeout(() => {
      subscription?.unsubscribe();
      console.log('🧹 QR prenumerata atšaukta');
    }, 60000);

  } catch (error) {
    console.error('❌ QR prisijungimo klaida:', error.message);
  }
}

// Run examples
main().then(() => {
  console.log('\n🎯 Pagrindinis pavyzdys baigtas');
  
  // Uncomment to test QR login
  // return qrLoginExample();
}).catch((error) => {
  console.error('💥 Nenumatyta klaida:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Programa sustabdyta');
  process.exit(0);
}); 
 
 