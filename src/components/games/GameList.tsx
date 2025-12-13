'use client';

import { useState, useEffect, useCallback } from 'react';

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
  partner_info?: {
    id: number;
    name: string;
    logo?: string;
  };
}

export interface GameListConfig {
  apiKey: string;
  apiSecret: string;
  apiUrl?: string;
  locale?: string;
  shopId?: number;
  cardId?: number;
}

export interface GameListProps {
  config: GameListConfig;
  games?: Game[];
  onGameSelect?: (game: Game) => void;
  onLoadGames?: (games: Game[]) => void;
  onError?: (error: Error) => void;
  className?: string;
  showStatus?: boolean;
  showProgress?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  errorMessage?: string;
  locale?: string;
}

const GAME_TYPE_ICONS: Record<string, string> = {
  stamps: '🎫',
  wheel: '🎡',
  quiz: '❓',
  collection: '🃏',
  memory: '🧠',
  scratch: '🎟️',
};

const GAME_TYPE_LABELS: Record<string, Record<string, string>> = {
  stamps: { en: 'Stamp Card', lt: 'Antspaudų kortelė' },
  wheel: { en: 'Wheel of Fortune', lt: 'Laimės ratas' },
  quiz: { en: 'Quiz', lt: 'Viktorina' },
  collection: { en: 'Collection', lt: 'Kolekcija' },
  memory: { en: 'Memory Game', lt: 'Atminties žaidimas' },
  scratch: { en: 'Scratch Card', lt: 'Nutrink ir laimėk' },
};

export function GameList({
  config,
  games: propGames,
  onGameSelect,
  onLoadGames,
  onError,
  className = '',
  showStatus = true,
  showProgress = true,
  emptyMessage = 'No games available',
  loadingMessage = 'Loading games...',
  errorMessage = 'Failed to load games',
  locale = 'en',
}: GameListProps) {
  const [games, setGames] = useState<Game[]>(propGames || []);
  const [loading, setLoading] = useState(!propGames);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = config.apiUrl || 'https://api.loyalty.lt';
  const apiLocale = config.locale || locale;

  const getLocalizedText = useCallback((text: string | Record<string, string> | undefined): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    return text[apiLocale] || text['en'] || text['lt'] || Object.values(text)[0] || '';
  }, [apiLocale]);

  const fetchGames = useCallback(async () => {
    if (propGames) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (config.shopId) params.append('shop_id', String(config.shopId));
      
      const endpoint = config.cardId 
        ? `${apiUrl}/${apiLocale}/shop/cards/${config.cardId}/games`
        : `${apiUrl}/${apiLocale}/shop/games`;

      const response = await fetch(`${endpoint}?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
          'X-API-Secret': config.apiSecret,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || errorMessage);
      }

      const loadedGames = result.data || [];
      setGames(loadedGames);
      onLoadGames?.(loadedGames);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : errorMessage;
      setError(errorMsg);
      onError?.(err instanceof Error ? err : new Error(errorMsg));
    } finally {
      setLoading(false);
    }
  }, [config, apiUrl, apiLocale, propGames, errorMessage, onLoadGames, onError]);

  useEffect(() => {
    if (!propGames) {
      fetchGames();
    }
  }, [fetchGames, propGames]);

  useEffect(() => {
    if (propGames) {
      setGames(propGames);
    }
  }, [propGames]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'active': return '#3b82f6';
      case 'available': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status?: string) => {
    const labels: Record<string, Record<string, string>> = {
      completed: { en: 'Completed', lt: 'Užbaigta' },
      active: { en: 'In Progress', lt: 'Vykdoma' },
      available: { en: 'Available', lt: 'Galima' },
    };
    return labels[status || 'available']?.[apiLocale] || labels[status || 'available']?.['en'] || status;
  };

  if (loading) {
    return (
      <div className={`loyalty-game-list loyalty-game-list--loading ${className}`}>
        <div className="loyalty-game-list__spinner" />
        <p className="loyalty-game-list__loading-text">{loadingMessage}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`loyalty-game-list loyalty-game-list--error ${className}`}>
        <p className="loyalty-game-list__error-text">{error}</p>
        <button className="loyalty-game-list__retry-btn" onClick={fetchGames}>
          {apiLocale === 'lt' ? 'Bandyti dar kartą' : 'Retry'}
        </button>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className={`loyalty-game-list loyalty-game-list--empty ${className}`}>
        <p className="loyalty-game-list__empty-text">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`loyalty-game-list ${className}`}>
      {games.map((game) => {
        const gameTypeLabel = GAME_TYPE_LABELS[game.game_type]?.[apiLocale] || GAME_TYPE_LABELS[game.game_type]?.['en'] || game.game_type;
        const progress = game.user_progress;
        const progressPercent = progress && game.stamps_required
          ? Math.min((progress.current_step / game.stamps_required) * 100, 100)
          : 0;

        return (
          <div
            key={game.id}
            className="loyalty-game-list__item"
            onClick={() => onGameSelect?.(game)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onGameSelect?.(game)}
          >
            <div className="loyalty-game-list__item-icon">
              {game.image_path ? (
                <img src={game.image_path} alt="" className="loyalty-game-list__item-image" />
              ) : (
                <span className="loyalty-game-list__item-emoji">{GAME_TYPE_ICONS[game.game_type] || '🎮'}</span>
              )}
            </div>

            <div className="loyalty-game-list__item-content">
              <div className="loyalty-game-list__item-header">
                <h4 className="loyalty-game-list__item-name">{getLocalizedText(game.name)}</h4>
                {showStatus && game.status && (
                  <span 
                    className="loyalty-game-list__item-status"
                    style={{ backgroundColor: getStatusColor(game.status) }}
                  >
                    {getStatusLabel(game.status)}
                  </span>
                )}
              </div>

              <p className="loyalty-game-list__item-type">{gameTypeLabel}</p>

              {game.description && (
                <p className="loyalty-game-list__item-description">
                  {getLocalizedText(game.description)}
                </p>
              )}

              {showProgress && game.game_type === 'stamps' && game.stamps_required && (
                <div className="loyalty-game-list__item-progress">
                  <div className="loyalty-game-list__item-progress-bar">
                    <div 
                      className="loyalty-game-list__item-progress-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="loyalty-game-list__item-progress-text">
                    {progress?.current_step || 0}/{game.stamps_required}
                  </span>
                </div>
              )}

              {game.partner_name && (
                <p className="loyalty-game-list__item-partner">{game.partner_name}</p>
              )}
            </div>

            <div className="loyalty-game-list__item-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default GameList;

