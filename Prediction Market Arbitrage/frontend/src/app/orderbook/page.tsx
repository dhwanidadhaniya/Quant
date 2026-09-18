'use client';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ============================================================
// ORDER BOOK VISUALIZATION
// ============================================================

const generateOrderBook = (mid: number) => {
  const bids = Array.from({ length: 10 }, (_, i) => {
    const price = +(mid - (i + 1) * 0.01).toFixed(2);
    const qty = Math.round((300 + i * 150) * (0.7 + Math.random() * 0.6));
    return { price, quantity: qty, side: 'bid', cumulative: 0 };
  });
  const asks = Array.from({ length: 10 }, (_, i) => {
    const price = +(mid + (i + 1) * 0.01).toFixed(2);
    const qty = Math.round((250 + i * 130) * (0.7 + Math.random() * 0.6));
    return { price, quantity: qty, side: 'ask', cumulative: 0 };
  });
  let bc = 0, ac = 0;
  bids.forEach(b => { bc += b.quantity; b.cumulative = bc; });
  asks.forEach(a => { ac += a.quantity; a.cumulative = ac; });
  return { bids, asks, mid, spread: +(asks[0].price - bids[0].price).toFixed(3) };
};

export default function OrderBookPage() {
  const [mid] = useState(0.58);
  const book = generateOrderBook(mid);
  const depthData = [
    ...book.bids.slice().reverse().map(b => ({ price: b.price, bids: b.cumulative, asks: 0 })),
    ...book.asks.map(a => ({ price: a.price, bids: 0, asks: a.cumulative })),
  ];

  return (
    <div className="max-w-5xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">Order Book Visualization</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-6">Fed Rate Cut Sep 2024 — Polymarket · YES Contract</p>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Bid Side */}
        <div className="glass-card-static p-6">
          <h3 className="text-sm font-bold text-[var(--emerald)] mb-3">BIDS (Buy Orders)</h3>
          <table className="data-table">
            <thead><tr><th>Price</th><th>Quantity</th><th>Cumulative</th><th>Depth</th></tr></thead>
            <tbody>
              {book.bids.map((b, i) => (
                <tr key={i}>
                  <td className="mono-cell positive">${b.price}</td>
                  <td className="mono-cell">{b.quantity.toLocaleString()}</td>
                  <td className="mono-cell">{b.cumulative.toLocaleString()}</td>
                  <td><div className="h-2 rounded-full bg-[rgba(16,185,129,0.3)]" style={{ width: `${(b.cumulative / book.bids[book.bids.length-1].cumulative) * 100}%` }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ask Side */}
        <div className="glass-card-static p-6">
          <h3 className="text-sm font-bold text-[var(--rose)] mb-3">ASKS (Sell Orders)</h3>
          <table className="data-table">
            <thead><tr><th>Price</th><th>Quantity</th><th>Cumulative</th><th>Depth</th></tr></thead>
            <tbody>
              {book.asks.map((a, i) => (
                <tr key={i}>
                  <td className="mono-cell negative">${a.price}</td>
                  <td className="mono-cell">{a.quantity.toLocaleString()}</td>
                  <td className="mono-cell">{a.cumulative.toLocaleString()}</td>
                  <td><div className="h-2 rounded-full bg-[rgba(244,63,94,0.3)]" style={{ width: `${(a.cumulative / book.asks[book.asks.length-1].cumulative) * 100}%` }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="kpi-card"><div className="kpi-label">Best Bid</div><div className="kpi-value text-xl positive">${book.bids[0].price}</div></div>
        <div className="kpi-card"><div className="kpi-label">Best Ask</div><div className="kpi-value text-xl negative">${book.asks[0].price}</div></div>
        <div className="kpi-card"><div className="kpi-label">Spread</div><div className="kpi-value text-xl text-[var(--amber)]">${book.spread}</div></div>
        <div className="kpi-card"><div className="kpi-label">Mid Price</div><div className="kpi-value text-xl">${mid.toFixed(2)}</div></div>
      </div>

      {/* Depth Chart */}
      <div className="chart-container mb-8">
        <div className="chart-title">Depth Chart</div>
        <div className="chart-subtitle">Cumulative order quantity at each price level</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={depthData}>
            <XAxis dataKey="price" tick={{ fontSize: 10, fill: '#5a6580' }} tickFormatter={v => `$${v}`} />
            <YAxis tick={{ fontSize: 10, fill: '#5a6580' }} />
            <Tooltip contentStyle={{ background: '#151d35', border: '1px solid rgba(139,149,176,0.2)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="bids" fill="rgba(16, 185, 129, 0.5)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="asks" fill="rgba(244, 63, 94, 0.5)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="research-note">
        <div className="note-label">Why The Order Book Matters</div>
        <p className="text-sm text-[var(--text-secondary)]">
          The price you see is just the best bid/ask. The price you GET depends on your order size and how deep the book is.
          A $5,000 market order into a book with only $2,000 at the best level will &ldquo;walk the book&rdquo; — filling at progressively worse prices.
          This is slippage, and it&apos;s the primary mechanism through which liquidity constraints reduce your edge.
        </p>
      </div>
    </div>
  );
}
