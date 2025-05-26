import { KiteConnect as KiteConnectImpl } from 'kiteconnect';
import * as http from 'http';
import { URL } from 'url';
import { IncomingMessage, ServerResponse } from 'http';
import * as path from 'path';
import open from 'open';

// Get configuration from environment variables
const KITE_API_KEY = process.env.KITE_API_KEY;
const KITE_API_SECRET = process.env.KITE_API_SECRET;
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Validate required environment variables
if (!KITE_API_KEY || !KITE_API_SECRET) {
    console.error('Error: Required environment variables are missing.');
    console.error('Please provide KITE_API_KEY and KITE_API_SECRET environment variables.');
    console.error('Example usage:');
    console.error('KITE_API_KEY=your_api_key KITE_API_SECRET=your_api_secret npm start');
    process.exit(1);
}

// Ensure we're in the correct directory
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

console.log('Configuration loaded successfully');
console.log('Current working directory:', process.cwd());
console.log('API Key:', KITE_API_KEY.substring(0, 4) + '...');

const REDIRECT_URL = 'http://127.0.0.1:3000/callback';

interface KiteQuote {
    instrument_token: number;
    timestamp: string;
    last_price: number;
    change: number;
    change_percent: number;
}

interface KiteHolding {
    tradingsymbol: string;
    exchange: string;
    quantity: number;
    average_price: number;
    last_price: number;
    close_price: number;
    day_change: number;
}

interface StockQuote {
    instrumentToken: number;
    timestamp: Date;
    lastPrice: number;
    change: number;
    changePercent: number;
}

interface PortfolioSummary {
    totalValue: number;
    todaysPnL: number;
    totalPnL: number;
    holdings: {
        symbol: string;
        quantity: number;
        averagePrice: number;
        lastPrice: number;
        currentValue: number;
        dayChange: number;
        overallPnL: number;
    }[];
}

interface PortfolioPerformance {
    period: string;
    value: number;
    change: number;
    changePercent: number;
}

interface PortfolioAnalysis {
    currentValue: number;
    performances: {
        daily: PortfolioPerformance;
        weekly: PortfolioPerformance;
        monthly: PortfolioPerformance;
        yearly: PortfolioPerformance;
    };
    topGainers: Array<{symbol: string, changePercent: number}>;
    topLosers: Array<{symbol: string, changePercent: number}>;
}

interface KiteConnectParams {
    api_key: string;
    root?: string;
}

interface KiteSession {
    access_token: string;
    // Add other session properties if needed
}

interface KiteConnect {
    getLoginURL(): string;
    generateSession(requestToken: string, apiSecret: string): Promise<KiteSession>;
    setAccessToken(token: string): void;
    getProfile(): Promise<any>;
    getHoldings(): Promise<KiteHolding[]>;
    getQuote(symbols: string[]): Promise<Record<string, KiteQuote>>;
    placeOrder(variety: string, params: any): Promise<string>;
}

class KiteService {
    private kite: KiteConnect;
    private apiKey: string;
    private monitoredStocks: Set<string> = new Set();
    private priceAlerts: Map<string, { above: number; below: number }> = new Map();
    private monitoringInterval: NodeJS.Timeout | null = null;

    constructor(apiKey: string) {
        console.log('Initializing KiteService with API Key:', apiKey);
        this.apiKey = apiKey;
        
        const config = {
            api_key: apiKey,
            root: 'https://api.kite.trade'
        };
        console.log('KiteConnect configuration:', config);
        
        this.kite = new KiteConnectImpl(config) as unknown as KiteConnect;
    }

    getLoginURL(): string {
        console.log('Getting login URL with API Key:', this.apiKey);
        return this.kite.getLoginURL();
    }

    async generateSession(requestToken: string, apiSecret: string) {
        try {
            console.log('Generating session with:');
            console.log('- API Key:', this.apiKey);
            console.log('- Request Token:', requestToken);
            
            const session = await this.kite.generateSession(requestToken, apiSecret);
            console.log('Session response:', session);
            
            if (session.access_token) {
                this.kite.setAccessToken(session.access_token);
                return session.access_token;
            } else {
                throw new Error('No access token in session response');
            }
        } catch (error) {
            console.error('Error generating session:', error);
            throw error;
        }
    }

    async getProfile() {
        try {
            return await this.kite.getProfile();
        } catch (error) {
            console.error('Error fetching profile:', error);
            throw error;
        }
    }

    async getHoldings() {
        try {
            return await this.kite.getHoldings();
        } catch (error) {
            console.error('Error fetching holdings:', error);
            throw error;
        }
    }

