import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/client';
import './Home.css';
import { errMsg, formatINR } from '../utils/format';

const COLORS = ['#0071e3', '#ff9f0a', '#30d158', '#ff453a', '#5e5ce6', '#64d2ff'];

export default function Reports() {
  const [days, setDays] = useState(15);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/insights/report', { params: { days } })
      .then(({ data }) => setReport(data))
      .catch((e) => setError(errMsg(e)));
  }, [days]);

  return (
    <div className="page">
      <h1 className="page-title">Reports</h1>
      <p className="page-sub">Pick a window and see where rupees went.</p>
      {error && <div className="error-banner">{error}</div>}

      <div className="chip-row">
        {[5, 10, 15, 30].map((d) => (
          <button
            key={d}
            type="button"
            className={`chip ${days === d ? 'active' : ''}`}
            onClick={() => setDays(d)}
          >
            {d} days
          </button>
        ))}
      </div>

      {report && (
        <>
          <section className="glass" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Total spend</p>
            <h2 style={{ margin: '0.25rem 0' }}>{formatINR(report.totalSpend)}</h2>
            {report.mostExpensiveCategory && (
              <p style={{ margin: 0 }}>
                Most expensive:{' '}
                <strong style={{ color: report.mostExpensiveCategory.color }}>
                  {report.mostExpensiveCategory.name}
                </strong>{' '}
                ({formatINR(report.mostExpensiveCategory.total)})
              </p>
            )}
          </section>

          <div className="grid-2">
            <section className="glass panel">
              <h3 style={{ marginTop: 0 }}>By category</h3>
              <div className="chart-box chart-box-lg">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={report.byCategory} dataKey="total" nameKey="name" outerRadius="70%">
                      {report.byCategory.map((c, i) => (
                        <Cell key={c.categoryId || i} fill={c.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatINR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="glass panel">
              <h3 style={{ marginTop: 0 }}>Cash vs bank spend</h3>
              <div className="chart-box chart-box-lg">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report.cashVsBank}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="40%"
                      outerRadius="70%"
                    >
                      {report.cashVsBank.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatINR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="glass panel" style={{ marginTop: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>Daily trend</h3>
            <div className="chart-box chart-box-lg">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.trend}>
                  <XAxis dataKey="label" hide />
                  <YAxis hide />
                  <Tooltip formatter={(v) => formatINR(v)} />
                  <Area type="monotone" dataKey="total" stroke="#0071e3" fill="rgba(0,113,227,0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
