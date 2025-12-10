'use client';

/**
 * Example: Complete Loyalty.lt Integration
 * 
 * This example demonstrates a complete integration with:
 * - QR Login for authentication
 * - QR Card Display for showing user's loyalty card
 * - Points display and redemption UI
 * 
 * Installation:
 * npm install @loyaltylt/sdk qrcode.react ably
 */

import { useState, useEffect } from 'react';
import { QRLogin, QRCardDisplay, type AuthenticatedData } from '@loyaltylt/sdk/react';
import '@loyaltylt/sdk/styles';

// Environment variables (add to .env.local)
const API_KEY = process.env.NEXT_PUBLIC_LOYALTY_API_KEY!;
const API_SECRET = process.env.NEXT_PUBLIC_LOYALTY_API_SECRET!;

interface User {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
}

export default function LoyaltyIntegration() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showCard, setShowCard] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('loyalty_token');
    const savedUser = localStorage.getItem('loyalty_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (data: AuthenticatedData) => {
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('loyalty_token', data.token);
    localStorage.setItem('loyalty_user', JSON.stringify(data.user));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('loyalty_token');
    localStorage.removeItem('loyalty_user');
    setShowCard(false);
  };

  // Not logged in - show login
  if (!user || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Welcome</h1>
            <p className="text-gray-600 mt-2">
              Login to access your loyalty rewards
            </p>
          </div>

          <QRLogin
            config={{
              apiKey: API_KEY,
              apiSecret: API_SECRET,
              deviceName: 'Web App',
            }}
            callbacks={{
              onAuthenticated: handleLogin,
              onError: (error) => console.error('Login error:', error),
            }}
            texts={{
              title: 'Scan to Login',
              subtitle: 'Use Loyalty.lt app or your camera',
            }}
          />

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              By logging in, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Logged in - show dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">My Loyalty</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              {user.name || user.email || user.phone}
            </span>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">My Card</h2>
              <button
                onClick={() => setShowCard(!showCard)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                {showCard ? 'Hide QR' : 'Show QR'}
              </button>
            </div>

            {showCard ? (
              <QRCardDisplay
                userToken={token}
                size={200}
                showUserInfo={false}
                showPoints={true}
                autoRefresh={true}
                texts={{
                  scanToIdentify: 'Show at checkout',
                }}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">💳</div>
                <p>Click "Show QR" to display your card</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            
            <div className="space-y-3">
              <button className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                View Rewards
              </button>
              <button className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                Transaction History
              </button>
              <button className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                Find Stores
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-gray-500">
            <p>No recent transactions</p>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Alternative: Using with React Context for global state
 */
import { createContext, useContext, ReactNode } from 'react';

interface LoyaltyContextType {
  user: User | null;
  token: string | null;
  login: (data: AuthenticatedData) => void;
  logout: () => void;
}

const LoyaltyContext = createContext<LoyaltyContextType | null>(null);

export function LoyaltyProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = (data: AuthenticatedData) => {
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('loyalty_token', data.token);
    localStorage.setItem('loyalty_user', JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('loyalty_token');
    localStorage.removeItem('loyalty_user');
  };

  return (
    <LoyaltyContext.Provider value={{ user, token, login, logout }}>
      {children}
    </LoyaltyContext.Provider>
  );
}

export function useLoyalty() {
  const context = useContext(LoyaltyContext);
  if (!context) {
    throw new Error('useLoyalty must be used within LoyaltyProvider');
  }
  return context;
}
