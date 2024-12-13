export type KlineInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';
export type MarketType = 'spot' | 'futures';
export type StreamType = 'ticker' | 'trades' | 'kline' | 'depth';
export interface MarketDataParams {
    symbol: string;
    type: MarketType;
}
export interface KlineParams extends MarketDataParams {
    interval: KlineInterval;
    limit?: number;
}
export interface StreamParams extends MarketDataParams {
    streams: StreamType[];
}
export interface APIError {
    message: string;
    code?: number;
    status?: number;
}