    async getQuote(symbols: string[]): Promise<Map<string, StockQuote>> {
        try {
            const quotes = await this.kite.getQuote(symbols) as Record<string, KiteQuote>;
            const formattedQuotes = new Map();
            
            for (const [symbol, quote] of Object.entries(quotes)) {
                formattedQuotes.set(symbol, {
                    instrumentToken: quote.instrument_token,
                    timestamp: new Date(quote.timestamp),
                    lastPrice: quote.last_price,
                    change: quote.change,
                    changePercent: quote.change_percent
                });
            }
            
            return formattedQuotes;
        } catch (error) {
            console.error('Error fetching quotes:', error);
            throw error;
        }
    }

    async getPortfolioSummary(): Promise<PortfolioSummary> {
        try {
            const holdings = await this.getHoldings() as KiteHolding[];
            let totalValue = 0;
            let todaysPnL = 0;
            let totalPnL = 0;
            
            const formattedHoldings = holdings.map(holding => {
                const currentValue = holding.quantity * holding.last_price;
                const dayPnL = holding.quantity * (holding.last_price - holding.close_price);
                const overallPnL = holding.quantity * (holding.last_price - holding.average_price);
                
                totalValue += currentValue;
                todaysPnL += dayPnL;
                totalPnL += overallPnL;

                return {
                    symbol: holding.tradingsymbol,
                    quantity: holding.quantity,
                    averagePrice: holding.average_price,
                    lastPrice: holding.last_price,
                    currentValue: currentValue,
                    dayChange: holding.day_change,
                    overallPnL: overallPnL
                };
            });

            return {
                totalValue,
                todaysPnL,
                totalPnL,
                holdings: formattedHoldings
            };
        } catch (error) {
            console.error('Error getting portfolio summary:', error);
            throw error;
        }
    }

    async getPortfolioPerformance(): Promise<PortfolioAnalysis> {
        try {
            const holdings = await this.getHoldings() as KiteHolding[];
            const portfolioValue = holdings.reduce((sum, holding) => 
                sum + (holding.quantity * holding.last_price), 0);
            
            const stockChanges = holdings.map(holding => ({
                symbol: holding.tradingsymbol,
                changePercent: holding.day_change
            }));

            // Sort for top gainers and losers
            const sortedChanges = [...stockChanges].sort((a, b) => b.changePercent - a.changePercent);
            const topGainers = sortedChanges.slice(0, 3);
            const topLosers = sortedChanges.reverse().slice(0, 3);

            return {
                currentValue: portfolioValue,
                performances: {
                    daily: {
                        period: '1 Day',
                        value: portfolioValue,
                        change: holdings.reduce((sum, h) => 
                            sum + (h.quantity * (h.last_price - h.close_price)), 0),
                        changePercent: (holdings.reduce((sum, h) => 
                            sum + (h.quantity * (h.last_price - h.close_price)), 0) / portfolioValue) * 100
                    },
                    weekly: {
                        period: '1 Week',
                        value: portfolioValue,
                        change: holdings.reduce((sum, h) => 
                            sum + (h.quantity * (h.last_price - h.average_price)), 0),
                        changePercent: (holdings.reduce((sum, h) => 
                            sum + (h.quantity * (h.last_price - h.average_price)), 0) / portfolioValue) * 100
                    },
                    monthly: {
                        period: '1 Month',
                        value: portfolioValue,
                        change: holdings.reduce((sum, h) => 
                            sum + (h.quantity * (h.last_price - h.average_price)), 0),
                        changePercent: (holdings.reduce((sum, h) => 
                            sum + (h.quantity * (h.last_price - h.average_price)), 0) / portfolioValue) * 100
                    },
                    yearly: {
                        period: '1 Year',
                        value: portfolioValue,
                        change: holdings.reduce((sum, h) => 
                            sum + (h.quantity * (h.last_price - h.average_price)), 0),
                        changePercent: (holdings.reduce((sum, h) => 
                            sum + (h.quantity * (h.last_price - h.average_price)), 0) / portfolioValue) * 100
                    }
                },
                topGainers,
                topLosers
            };
        } catch (error) {
            console.error('Error getting portfolio performance:', error);
            throw error;
        }
    }

    async placeOrder(symbol: string, exchange: string, type: string, quantity: number, price?: number) {
        try {
            const orderParams = {
                tradingsymbol: symbol,
                exchange: exchange,
                transaction_type: type,
                quantity: quantity,
                product: 'CNC',
                order_type: price ? 'LIMIT' : 'MARKET',
                ...(price && { price: price })
            };

            const orderId = await this.kite.placeOrder('regular', orderParams);
            return orderId;
        } catch (error) {
            console.error('Error placing order:', error);
            throw error;
        }
    }

