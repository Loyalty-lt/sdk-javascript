'use client';

import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Pusher from 'pusher-js';

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export interface QRLoginConfig {
  apiKey: string;
  apiSecret: string;
  apiUrl?: string;
  locale?: string;
  shopId?: number;
  deviceName?: string;
}

export interface QRLoginCallbacks {
  onScanned?: () => void;
  onAuthenticated?: (data: AuthenticatedData) => void;
  onCancelled?: () => void;
  onError?: (error: Error) => void;
  onExpired?: () => void;
}

export interface AuthenticatedData {
  token: string;
  refresh_token?: string;
  user: {
    id: number;
    name?: string;
    email?: string;
    phone?: string;
    [key: string]: any;
  };
}

export interface QRLoginTexts {
  title?: string;
  subtitle?: string;
  scanInstruction?: string;
  loading?: string;
  error?: string;
  expired?: string;
  scanned?: string;
  authenticated?: string;
  regenerate?: string;
  noApp?: string;
  getLink?: string;
  phoneLabel?: string;
  phonePlaceholder?: string;
  cancel?: string;
  send?: string;
  sending?: string;
  linkSent?: string;
  validFor?: string;
}

export interface QRLoginProps {
  config: QRLoginConfig;
  callbacks?: QRLoginCallbacks;
  texts?: QRLoginTexts;
  className?: string;
  showSendLink?: boolean;
  autoRegenerate?: boolean;
}

type LoginStatus = 'idle' | 'generating' | 'pending' | 'scanned' | 'authenticated' | 'expired' | 'error';

const DEFAULT_TEXTS: QRLoginTexts = {
  title: 'Login with Loyalty.lt',
  subtitle: 'Scan QR code with your phone camera or Loyalty.lt app',
  scanInstruction: 'Scan with Loyalty.lt app',
  loading: 'Loading...',
  error: 'Error generating QR code',
  expired: 'QR code expired',
  scanned: 'Confirm login on your phone',
  authenticated: 'Connecting...',
  regenerate: 'Generate new code',
  noApp: "Don't have Loyalty.lt yet?",
  getLink: 'Get download link',
  phoneLabel: 'Phone number',
  phonePlaceholder: '+370 6XX XXXXX',
  cancel: 'Cancel',
  send: 'Send',
  sending: 'Sending...',
  linkSent: 'Link sent to your phone!',
  validFor: 'Valid for',
};

