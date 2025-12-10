export type Environment = 'staging' | 'production';

export interface LoyaltySDKConfig {
  baseUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  environment?: Environment;
  locale?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

export interface EnvironmentConfig {
  staging: { baseUrl: string; debug: boolean };
  production: { baseUrl: string; debug: boolean };
}

export const DEFAULT_ENVIRONMENTS: EnvironmentConfig = {
  staging: { baseUrl: 'https://staging-api.loyalty.lt', debug: true },
  production: { baseUrl: 'https://api.loyalty.lt', debug: false }
};

export const DEFAULT_CONFIG: Required<Omit<LoyaltySDKConfig, 'apiKey' | 'apiSecret'>> = {
  baseUrl: DEFAULT_ENVIRONMENTS.production.baseUrl,
  environment: 'production',
  locale: 'lt',
  timeout: 30000,
  retries: 3,
  debug: false
};

export class ConfigManager {
  private config: LoyaltySDKConfig;
  
  constructor(userConfig: LoyaltySDKConfig = {}) {
    this.config = this.mergeConfigs(userConfig);
  }
  
  private mergeConfigs(userConfig: LoyaltySDKConfig): LoyaltySDKConfig {
    const envConfig = this.getEnvironmentConfig();
    const environment = userConfig.environment || 
                       this.parseEnvironment(envConfig.environment) || 
                       DEFAULT_CONFIG.environment;
    const envDefaults = DEFAULT_ENVIRONMENTS[environment];
    
    return {
      ...DEFAULT_CONFIG,
      ...envDefaults,
      ...envConfig,
      ...userConfig,
      environment
    };
  }
  
  private parseEnvironment(env: string | undefined): Environment | undefined {
    if (!env) return undefined;
    const validEnvs: Environment[] = ['staging', 'production'];
    return validEnvs.includes(env as Environment) ? env as Environment : undefined;
  }
  
  private getEnvironmentConfig(): { environment?: string; [key: string]: any } {
    const env = this.getEnvVars();
    
    return {
      baseUrl: env.LOYALTY_API_URL,
      apiKey: env.LOYALTY_API_KEY,
      apiSecret: env.LOYALTY_API_SECRET,
      environment: env.LOYALTY_ENVIRONMENT,
      locale: env.LOYALTY_LOCALE,
      debug: this.parseBoolean(env.LOYALTY_DEBUG),
      timeout: this.parseNumber(env.LOYALTY_TIMEOUT),
      retries: this.parseNumber(env.LOYALTY_RETRIES)
    };
  }
  
  private getEnvVars(): Record<string, string | undefined> {
    const envVars: Record<string, string | undefined> = {};
    if (typeof process !== 'undefined' && process.env) {
      Object.assign(envVars, process.env);
    }
    if (typeof window !== 'undefined' && (window as any).ENV) {
      Object.assign(envVars, (window as any).ENV);
    }
    return envVars;
  }
  
  private parseBoolean(value: string | undefined): boolean | undefined {
    if (value === undefined) return undefined;
    return value.toLowerCase() === 'true' || value === '1';
  }
  
  private parseNumber(value: string | undefined): number | undefined {
    if (value === undefined) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
  
  public getConfig(): LoyaltySDKConfig {
    return { ...this.config };
  }
  
  public updateConfig(updates: Partial<LoyaltySDKConfig>): void {
    this.config = { ...this.config, ...updates };
  }
  
  public get<K extends keyof LoyaltySDKConfig>(key: K): LoyaltySDKConfig[K] {
    return this.config[key];
  }
  
  public set<K extends keyof LoyaltySDKConfig>(key: K, value: LoyaltySDKConfig[K]): void {
    this.config[key] = value;
  }
  
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.config.apiKey) {
      errors.push('API key is required');
    }
    
    if (!this.config.apiSecret) {
      errors.push('API secret is required');
    }
    
    if (this.config.baseUrl && !this.isValidUrl(this.config.baseUrl)) {
      errors.push('Invalid base URL');
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  public getApiUrl(): string {
    const baseUrl = this.config.baseUrl || DEFAULT_CONFIG.baseUrl;
    const locale = this.config.locale || DEFAULT_CONFIG.locale;
    return `${baseUrl}/${locale}`;
  }
}
