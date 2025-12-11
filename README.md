# Loyalty.lt JavaScript SDK

Official JavaScript SDK for Loyalty.lt Partner API - integrate loyalty program functionality into POS systems and partner applications.

## Installation

```bash
npm install @loyaltylt/sdk ably
# or
yarn add @loyaltylt/sdk ably
```

For React components:
```bash
npm install @loyaltylt/sdk ably qrcode.react
```

## Quick Start

```javascript
import { LoyaltySDK } from '@loyaltylt/sdk';

const sdk = new LoyaltySDK({
  apiKey: 'lty_xxxxxxxxxxxx',
  apiSecret: 'xxxxxxxxxxxx',
  environment: 'production',
  locale: 'lt'
});

const session = await sdk.generateQrCardSession('POS Terminal 1');
console.log('QR:', session.qr_code);

const subscription = await sdk.subscribeToQrCardScan(session.session_id, (cardData) => {
  console.log('Customer:', cardData.user.name);
  console.log('Points:', cardData.points);
});
```

## React Components

### QRLogin Component

```tsx
import { QRLogin } from '@loyaltylt/sdk/react';
import '@loyaltylt/sdk/styles';

function LoginPage() {
  return (
    <QRLogin
      config={{
        apiKey: process.env.NEXT_PUBLIC_SHOP_API_KEY,
        apiSecret: process.env.NEXT_PUBLIC_SHOP_API_SECRET,
        shopId: 4,
        deviceName: 'My Shop'
      }}
      callbacks={{
        onAuthenticated: (data) => {
          console.log('User:', data.user);
          console.log('Token:', data.token);
        },
        onScanned: () => console.log('QR scanned!'),
        onError: (error) => console.error(error)
      }}
      texts={{
        title: 'Login with Loyalty.lt',
        subtitle: 'Scan QR code to login'
      }}
      showSendLink={true}
      autoRegenerate={true}
    />
  );
}
```

### QRCardDisplay Component

```tsx
import { QRCardDisplay } from '@loyaltylt/sdk/react';
import '@loyaltylt/sdk/styles';

function MyCard() {
  return (
    <QRCardDisplay
      userToken={userJwtToken}
      size={200}
      showUserInfo={true}
      showPoints={true}
      autoRefresh={true}
      refreshInterval={30000}
      texts={{
        points: 'Points',
        scanToIdentify: 'Scan to identify'
      }}
    />
  );
}
```

## Configuration

```javascript
const sdk = new LoyaltySDK({
  apiKey: 'lty_xxxxxxxxxxxx',
  apiSecret: 'xxxxxxxxxxxx',
  environment: 'production', // 'production' | 'staging'
  locale: 'lt',
  timeout: 30000
});
```

## QR Card Scan (POS Integration)

```javascript
const session = await sdk.generateQrCardSession('POS Terminal');

const subscription = await sdk.subscribeToQrCardScan(session.session_id, (cardData) => {
  console.log('Card:', cardData.card_number);
  console.log('Points:', cardData.points);
  
  if (cardData.redemption?.enabled) {
    const discount = Math.floor(cardData.points / cardData.redemption.points_per_currency) 
                     * cardData.redemption.currency_amount;
    console.log('Discount:', discount, 'EUR');
  }
});

subscription.unsubscribe();
```

## QR Login

```javascript
const session = await sdk.generateQrLogin('Desktop');

const subscription = await sdk.subscribeToQrLogin(session.session_id, (message) => {
  if (message.data.status === 'authenticated') {
    console.log('Logged in:', message.data.user);
    console.log('Token:', message.data.token);
  }
});
```

## Send App Download Link

```javascript
await sdk.sendAppLink('+37061234567', 4, 'Customer Name', 'lt');
```

## Transactions

```javascript
const transaction = await sdk.createTransaction({
  card_number: '123-456-789',
  amount: 50.00,
  points_earned: 50
});

```

## Loyalty Cards

```javascript
const cards = await sdk.getLoyaltyCards({ page: 1, per_page: 10 });

const card = await sdk.getLoyaltyCardInfo({ card_number: '123-456-789' });

const balance = await sdk.getPointsBalance({ card_number: '123-456-789' });
```

## Offers

```javascript
const offers = await sdk.getOffers({ is_active: true });

const offer = await sdk.createOffer({
  title: 'New Offer',
  description: 'Description',
  points_required: 100
});

await sdk.updateOffer(offer.id, { title: 'Updated' });

await sdk.deleteOffer(offer.id);
```

## Shops

```javascript
const shops = await sdk.getShops({ is_active: true, is_virtual: false });
```

## Ably Channels

| Feature | Channel | Event |
|---------|---------|-------|
| QR Login | `qr-login:{session_id}` | `status_update` |
| QR Card Scan | `qr-card:{session_id}` | `card_identified` |

## Error Handling

```javascript
import { LoyaltySDKError } from '@loyaltylt/sdk';

try {
  await sdk.createTransaction({ ... });
} catch (error) {
  if (error instanceof LoyaltySDKError) {
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Status:', error.statusCode);
  }
}
```

## Environments

- **Production**: `https://api.loyalty.lt`
- **Staging**: `https://staging-api.loyalty.lt`

## Examples

See `/examples` folder for:
- `pos-full-example.html` - Full POS system with customer display
- `qr-card-scan-example.html` - Simple QR card scanning
- `basic-usage.js` - Node.js usage examples

## Documentation

https://docs.loyalty.lt
