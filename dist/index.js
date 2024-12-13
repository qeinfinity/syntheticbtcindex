"use strict";
// src/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_sdk_1 = require("@modelcontextprotocol/typescript-sdk");
const binance_ws_1 = require("./connectors/binance-ws");
const binance_rest_1 = require("./connectors/binance-rest");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const wsManager = new binance_ws_1.BinanceWebSocketManager();
const restConnector = new binance_rest_1.BinanceRestConnector();
const server = new typescript_sdk_1.MCPServer({
    name: 'binance-market-data',
    version: config_1.config.VERSION || '1.0.0',
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
    handler: async ({ symbol, type }) => {
        try {
            const data = await restConnector.getMarketData(symbol, type);
            return { data };
        }
        catch (error) {
            const apiError = error;
            logger_1.logger.error('Error in getMarketData:', apiError);
            return { error: apiError.message };
        }
    }
});
server.addFunction({
    name: 'getKlines',
    description: 'Get historical candlestick data',
    parameters: symbolParamSchema,
    handler: async ({ symbol, type, interval, limit }) => {
        try {
            const data = await restConnector.getKlines(symbol, type, interval, limit);
            return { data };
        }
        catch (error) {
            const apiError = error;
            logger_1.logger.error('Error in getKlines:', apiError);
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
    handler: async ({ symbol, type, streams }) => {
        try {
            wsManager.subscribe(symbol, type, streams);
            return {
                success: true,
                message: `Subscribed to ${streams.join(', ')} for ${symbol}`
            };
        }
        catch (error) {
            const apiError = error;
            logger_1.logger.error('Error in subscribeToMarketData:', apiError);
            return { error: apiError.message };
        }
    }
});
// Start the server
server.start().then(() => {
    logger_1.logger.info('Binance MCP server started successfully');
}).catch((error) => {
    logger_1.logger.error('Failed to start server:', error);
    process.exit(1);
});
// Handle cleanup on shutdown
process.on('SIGINT', () => {
    logger_1.logger.info('Shutting down server...');
    wsManager.close();
    process.exit(0);
});
//# sourceMappingURL=index.js.map