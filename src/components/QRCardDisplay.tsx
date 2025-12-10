'use client';

import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export interface QRCardDisplayConfig {
  apiUrl?: string;
  locale?: string;
}

export interface QRCardDisplayProps {
  config?: QRCardDisplayConfig;
  userToken: string;
  cardId?: number;
  size?: number;
  showUserInfo?: boolean;
  showPoints?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
  texts?: QRCardDisplayTexts;
  onError?: (error: Error) => void;
}

export interface QRCardDisplayTexts {
  loading?: string;
  error?: string;
  retry?: string;
  points?: string;
  scanToIdentify?: string;
  validUntil?: string;
}

interface CardData {
  id: number;
  card_number: string;
  qr_code: string;
  points_balance: number;
  user?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  partner?: {
    name?: string;
    logo_url?: string;
  };
}

const DEFAULT_TEXTS: QRCardDisplayTexts = {
  loading: 'Loading card...',
  error: 'Failed to load card',
  retry: 'Retry',
  points: 'Points',
  scanToIdentify: 'Scan to identify',
  validUntil: 'Valid until',
};

export function QRCardDisplay({
  config,
  userToken,
  cardId,
  size = 200,
  showUserInfo = true,
  showPoints = true,
  autoRefresh = false,
  refreshInterval = 30000,
  className = '',
  texts: customTexts,
  onError,
}: QRCardDisplayProps) {
  const texts = { ...DEFAULT_TEXTS, ...customTexts };
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = config?.apiUrl || 'https://api.loyalty.lt';
  const locale = config?.locale || 'lt';

  const fetchCardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = cardId
        ? `${apiUrl}/${locale}/loyalty-cards/${cardId}`
        : `${apiUrl}/${locale}/loyalty-cards/me`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch card data');
      }

      setCardData(result.data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error.message);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, locale, userToken, cardId, onError]);

  useEffect(() => {
    fetchCardData();
  }, [fetchCardData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchCardData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchCardData]);

  if (loading) {
    return (
      <div className={`loyalty-card-display ${className}`}>
        <div className="loyalty-card-display__loading">
          <div className="loyalty-card-display__spinner" />
          <p>{texts.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`loyalty-card-display ${className}`}>
        <div className="loyalty-card-display__error">
          <p>{texts.error}</p>
          <button onClick={fetchCardData} className="loyalty-card-display__button">
            {texts.retry}
          </button>
        </div>
      </div>
    );
  }

  if (!cardData) {
    return null;
  }

  return (
    <div className={`loyalty-card-display ${className}`}>
      {showUserInfo && cardData.user && (
        <div className="loyalty-card-display__user">
          <p className="loyalty-card-display__user-name">{cardData.user.name || cardData.user.phone}</p>
          {cardData.partner && (
            <p className="loyalty-card-display__partner">{cardData.partner.name}</p>
          )}
        </div>
      )}

      <div className="loyalty-card-display__qr">
        <QRCodeSVG
          value={cardData.qr_code || `loyalty:card:${cardData.card_number}`}
          size={size}
          level="H"
          includeMargin
        />
      </div>

      <p className="loyalty-card-display__card-number">{cardData.card_number}</p>
      <p className="loyalty-card-display__instruction">{texts.scanToIdentify}</p>

      {showPoints && (
        <div className="loyalty-card-display__points">
          <span className="loyalty-card-display__points-value">{cardData.points_balance.toLocaleString()}</span>
          <span className="loyalty-card-display__points-label">{texts.points}</span>
        </div>
      )}
    </div>
  );
}

export default QRCardDisplay;
