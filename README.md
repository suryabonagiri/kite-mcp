# 🚀 Kite Trading API Service

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v14+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A robust, production-ready TypeScript service that integrates with Zerodha's Kite Connect API for automated trading and portfolio management. Built with modern best practices, clean architecture, and comprehensive documentation.

## Features

- OAuth-based authentication with Kite Connect
- Real-time portfolio tracking
- Stock price monitoring with alerts
- Portfolio performance analytics
- Order placement capabilities
- RESTful API endpoints

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- Zerodha Kite Connect API credentials
  - API Key
  - API Secret
  - You can obtain these from [Kite Connect Developer Portal](https://developers.kite.trade)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd kite-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Create a `config.json` file in the root directory with your Kite credentials:
```json
{
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret"
}
```

## Running the Service

Start the service using:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The service will run on port 3000 by default.

### Security Notes

- Keep your `config.json` file secure and never commit it to version control
- Add `config.json` to your `.gitignore` file
- For production deployments, consider using a secure configuration management system

## API Endpoints

### Authentication

#### Login
- **GET** `/login`
- Returns a Kite Connect login URL
- Response: `{ loginUrl: string }`

#### Callback
- **GET** `/callback`
- Handles OAuth callback from Kite Connect
- Query Parameters: `request_token`
- Response: `{ accessToken: string }`

### Portfolio Management

#### Get Profile
- **GET** `/profile`
- Returns user profile information
- Requires authentication

#### Get Portfolio Summary
- **GET** `/portfolio`
- Returns current portfolio summary including:
  - Total value
  - Today's P&L
  - Total P&L
  - Individual holdings

#### Get Portfolio Performance
- **GET** `/portfolio/performance`
- Returns detailed portfolio analysis including:
  - Current value
  - Performance metrics (daily, weekly, monthly, yearly)
  - Top gainers and losers

### Market Data

#### Get Stock Quotes
- **GET** `/quote?symbols=SYMBOL1,SYMBOL2`
- Returns current market quotes for specified symbols
- Query Parameters: `symbols` (comma-separated list)

### Stock Monitoring

#### Start Monitoring
- **POST** `/monitor`
- Sets up price alerts for a stock
- Request Body:
```json
{
  "symbol": "SYMBOL",
  "abovePrice": number,
  "belowPrice": number
}
```

#### Stop Monitoring
- **POST** `/stop-monitor`
- Stops monitoring a stock
- Request Body:
```json
{
  "symbol": "SYMBOL"
}
```

## Example API Usage

### Getting Stock Quotes
```bash
curl "http://localhost:3000/quote?symbols=RELIANCE,TCS,INFY"
```

### Setting Up Price Alerts
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"symbol":"RELIANCE","abovePrice":2500,"belowPrice":2400}' \
  http://localhost:3000/monitor
```

### Getting Portfolio Summary
```bash
curl http://localhost:3000/portfolio
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

Error responses include a JSON object with an error message:
```json
{
  "error": "Error message description"
}
```

## CORS Support

The API includes CORS support and accepts requests from any origin (*). The following HTTP methods are allowed:
- GET
- POST
- OPTIONS

## Project Structure

```
├── src/
│   ├── index.ts          # Application entry point
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   └── utils/           # Helper functions
├── Dockerfile           # Container configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Project dependencies
├── .env.example         # Example environment variables
├── .gitignore          # Git ignore rules
├── LICENSE             # MIT License
├── README.md           # Project documentation
└── CONTRIBUTING.md     # Contribution guidelines
```

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **Authentication**: OAuth 2.0
- **API Integration**: Zerodha Kite Connect
- **Development Tools**:
  - ESLint for code linting
  - Prettier for code formatting
  - Jest for testing
  - Docker for containerization

## Code Quality & Best Practices

- Clean Architecture principles
- SOLID design patterns
- Comprehensive error handling
- API input validation
- Secure credential management
- Detailed logging
- Unit and integration tests
- TypeScript strict mode
- Automated CI/CD pipeline ready

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
