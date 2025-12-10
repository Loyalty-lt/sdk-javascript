'use client';

/**
 * Example: QR Card Display Component for Next.js / React
 * 
 * This example shows how to display a user's loyalty card QR code
 * that can be scanned at POS terminals for identification.
 * 
 * Installation:
 * npm install @loyaltylt/sdk qrcode.react
 */

import { QRCardDisplay } from '@loyaltylt/sdk/react';
import '@loyaltylt/sdk/styles';

interface UserCardProps {
  userToken: string; // JWT token from Loyalty.lt authentication
}

/**
 * Full featured example
 */
export function UserLoyaltyCard({ userToken }: UserCardProps) {
  return (
    <div className="max-w-sm mx-auto">
      <QRCardDisplay
        userToken={userToken}
        size={200}
        showUserInfo={true}
        showPoints={true}
        autoRefresh={true}
        refreshInterval={30000} // Refresh every 30 seconds
        texts={{
          loading: 'Loading your card...',
          error: 'Failed to load card',
          retry: 'Try again',
          points: 'Points',
          scanToIdentify: 'Show this at checkout',
        }}
        onError={(error) => {
          console.error('Card load error:', error);
        }}
        className="my-card"
      />
    </div>
  );
}

/**
 * Minimal example
 */
export function SimpleCard({ userToken }: UserCardProps) {
  return (
    <QRCardDisplay
      userToken={userToken}
      size={180}
    />
  );
}

/**
 * Card without points display
 */
export function CardWithoutPoints({ userToken }: UserCardProps) {
  return (
    <QRCardDisplay
      userToken={userToken}
      size={200}
      showPoints={false}
      showUserInfo={true}
    />
  );
}

/**
 * Full page card display (e.g., for mobile wallet view)
 */
export function FullPageCard({ userToken }: UserCardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <QRCardDisplay
          userToken={userToken}
          size={280}
          showUserInfo={true}
          showPoints={true}
          autoRefresh={true}
          texts={{
            points: 'Your Points',
            scanToIdentify: 'Present this QR code at checkout',
          }}
        />
        
        <div className="mt-6 text-center text-white">
          <p className="text-sm opacity-80">
            Scan at any partner location to earn & redeem points
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Card in a modal/dialog
 */
export function CardModal({ 
  userToken, 
  isOpen, 
  onClose 
}: UserCardProps & { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">My Loyalty Card</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <QRCardDisplay
          userToken={userToken}
          size={200}
          showPoints={true}
        />
      </div>
    </div>
  );
}

/**
 * Usage in a page component
 */
export default function MyAccountPage() {
  // Get token from your auth context/state
  const userToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">My Loyalty Card</h1>
      <UserLoyaltyCard userToken={userToken} />
    </div>
  );
}
