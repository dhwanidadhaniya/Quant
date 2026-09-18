'use client';

// ============================================================
// VENUE COMPARISON
// ============================================================

const VENUES = [
  { name: 'Polymarket', type: 'Decentralized', chain: 'Polygon', fee: '1%', maker: '0%', minTrade: '$1', maxTrade: '$100K', settlement: 'USDC', limits: true, market: true, url: 'polymarket.com' },
  { name: 'Kalshi', type: 'CFTC-regulated', chain: 'N/A (centralized)', fee: '0.7%', maker: '0%', minTrade: '$1', maxTrade: '$25K', settlement: 'USD', limits: true, market: true, url: 'kalshi.com' },
];

export default function VenueComparisonPage() {
  return (
    <div className="max-w-4xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">Venue Comparison</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-8">Side-by-side analysis of prediction market venues</p>

      <div className="glass-card-static p-6 overflow-x-auto mb-8">
        <table className="data-table">
          <thead><tr><th>Feature</th>{VENUES.map(v => <th key={v.name}>{v.name}</th>)}</tr></thead>
          <tbody>
            {[
              ['Type', ...VENUES.map(v => v.type)],
              ['Infrastructure', ...VENUES.map(v => v.chain)],
              ['Taker Fee', ...VENUES.map(v => v.fee)],
              ['Maker Fee', ...VENUES.map(v => v.maker)],
              ['Min Trade', ...VENUES.map(v => v.minTrade)],
              ['Max Trade', ...VENUES.map(v => v.maxTrade)],
              ['Settlement', ...VENUES.map(v => v.settlement)],
              ['Limit Orders', ...VENUES.map(v => v.limits ? '✓' : '✗')],
              ['Market Orders', ...VENUES.map(v => v.market ? '✓' : '✗')],
            ].map(([label, ...vals]) => (
              <tr key={label as string}>
                <td className="font-medium text-[var(--text-primary)]">{label}</td>
                {vals.map((v, i) => <td key={i} className="mono-cell">{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="insight-box">
          <div className="insight-label">Fee Impact</div>
          <p className="text-sm text-[var(--text-secondary)]">
            Polymarket charges 1% taker fee vs Kalshi&apos;s 0.7%. On a $1,000 trade, this 30bps difference
            equals $3 per leg — or $6 round trip. For small-edge opportunities, this difference matters.
          </p>
        </div>
        <div className="research-note">
          <div className="note-label">Regulatory Difference</div>
          <p className="text-sm text-[var(--text-secondary)]">
            Kalshi is CFTC-regulated (US commodity futures). Polymarket operates as a decentralized protocol.
            This affects settlement certainty, counterparty risk, and legal accessibility for US traders.
          </p>
        </div>
      </div>
    </div>
  );
}