export function QRLogin({
  config,
  callbacks,
  texts: customTexts,
  className = '',
  showSendLink = true,
  autoRegenerate = true,
}: QRLoginProps) {
  const texts = { ...DEFAULT_TEXTS, ...customTexts };
  const [status, setStatus] = useState<LoginStatus>('generating');
  const [qrData, setQrData] = useState<{ session_id: string; qr_code: string; expires_at: string } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [realtimeClient, setRealtimeClient] = useState<Pusher | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [isMobile] = useState(isMobileDevice());

  const apiUrl = config.apiUrl || 'https://api.loyalty.lt';
  const locale = config.locale || 'lt';

  const generateQR = useCallback(async () => {
    try {
      setStatus('generating');

      const response = await fetch(`${apiUrl}/${locale}/shop/auth/qr-login/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
          'X-API-Secret': config.apiSecret,
        },
        body: JSON.stringify({
          device_name: config.deviceName || 'Web Login',
          ...(config.shopId && { shop_id: config.shopId }),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to generate QR code');
      }

      setQrData(result.data);
      setStatus('pending');

      const expiresAt = new Date(result.data.expires_at).getTime();
      setTimeRemaining(Math.max(0, expiresAt - Date.now()));

      // Reverb connection details. The QR channel is public — the unguessable
      // session id is the secret — so there is no token to mint.
      const configResponse = await fetch(`${apiUrl}/${locale}/shop/realtime/config`, {
        headers: {
          'Accept': 'application/json',
          'X-API-Key': config.apiKey,
          'X-API-Secret': config.apiSecret,
        },
      });

      const configResult = await configResponse.json();

      if (!configResponse.ok || !configResult.success) {
        throw new Error('Failed to get realtime configuration');
      }

      const rt = configResult.data;
      const pusher = new Pusher(rt.key, {
        wsHost: rt.host,
        wsPort: rt.port,
        wssPort: rt.port,
        forceTLS: rt.scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        cluster: '',
        disableStats: true,
      } as any);
      setRealtimeClient(pusher);

      const channel = pusher.subscribe(`qr-login.${result.data.session_id}`);

      channel.bind('status_update', (data: any) => {
        if (data.status === 'scanned') {
          setStatus('scanned');
          callbacks?.onScanned?.();
        } else if (data.status === 'authenticated') {
          setStatus('authenticated');
          callbacks?.onAuthenticated?.(data);
          pusher.disconnect();
        } else if (data.status === 'cancelled' || data.status === 'failed') {
          callbacks?.onCancelled?.();
          pusher.disconnect();
          if (autoRegenerate) {
            setStatus('generating');
            setQrData(null);
            generateQR();
          } else {
            setStatus('error');
          }
        }
      });
    } catch (error) {
      console.error('QR generation error:', error);
      setStatus('error');
      callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  }, [apiUrl, locale, config, callbacks, autoRegenerate]);

  useEffect(() => {
    if (status !== 'pending' && status !== 'scanned') return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          callbacks?.onExpired?.();
          realtimeClient?.disconnect();
          if (autoRegenerate) {
            setStatus('generating');
            setQrData(null);
            generateQR();
          } else {
            setStatus('expired');
          }
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, realtimeClient, generateQR, autoRegenerate, callbacks]);

  useEffect(() => {
    generateQR();
  }, []);

  useEffect(() => {
    return () => {
      realtimeClient?.disconnect();
    };
  }, [realtimeClient]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleRegenerate = () => {
    realtimeClient?.disconnect();
    setStatus('generating');
    setQrData(null);
    generateQR();
  };

  const handleSendLink = async () => {
    if (!phone || phone.length < 9) return;

    setSendingLink(true);

    try {
      const response = await fetch(`${apiUrl}/${locale}/shop/auth/send-app-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
          'X-API-Secret': config.apiSecret,
        },
        body: JSON.stringify({
          phone: phone.startsWith('+') ? phone : `+370${phone}`,
          language: locale,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setLinkSent(true);
        setTimeout(() => {
          setShowPhoneModal(false);
          setPhone('');
          setLinkSent(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Send link error:', error);
    } finally {
      setSendingLink(false);
    }
  };

  if (status === 'generating') {
    return (
      <div className={`loyalty-qr-login ${className}`}>
        <div className="loyalty-qr-login__header">
          <h3 className="loyalty-qr-login__title">{texts.title}</h3>
          <p className="loyalty-qr-login__subtitle">{texts.subtitle}</p>
        </div>
        <div className="loyalty-qr-login__placeholder" />
        <p className="loyalty-qr-login__loading">{texts.loading}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`loyalty-qr-login ${className}`}>
        <p className="loyalty-qr-login__error">{texts.error}</p>
        <button onClick={handleRegenerate} className="loyalty-qr-login__button">
          {texts.regenerate}
        </button>
      </div>
    );
  }

  if (status === 'expired' && !autoRegenerate) {
    return (
      <div className={`loyalty-qr-login ${className}`}>
        <p className="loyalty-qr-login__expired">{texts.expired}</p>
        <button onClick={handleRegenerate} className="loyalty-qr-login__button">
          {texts.regenerate}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={`loyalty-qr-login ${className}`}>
        <div className="loyalty-qr-login__header">
          <h3 className="loyalty-qr-login__title">{texts.title}</h3>
          <p className="loyalty-qr-login__subtitle">{texts.subtitle}</p>
        </div>

        <div className="loyalty-qr-login__qr-wrapper">
          {qrData && (
            <>
              {isMobile ? (
                <div className="loyalty-qr-login__mobile">
                  <a href={qrData.qr_code} className="loyalty-qr-login__button loyalty-qr-login__button--primary">
                    {texts.title}
                  </a>
                </div>
              ) : (
                <div className={`loyalty-qr-login__qr-container ${status === 'scanned' ? 'loyalty-qr-login__qr-container--blurred' : ''}`}>
                  <QRCodeSVG value={qrData.qr_code} size={240} level="H" includeMargin />
                  {status === 'scanned' && (
                    <div className="loyalty-qr-login__scanned-overlay">
                      <svg className="loyalty-qr-login__phone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <p>{texts.scanned}</p>
                    </div>
                  )}
                  {status === 'authenticated' && (
                    <div className="loyalty-qr-login__authenticated-overlay">
                      <svg className="loyalty-qr-login__check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p>{texts.authenticated}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {(status === 'pending' || status === 'scanned') && (
          <div className="loyalty-qr-login__timer">
            <p className="loyalty-qr-login__timer-text">
              {texts.validFor}: {formatTime(timeRemaining)}
            </p>
            <div className="loyalty-qr-login__timer-bar">
              <div
                className="loyalty-qr-login__timer-progress"
                style={{ width: `${(timeRemaining / (5 * 60 * 1000)) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="loyalty-qr-login__actions">
          <button onClick={handleRegenerate} className="loyalty-qr-login__link">
            {texts.regenerate}
          </button>
          {showSendLink && (
            <p className="loyalty-qr-login__no-app">
              {texts.noApp}{' '}
              <button onClick={() => setShowPhoneModal(true)} className="loyalty-qr-login__link loyalty-qr-login__link--bold">
                {texts.getLink}
              </button>
            </p>
          )}
        </div>
      </div>

      {showPhoneModal && (
        <div className="loyalty-qr-login__modal-backdrop" onClick={() => setShowPhoneModal(false)}>
          <div className="loyalty-qr-login__modal" onClick={(e) => e.stopPropagation()}>
            {linkSent ? (
              <div className="loyalty-qr-login__modal-success">
                <svg className="loyalty-qr-login__check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p>{texts.linkSent}</p>
              </div>
            ) : (
              <>
                <h4 className="loyalty-qr-login__modal-title">{texts.getLink}</h4>
                <div className="loyalty-qr-login__modal-input-group">
                  <label className="loyalty-qr-login__modal-label">{texts.phoneLabel}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={texts.phonePlaceholder}
                    className="loyalty-qr-login__modal-input"
                  />
                </div>
                <div className="loyalty-qr-login__modal-actions">
                  <button onClick={() => setShowPhoneModal(false)} className="loyalty-qr-login__button loyalty-qr-login__button--secondary">
                    {texts.cancel}
                  </button>
                  <button onClick={handleSendLink} disabled={sendingLink} className="loyalty-qr-login__button loyalty-qr-login__button--primary">
                    {sendingLink ? texts.sending : texts.send}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default QRLogin;