    async monitorStock(symbol: string, abovePrice?: number, belowPrice?: number) {
        this.monitoredStocks.add(symbol);
        if (abovePrice || belowPrice) {
            this.priceAlerts.set(symbol, {
                above: abovePrice || Infinity,
                below: belowPrice || -Infinity
            });
        }

        if (!this.monitoringInterval) {
            this.monitoringInterval = setInterval(async () => {
                await this.checkPriceAlerts();
            }, 60000); // Check every minute
        }
    }

    async stopMonitoring(symbol: string) {
        this.monitoredStocks.delete(symbol);
        this.priceAlerts.delete(symbol);

        if (this.monitoredStocks.size === 0 && this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    private async checkPriceAlerts() {
        if (this.monitoredStocks.size === 0) return;

        try {
            const symbols = Array.from(this.monitoredStocks);
            const quotes = await this.getQuote(symbols);

            for (const [symbol, quote] of quotes.entries()) {
                const alerts = this.priceAlerts.get(symbol);
                if (!alerts) continue;

                if (quote.lastPrice > alerts.above) {
                    console.log(`Alert: ${symbol} price ${quote.lastPrice} is above ${alerts.above}`);
                    // You could trigger additional actions here like sending notifications
                }

                if (quote.lastPrice < alerts.below) {
                    console.log(`Alert: ${symbol} price ${quote.lastPrice} is below ${alerts.below}`);
                    // You could trigger additional actions here like sending notifications
                }
            }
        } catch (error) {
            console.error('Error checking price alerts:', error);
        }
    }

    async autoLogin(): Promise<void> {
        const loginUrl = this.getLoginURL();
        console.log('Opening login URL in browser...');
        await open(loginUrl);
    }
}

// Create KiteService instance
const kiteService = new KiteService(KITE_API_KEY);

// Create server and handle requests
const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    console.log(`Received ${req.method} request to ${req.url}`);
    
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        if (pathname === '/start-auth') {
            await kiteService.autoLogin();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Login page opened in browser' }));
        }
        else if (pathname === '/login') {
            console.log('Processing login request...');
            const loginUrl = kiteService.getLoginURL();
            console.log('Generated login URL:', loginUrl);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ loginUrl }));
        }
        else if (pathname === '/callback') {
            const requestToken = url.searchParams.get('request_token');
            if (!requestToken) {
                throw new Error('No request token provided');
            }

            const accessToken = await kiteService.generateSession(
                requestToken,
                KITE_API_SECRET
            );

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ accessToken }));
        }
        else if (pathname === '/profile') {
            const profile = await kiteService.getProfile();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(profile));
        }
        else if (pathname === '/portfolio') {
            const portfolio = await kiteService.getPortfolioSummary();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(portfolio));
        }
        else if (pathname === '/portfolio/performance') {
            try {
                console.log('Fetching portfolio performance...');
                const performance = await kiteService.getPortfolioPerformance();
                console.log('Performance data:', performance);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(performance));
            } catch (error) {
                console.error('Error getting portfolio performance:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to fetch portfolio performance' }));
            }
        }
        else if (pathname === '/quote') {
            const symbols = url.searchParams.get('symbols');
            if (!symbols) {
                throw new Error('No symbols provided');
            }

            const quotes = await kiteService.getQuote(symbols.split(','));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(Array.from(quotes)));
        }
        else if (pathname === '/monitor' || pathname === '/stop-monitor') {
            if (req.method !== 'POST') {
                throw new Error('Method not allowed');
            }

            let body = '';
            req.on('data', (chunk: Buffer) => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                const { symbol, abovePrice, belowPrice } = JSON.parse(body);
                if (pathname === '/monitor') {
                    await kiteService.monitorStock(symbol, abovePrice, belowPrice);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Monitoring started' }));
                } else {
                    await kiteService.stopMonitoring(symbol);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Monitoring stopped' }));
                }
            });
        }
        else {
            res.writeHead(404);
            res.end('Not Found');
        }
    } catch (error) {
        console.error('Error handling request:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        const errMsg = error instanceof Error ? error.message : 'An unknown error occurred';
        res.end(JSON.stringify({ error: errMsg }));
    }
});

// Start the server and initiate login
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Initiating auto-login...');
    await kiteService.autoLogin();
});
