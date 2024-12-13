"use strict";
// src/connectors/binance-rest.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinanceRestConnector = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class BinanceRestConnector {
    constructor() {
        this.requestCount = { spot: 0, futures: 0 };
        this.lastResetTime = { spot: Date.now(), futures: Date.now() };
        this.spotClient = axios_1.default.create({
            baseURL: config_1.config.SPOT_REST_URL,
            timeout: config_1.config.HTTP_TIMEOUT,
            headers: { 'Content-Type': 'application/json' }
        });
        this.futuresClient = axios_1.default.create({
            baseURL: config_1.config.FUTURES_REST_URL,
            timeout: config_1.config.HTTP_TIMEOUT,
            headers: { 'Content-Type': 'application/json' }
        });
        this.setupRateLimiting();
    }
    transformKlineData(data) {
        return data.map(kline => ({
            openTime: kline[0],
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
            volume: parseFloat(kline[5]),
            closeTime: kline[6],
            quoteVolume: parseFloat(kline[7]),
            trades: kline[8],
            takerBuyBaseVolume: parseFloat(kline[9]),
            takerBuyQuoteVolume: parseFloat(kline[10])
        }));
    }
    setupRateLimiting() {
        const checkRateLimit = (type) => {
            const now = Date.now();
            if (now - this.lastResetTime[type] >= 60000) {
                this.requestCount[type] = 0;
                this.lastResetTime[type] = now;
            }
            const limit = type === 'spot' ? config_1.config.SPOT_RATE_LIMIT : config_1.config.FUTURES_RATE_LIMIT;
            if (this.requestCount[type] >= limit) {
                throw new Error(config_1.config.ERRORS.RATE_LIMIT_EXCEEDED);
            }
            this.requestCount[type]++;
        };
        this.spotClient.interceptors.request.use(config => {
            checkRateLimit('spot');
            return config;
        });
        this.futuresClient.interceptors.request.use(config => {
            checkRateLimit('futures');
            return config;
        });
    }
    async getMarketData(symbol, type) {
        const client = type === 'spot' ? this.spotClient : this.futuresClient;
        const endpoint = type === 'spot' ? '/ticker/24hr' : '/ticker/24hr';
        try {
            const response = await client.get(endpoint, {
                params: { symbol: symbol.toUpperCase() }
            });
            return this.transformMarketData(response.data, type);
        }
        catch (error) {
            logger_1.logger.error(`Error fetching market data for ${symbol}:`, error);
            throw error;
        }
    }
    async getKlines(symbol, type, interval, limit, startTime, endTime) {
        const client = type === 'spot' ? this.spotClient : this.futuresClient;
        const endpoint = '/klines';
        try {
            const response = await client.get(endpoint, {
                params: {
                    symbol: symbol.toUpperCase(),
                    interval,
                    limit,
                    startTime,
                    endTime
                }
            });
            return this.transformKlineData(response.data);
        }
        catch (error) {
            logger_1.logger.error(`Error fetching klines for ${symbol}:`, error);
            throw error;
        }
    }
    async getOrderBook(symbol, type, limit = config_1.config.DEFAULT_ORDER_BOOK_LIMIT) {
        const client = type === 'spot' ? this.spotClient : this.futuresClient;
        const endpoint = '/depth';
        try {
            const response = await client.get(endpoint, {
                params: {
                    symbol: symbol.toUpperCase(),
                    limit
                }
            });
            return {
                symbol,
                type,
                bids: response.data.bids.map((bid) => [parseFloat(bid[0]), parseFloat(bid[1])]),
                asks: response.data.asks.map((ask) => [parseFloat(ask[0]), parseFloat(ask[1])]),
                timestamp: Date.now(),
                lastUpdateId: response.data.lastUpdateId
            };
        }
        catch (error) {
            logger_1.logger.error(`Error fetching order book for ${symbol}:`, error);
            throw error;
        }
    }
    async getTrades(symbol, type, limit = config_1.config.DEFAULT_TRADE_LIMIT) {
        const client = type === 'spot' ? this.spotClient : this.futuresClient;
        const endpoint = '/trades';
        try {
            const response = await client.get(endpoint, {
                params: {
                    symbol: symbol.toUpperCase(),
                    limit
                }
            });
            return response.data.map((trade) => ({
                symbol,
                type,
                price: parseFloat(trade.price),
                quantity: parseFloat(trade.qty),
                timestamp: trade.time,
                isBuyerMaker: trade.isBuyerMaker,
                tradeId: trade.id
            }));
        }
        catch (error) {
            logger_1.logger.error(`Error fetching trades for ${symbol}:`, error);
            throw error;
        }
    }
    async getFuturesData(symbol) {
        if (!symbol)
            throw new Error(config_1.config.ERRORS.INVALID_SYMBOL);
        try {
            const [fundingRate, openInterest, liquidationOrders] = await Promise.all([
                this.futuresClient.get('/fundingRate', { params: { symbol: symbol.toUpperCase() } }),
                this.futuresClient.get('/openInterest', { params: { symbol: symbol.toUpperCase() } }),
                this.futuresClient.get('/allForceOrders', { params: { symbol: symbol.toUpperCase() } })
            ]);
            return {
                fundingRate: parseFloat(fundingRate.data.fundingRate),
                openInterest: parseFloat(openInterest.data.openInterest),
                liquidations24h: liquidationOrders.data.length
            };
        }
        catch (error) {
            logger_1.logger.error(`Error fetching futures data for ${symbol}:`, error);
            throw error;
        }
    }
    transformMarketData(data, type) {
        return {
            symbol: data.symbol,
            exchange: 'binance',
            type,
            price: parseFloat(data.lastPrice),
            timestamp: data.closeTime,
            volume24h: parseFloat(data.volume),
            volumeDelta24h: parseFloat(data.volumeChange24h),
            priceChange24h: parseFloat(data.priceChange),
            priceChange1h: parseFloat(data.priceChangePercent1h),
            price24hHigh: parseFloat(data.highPrice),
            price24hLow: parseFloat(data.lowPrice),
            tradeCount24h: parseInt(data.count),
            bidAskSpread: parseFloat(data.askPrice) - parseFloat(data.bidPrice),
            ...(type === 'futures' && {
                openInterest: parseFloat(data.openInterest),
                fundingRate: parseFloat(data.fundingRate),
                liquidations24h: parseInt(data.liquidation24h)
            })
        };
    }
}
exports.BinanceRestConnector = BinanceRestConnector;
//# sourceMappingURL=binance-rest.js.map