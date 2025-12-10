'use client';

/**
 * Example: QR Login Component for Next.js / React
 * 
 * This example shows how to integrate the QRLogin component
 * into your Next.js or React application for user authentication.
 * 
 * Installation:
 * npm install @loyaltylt/sdk qrcode.react ably
 */

import { QRLogin } from '@loyaltylt/sdk/react';
import '@loyaltylt/sdk/styles';
import { signIn } from 'next-auth/react'; // Optional: if using NextAuth
import { useRouter } from 'next/navigation';
import { toast } from 'sonner'; // Optional: for notifications

export function QRLoginExample() {
  const router = useRouter();

  return (
    <div className="max-w-md mx-auto p-6">
      <QRLogin
        config={{
          apiKey: process.env.NEXT_PUBLIC_LOYALTY_API_KEY!,
          apiSecret: process.env.NEXT_PUBLIC_LOYALTY_API_SECRET!,
          shopId: 4, // Your shop ID
          deviceName: 'My Website',
          locale: 'lt',
        }}
        callbacks={{
          onScanned: () => {
            toast.info('QR code scanned! Please confirm on your phone.');
          },
          onAuthenticated: async (data) => {
            toast.success('Successfully authenticated!');
            
            // Option 1: Use the token directly
            localStorage.setItem('loyalty_token', data.token);
            
            // Option 2: If using NextAuth, sign in with credentials
            const result = await signIn('credentials', {
              email: data.user.email || data.user.phone,
              password: data.token,
              redirect: false,
            });

            if (result?.ok) {
              router.push('/dashboard');
              router.refresh();
            }
          },
          onCancelled: () => {
            toast.error('Login cancelled');
          },
          onExpired: () => {
            // Auto-regenerate is enabled by default
          },
          onError: (error) => {
            toast.error(`Error: ${error.message}`);
          },
        }}
        texts={{
          title: 'Login with Loyalty.lt',
          subtitle: 'Scan QR code with your phone camera or Loyalty.lt app',
          scanInstruction: 'Point your camera at the QR code',
          loading: 'Generating QR code...',
          scanned: 'Confirm login on your phone',
          authenticated: 'Redirecting...',
          regenerate: 'Generate new code',
          noApp: "Don't have Loyalty.lt?",
          getLink: 'Get the app',
          validFor: 'Valid for',
        }}
        showSendLink={true}
        autoRegenerate={true}
        className="my-custom-class"
      />
    </div>
  );
}

/**
 * Minimal example without NextAuth
 */
export function QRLoginMinimal() {
  return (
    <QRLogin
      config={{
        apiKey: 'lty_your_api_key',
        apiSecret: 'your_api_secret',
      }}
      callbacks={{
        onAuthenticated: (data) => {
          console.log('User:', data.user);
          console.log('Token:', data.token);
          // Handle login in your app
        },
      }}
    />
  );
}

/**
 * Example with custom styling (Tailwind CSS)
 */
export function QRLoginStyled() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
      <QRLogin
        config={{
          apiKey: process.env.NEXT_PUBLIC_LOYALTY_API_KEY!,
          apiSecret: process.env.NEXT_PUBLIC_LOYALTY_API_SECRET!,
        }}
        callbacks={{
          onAuthenticated: (data) => {
            window.location.href = '/account';
          },
        }}
        texts={{
          title: 'Quick Login',
          subtitle: 'No password needed - just scan!',
        }}
      />
    </div>
  );
}

export default QRLoginExample;
