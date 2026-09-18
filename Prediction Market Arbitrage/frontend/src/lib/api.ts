// API client for the Prediction Market Arbitrage Terminal
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function fetchAPI<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Markets
  getMarkets: () => fetchAPI<any>('/markets'),
  getMarketDetail: (slug: string) => fetchAPI<any>(`/markets/${slug}`),
  getEvents: (category?: string) => fetchAPI<any>('/events', category ? { category } : undefined),
  getVenues: () => fetchAPI<any>('/venues'),
  getStats: () => fetchAPI<any>('/stats'),
  getHeroChart: () => fetchAPI<any>('/hero-chart'),
  getPriceHistory: (slug: string) => fetchAPI<any>(`/history/${slug}`),
  
  // Opportunities
  getOpportunities: (params?: any) => fetchAPI<any>('/opportunities', params),
  getOpportunityDetail: (id: number) => fetchAPI<any>(`/opportunities/${id}`),
  getHeatmap: (metric?: string) => fetchAPI<any>('/heatmap', metric ? { metric } : undefined),
  
  // Arbitrage
  singleVenueArbitrage: (params: any) => fetchAPI<any>('/arbitrage/single-venue', params),
  crossVenueArbitrage: (params: any) => fetchAPI<any>('/arbitrage/cross-venue', params),
  
  // Analysis
  kelly: (params: any) => fetchAPI<any>('/kelly', params),
  expectedValue: (params: any) => fetchAPI<any>('/expected-value', params),
  slippage: (params: any) => fetchAPI<any>('/simulate/slippage', params),
  execution: (params: any) => fetchAPI<any>('/simulate/execution', params),
  whatIf: (params: any) => fetchAPI<any>('/simulate/what-if', params),
  backtest: (params: any) => fetchAPI<any>('/backtest', params),
  probability: (params: any) => fetchAPI<any>('/probability', params),
  contractEquivalence: (params: any) => fetchAPI<any>('/contract-equivalence', params),
  
  // Order Book
  getOrderBook: (slug: string, venue?: string) => fetchAPI<any>(`/orderbook/${slug}`, venue ? { venue } : undefined),
  
  // Risk & P&L
  getRisk: (params?: any) => fetchAPI<any>('/risk', params),
  getPnL: () => fetchAPI<any>('/pnl'),
  
  // Efficiency
  getEfficiency: () => fetchAPI<any>('/market-efficiency'),
  getEventStudy: () => fetchAPI<any>('/event-study'),
  getLiquidity: () => fetchAPI<any>('/liquidity'),
  
  // Research
  getObservations: () => fetchAPI<any>('/research/observations'),
  getFormulas: () => fetchAPI<any>('/research/formulas'),
  getGlossary: () => fetchAPI<any>('/research/glossary'),
  getGlossaryTerm: (term: string) => fetchAPI<any>(`/research/glossary/${term}`),
  
  // Gamification
  getAchievements: () => fetchAPI<any>('/achievements'),
  getQuiz: () => fetchAPI<any>('/quiz'),
  getDailyChallenge: () => fetchAPI<any>('/daily-challenge'),
  getDetective: () => fetchAPI<any>('/detective'),
};

export default api;
