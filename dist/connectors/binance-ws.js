"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinanceWebSocketManager = void 0;
const ws_1 = __importDefault(require("ws"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class BinanceWebSocketManager {
    constructor() {
        this.connections = new Map();
        this.pingIntervals = new Map();
    }
    subscribe(symbol, type, streams) {
        const wsUrl = type === 'spot' ? config_1.config.SPOT_WS_URL : config_1.config.FUTURES_WS_URL;
        const streamNames = streams.map(stream => `${symbol.toLowerCase()}@${stream}`);
        try {
            const ws = new ws_1.default(`${wsUrl}/${streamNames.join('/')}`);
            ws.on('open', () => {
                logger_1.logger.info(`WebSocket connected for ${symbol} ${streams.join(', ')}`);
                this.setupPingInterval(symbol, ws);
            });
            ws.on('message', (data) => {
                try {
                    const parsed = JSON.parse(data.toString());
                    // Handle different stream types
                    // Implementation details here
                }
                catch (error) {
                    logger_1.logger.error('Error parsing WebSocket message:', error);
                }
            });
            ws.on('error', (error) => {
                logger_1.logger.error(`WebSocket error for ${symbol}:`, error);
            });
            ws.on('close', () => {
                logger_1.logger.info(`WebSocket closed for ${symbol}`);
                this.cleanup(symbol);
            });
            this.connections.set(symbol, ws);
        }
        catch (error) {
            logger_1.logger.error(`Error creating WebSocket connection for ${symbol}:`, error);
            throw error;
        }
    }
    setupPingInterval(symbol, ws) {
        const interval = setInterval(() => {
            if (ws.readyState === ws_1.default.OPEN) {
                ws.ping();
            }
        }, config_1.config.WS_PING_INTERVAL);
        this.pingIntervals.set(symbol, interval);
    }
    cleanup(symbol) {
        const interval = this.pingIntervals.get(symbol);
        if (interval) {
            clearInterval(interval);
            this.pingIntervals.delete(symbol);
        }
        this.connections.delete(symbol);
    }
    close() {
        this.connections.forEach((ws, symbol) => {
            ws.close();
            this.cleanup(symbol);
        });
    }
}
exports.BinanceWebSocketManager = BinanceWebSocketManager;
//# sourceMappingURL=binance-ws.js.map