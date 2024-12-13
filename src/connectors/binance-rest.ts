// src/connectors/binance-rest.ts

import axios, { AxiosInstance } from 'axios';
import { MarketData, OrderBookData, TradeData } from '../types/market-data';
import { config } from '../config';
import { logger } from '../utils/logger';

export class BinanceRestConnector {
  private spotClient: AxiosInstance;
  private futuresClient: AxiosInstance;
  private requestCount: { spot: number; futures: number } = { spot: 0, futures: 0 };
  private lastResetTime: { spot: number; futures: number } = { spot: Date.now(), futures: Date.now() };

  constructor() {
    this.spotClient = axios.create({
      baseURL: config.SPOT_REST_URL,
      timeout: config.HTTP_TIMEOUT,
      headers: { 'Content-Type': 'application/json' }
    });

    this.futuresClient = axios.create({
      baseURL: config.FUTURES_REST_URL,
      timeout: config.HTTP_TIMEOUT,
      headers: { 'Content-Type': 'application/json' }
    });

    this.setupRateLimiting();
  }

  private transformKlineData(data: any[]): any[] {
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

  private setupRateLimiting() {
    const checkRateLimit = (type: 'spot' | 'futures') => {
      const now = Date.now();
      if (now - this.lastResetTime[type] >= 60000) {
        this.requestCount[type] = 0;
        this.lastResetTime[type] = now;
      }

      const limit = type === 'spot' ? config.SPOT_RATE_LIMIT : config.FUTURES_RATE_LIMIT;
      if (this.requestCount[type] >= limit) {
        throw new Error(config.ERRORS.RATE_LIMIT_EXCEEDED);
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

  public async getMarketData(symbol: string, type: 'spot' | 'futures'): Promise<MarketData> {
    const client = type === 'spot' ? this.spotClient : this.futuresClient;
    const endpoint = type === 'spot' ? '/ticker/24hr' : '/ticker/24hr';
    
    try {
      const response = await client.get(endpoint, {
        params: { symbol: symbol.toUpperCase() }
      });
      
      return this.transformMarketData(response.data, type);
    } catch (error) {
      logger.error(`Error fetching market data for ${symbol}:`, error);
      throw error;
    }
  }

  public async getKlines(
    symbol: string, 
    type: 'spot' | 'futures', 
    interval: string,
    limit?: number,
    startTime?: number,
    endTime?: number
  ) {
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
    } catch (error) {
      logger.error(`Error fetching klines for ${symbol}:`, error);
      throw error;
    }
  }

  public async getOrderBook(
    symbol: string, 
    type: 'spot' | 'futures', 
    limit: number = config.DEFAULT_ORDER_BOOK_LIMIT
  ): Promise<OrderBookData> {
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
        bids: response.data.bids.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
        asks: response.data.asks.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
        timestamp: Date.now(),
        lastUpdateId: response.data.lastUpdateId
      };
    } catch (error) {
      logger.error(`Error fetching order book for ${symbol}:`, error);
      throw error;
    }
  }

  public async getTrades(
    symbol: string,
    type: 'spot' | 'futures',
    limit: number = config.DEFAULT_TRADE_LIMIT
  ): Promise<TradeData[]> {
    const client = type === 'spot' ? this.spotClient : this.futuresClient;
    const endpoint = '/trades';
    
    try {
      const response = await client.get(endpoint, {
        params: {
          symbol: symbol.toUpperCase(),
          limit
        }
      });
      
      return response.data.map((trade: any) => ({
        symbol,
        type,
        price: parseFloat(trade.price),
        quantity: parseFloat(trade.qty),
        timestamp: trade.time,
        isBuyerMaker: trade.isBuyerMaker,
        tradeId: trade.id
      }));
    } catch (error) {
      logger.error(`Error fetching trades for ${symbol}:`, error);
      throw error;
    }
  }

  public async getFuturesData(symbol: string) {
    if (!symbol) throw new Error(config.ERRORS.INVALID_SYMBOL);
    
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
    } catch (error) {
      logger.error(`Error fetching futures data for ${symbol}:`, error);
      throw error;
    }
  }

  private transformMarketData(data: any, type: 'spot' | 'futures'): MarketData {
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