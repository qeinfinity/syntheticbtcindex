// src/index.ts

import { MCPServer } from '@modelcontextprotocol/typescript-sdk';
import { BinanceWebSocketManager } from './connectors/binance-ws';
import { BinanceRestConnector } from './connectors/binance-rest';
import { config } from './config';
import { logger } from './utils/logger';
import { 
  MarketDataParams, 
  KlineParams, 
  StreamParams, 
  APIError 
} from './types/api-types';

// Add at the top of index.ts
interface ServerError {
  message: string;
  code?: number;
}

const wsManager = new BinanceWebSocketManager();
const restConnector = new BinanceRestConnector();

const server = new MCPServer({
  name: 'binance-market-data',
  version: config.VERSION || '1.0.0',  // Add version to config
  description: 'Binance market data provider with WebSocket support'
});

// Common parameter schemas
const symbolParamSchema = {
  type: 'object',
  properties: {
    symbol: { 
      type: 'string', 
      description: 'Trading pair symbol (e.g., BTCUSDT)' 
    },
    type: { 
      type: 'string', 
      enum: ['spot', 'futures'], 
      description: 'Market type' 
    }
  },
  required: ['symbol', 'type']
};

// Add market data functions
server.addFunction({
  name: 'getMarketData',
  description: 'Get comprehensive market data for a trading pair',
  parameters: symbolParamSchema,
  handler: async ({ symbol, type }: MarketDataParams) => {
    try {
      const data = await restConnector.getMarketData(symbol, type);
      return { data };
    } catch (error) {
      const apiError = error as APIError;
      logger.error('Error in getMarketData:', apiError);
      return { error: apiError.message };
    }
  }
});

server.addFunction({
  name: 'getKlines',
  description: 'Get historical candlestick data',
  parameters: symbolParamSchema,
  handler: async ({ symbol, type, interval, limit }: KlineParams) => {
    try {
      const data = await restConnector.getKlines(symbol, type, interval, limit);
      return { data };
    } catch (error: unknown) {
      const apiError = error as APIError;
      logger.error('Error in getKlines:', apiError);
      return { error: apiError.message };
    }
  }
});

// WebSocket subscription function
server.addFunction({
  name: 'subscribeToMarketData',
  description: 'Subscribe to real-time market data updates',
  parameters: {
    ...symbolParamSchema,
    properties: {
      ...symbolParamSchema.properties,
      streams: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['ticker', 'trades', 'kline', 'depth']
        }
      }
    },
    required: ['symbol', 'type', 'streams']
  },
  handler: async ({ symbol, type, streams }: StreamParams) => {
    try {
      wsManager.subscribe(symbol, type, streams);
      return {
        success: true,
        message: `Subscribed to ${streams.join(', ')} for ${symbol}`
      };
    } catch (error: unknown) {
      const apiError = error as APIError;
      logger.error('Error in subscribeToMarketData:', apiError);
      return { error: apiError.message };
    }
  }
});

// Start the server
server.start().then(() => {
  logger.info('Binance MCP server started successfully');
}).catch((error: Error | ServerError) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

// Handle cleanup on shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down server...');
  wsManager.close();
  process.exit(0);
});