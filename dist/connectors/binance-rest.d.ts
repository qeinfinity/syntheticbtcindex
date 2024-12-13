import { MarketData, OrderBookData, TradeData } from '../types/market-data';
export declare class BinanceRestConnector {
    private spotClient;
    private futuresClient;
    private requestCount;
    private lastResetTime;
    constructor();
    private transformKlineData;
    private setupRateLimiting;
    getMarketData(symbol: string, type: 'spot' | 'futures'): Promise<MarketData>;
    getKlines(symbol: string, type: 'spot' | 'futures', interval: string, limit?: number, startTime?: number, endTime?: number): Promise<any[]>;
    getOrderBook(symbol: string, type: 'spot' | 'futures', limit?: number): Promise<OrderBookData>;
    getTrades(symbol: string, type: 'spot' | 'futures', limit?: number): Promise<TradeData[]>;
    getFuturesData(symbol: string): Promise<{
        fundingRate: number;
        openInterest: number;
        liquidations24h: any;
    }>;
    private transformMarketData;
}
