export declare const config: {
    readonly NAME: "binance-market-data";
    readonly VERSION: "1.0.0";
    readonly SPOT_REST_URL: "https://api.binance.com/api/v3";
    readonly FUTURES_REST_URL: "https://fapi.binance.com/fapi/v1";
    readonly SPOT_WS_URL: "wss://stream.binance.com:9443/ws";
    readonly FUTURES_WS_URL: "wss://fstream.binance.com/ws";
    readonly API_KEY: string;
    readonly API_SECRET: string;
    readonly DEFAULT_ORDER_BOOK_LIMIT: 100;
    readonly DEFAULT_TRADE_LIMIT: 1000;
    readonly SPOT_RATE_LIMIT: 1200;
    readonly FUTURES_RATE_LIMIT: 1200;
    readonly WS_PING_INTERVAL: number;
    readonly WS_RECONNECT_DELAY: 5000;
    readonly WS_CONNECTION_TIMEOUT: 10000;
    readonly WS_MAX_RECONNECT_ATTEMPTS: 5;
    readonly HTTP_TIMEOUT: 10000;
    readonly HTTP_MAX_RETRIES: 3;
    readonly HTTP_RETRY_DELAY: 1000;
    readonly ERRORS: {
        readonly RATE_LIMIT_EXCEEDED: "Rate limit exceeded";
        readonly INVALID_SYMBOL: "Invalid trading pair symbol";
        readonly WS_CONNECTION_ERROR: "WebSocket connection error";
        readonly WS_SUBSCRIPTION_ERROR: "WebSocket subscription error";
    };
};
export type Config = typeof config;
