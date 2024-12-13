# Binance Market Data MCP Server

An MCP server implementation for accessing Binance market data with WebSocket support.

## Features

- Real-time market data via WebSocket
- REST API access for spot and futures markets
- Support for:
  - Market data (price, volume, etc.)
  - Order book data
  - Trade information
  - Futures-specific data (funding rate, open interest)
- Automatic WebSocket reconnection
- Rate limiting and error handling

## Installation

```bash
# Clone the repository
git clone [repository-url]
cd binance-mcp-server

# Install dependencies
npm install

# Build the project
npm run build