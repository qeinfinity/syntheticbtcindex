export declare class BinanceWebSocketManager {
    private connections;
    private pingIntervals;
    constructor();
    subscribe(symbol: string, type: 'spot' | 'futures', streams: string[]): void;
    private setupPingInterval;
    private cleanup;
    close(): void;
}
