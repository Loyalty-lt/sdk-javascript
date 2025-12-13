'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { StampCard, StampCardGame } from './StampCard';

export interface GameDetailConfig {
  apiKey: string;
  apiSecret: string;
  apiUrl?: string;
  locale?: string;
}

export interface Game {
  id: number;
  name: string | Record<string, string>;
  description?: string | Record<string, string>;
  game_type: 'stamps' | 'wheel' | 'quiz' | 'collection' | 'memory' | 'scratch';
  image_path?: string;
  is_active: boolean;
  status?: 'available' | 'active' | 'completed';
  stamps_required?: number;
  stamp_settings?: any;
  user_progress?: {
    current_step: number;
    completed: boolean;
    completed_at?: string;
  };
  partner_name?: string;
}

export interface GameDetailSheetProps {
  config: GameDetailConfig;
  game: Game;
  cardId: number;
  shopId: number;
  isOpen: boolean;
  onClose: () => void;
  onGameCompleted?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  texts?: GameDetailSheetTexts;
}

export interface GameDetailSheetTexts {
  close?: string;
  unsupportedGame?: string;
  gameTypeLabel?: string;
  contactSupport?: string;
}

const DEFAULT_TEXTS: GameDetailSheetTexts = {
  close: 'Close',
  unsupportedGame: 'This game type is not yet supported',
  gameTypeLabel: 'Game type',
  contactSupport: 'Please contact support for assistance',
};

const GAME_TYPE_ICONS: Record<string, string> = {
  stamps: '🎫',
  wheel: '🎡',
  quiz: '❓',
  collection: '🃏',
  memory: '🧠',
  scratch: '🎟️',
};

export function GameDetailSheet({
  config,
  game,
  cardId,
  shopId,
  isOpen,
  onClose,
  onGameCompleted,
  onError,
  className = '',
  texts: customTexts,
}: GameDetailSheetProps) {
  const texts = { ...DEFAULT_TEXTS, ...customTexts };
  const [gameData, setGameData] = useState<Game>(game);
  const sheetRef = useRef<HTMLDivElement>(null);

  const apiUrl = config.apiUrl || 'https://api.loyalty.lt';
  const locale = config.locale || 'en';

  const getLocalizedText = useCallback((text: string | Record<string, string> | undefined): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    return text[locale] || text['en'] || text['lt'] || Object.values(text)[0] || '';
  }, [locale]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Update game data when prop changes
  useEffect(() => {
    setGameData(game);
  }, [game]);

  // API call handlers
  const handleAddStamps = useCallback(async (gameId: number, cardId: number, shopId: number, stampsCount: number) => {
    const response = await fetch(`${apiUrl}/${locale}/shop/games/${gameId}/add-stamps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
        'X-API-Secret': config.apiSecret,
      },
      body: JSON.stringify({
        card_id: cardId,
        shop_id: shopId,
        stamps_count: stampsCount,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to add stamps');
    }

    return result.data;
  }, [apiUrl, locale, config.apiKey, config.apiSecret]);

  const handleRestartGame = useCallback(async (gameId: number, cardId: number, shopId: number) => {
    const response = await fetch(`${apiUrl}/${locale}/shop/games/${gameId}/restart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
        'X-API-Secret': config.apiSecret,
      },
      body: JSON.stringify({
        card_id: cardId,
        shop_id: shopId,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to restart game');
    }

    return result.data;
  }, [apiUrl, locale, config.apiKey, config.apiSecret]);

  const handleGameCompleted = useCallback(() => {
    onGameCompleted?.();
  }, [onGameCompleted]);

  const renderGameContent = () => {
    switch (gameData.game_type) {
      case 'stamps':
        return (
          <StampCard
            game={gameData as StampCardGame}
            cardId={cardId}
            shopId={shopId}
            locale={locale}
            onAddStamps={handleAddStamps}
            onRestart={handleRestartGame}
            onGameCompleted={handleGameCompleted}
            onError={onError}
          />
        );

      case 'wheel':
      case 'quiz':
      case 'collection':
      case 'memory':
      case 'scratch':
      default:
        return (
          <div className="loyalty-game-detail__unsupported">
            <div className="loyalty-game-detail__unsupported-icon">⚠️</div>
            <p className="loyalty-game-detail__unsupported-text">{texts.unsupportedGame}</p>
            <p className="loyalty-game-detail__unsupported-type">
              {texts.gameTypeLabel}: {gameData.game_type}
            </p>
            <p className="loyalty-game-detail__unsupported-help">{texts.contactSupport}</p>
          </div>
        );
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`loyalty-game-detail-backdrop ${className}`}>
      <div className="loyalty-game-detail-sheet" ref={sheetRef}>
        {/* Handle bar for mobile */}
        <div className="loyalty-game-detail__handle" />

        {/* Header */}
        <div className="loyalty-game-detail__header">
          <div className="loyalty-game-detail__header-icon">
            {gameData.image_path ? (
              <img src={gameData.image_path} alt="" />
            ) : (
              <span>{GAME_TYPE_ICONS[gameData.game_type] || '🎮'}</span>
            )}
          </div>
          <h3 className="loyalty-game-detail__title">{getLocalizedText(gameData.name)}</h3>
          <button 
            className="loyalty-game-detail__close-btn"
            onClick={onClose}
            aria-label={texts.close}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Description */}
        {gameData.description && (
          <p className="loyalty-game-detail__description">
            {getLocalizedText(gameData.description)}
          </p>
        )}

        {/* Game content */}
        <div className="loyalty-game-detail__content">
          {renderGameContent()}
        </div>
      </div>
    </div>
  );
}

export default GameDetailSheet;

