import WebSocket from 'ws';
import { config } from '../config';
import { logger } from '../utils/logger';

export class BinanceWebSocketManager {
  private connections: Map<string, WebSocket>;
  private pingIntervals: Map<string, NodeJS.Timeout>;

  constructor() {
    this.connections = new Map();
    this.pingIntervals = new Map();
  }

  public subscribe(symbol: string, type: 'spot' | 'futures', streams: string[]): void {
    const wsUrl = type === 'spot' ? config.SPOT_WS_URL : config.FUTURES_WS_URL;
    const streamNames = streams.map(stream => `${symbol.toLowerCase()}@${stream}`);
    
    try {
      const ws = new WebSocket(`${wsUrl}/${streamNames.join('/')}`);
      
      ws.on('open', () => {
        logger.info(`WebSocket connected for ${symbol} ${streams.join(', ')}`);
        this.setupPingInterval(symbol, ws);
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const parsed = JSON.parse(data.toString());
          // Handle different stream types
          // Implementation details here
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for ${symbol}:`, error);
      });

      ws.on('close', () => {
        logger.info(`WebSocket closed for ${symbol}`);
        this.cleanup(symbol);
      });

      this.connections.set(symbol, ws);
    } catch (error) {
      logger.error(`Error creating WebSocket connection for ${symbol}:`, error);
      throw error;
    }
  }

  private setupPingInterval(symbol: string, ws: WebSocket): void {
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, config.WS_PING_INTERVAL);
    this.pingIntervals.set(symbol, interval);
  }

  private cleanup(symbol: string): void {
    const interval = this.pingIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.pingIntervals.delete(symbol);
    }
    this.connections.delete(symbol);
  }

  public close(): void {
    this.connections.forEach((ws, symbol) => {
      ws.close();
      this.cleanup(symbol);
    });
  }
}