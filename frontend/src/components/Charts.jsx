import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export function ConsumptionAreaChart({ data }) {
  return (
    <div className="chart-container card-solid">
      <h4>Weekly Consumption Analytics (Liters)</h4>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ 
                background: 'var(--bg-surface-solid)', 
                borderColor: 'var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '12px'
              }} 
            />
            <Area type="monotone" dataKey="qty" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorQty)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DeliveryBarChart({ data }) {
  return (
    <div className="chart-container card-solid">
      <h4>Delivery Completion Success by Driver</h4>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="driver" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ 
                background: 'var(--bg-surface-solid)', 
                borderColor: 'var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '12px'
              }} 
            />
            <Legend verticalAlign="top" height={36} fontSize={11} iconType="circle" />
            <Bar dataKey="delivered" fill="var(--color-success)" radius={[4, 4, 0, 0]} name="Delivered Stops" />
            <Bar dataKey="failed" fill="var(--color-error)" radius={[4, 4, 0, 0]} name="Failed Stops" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ClientSplitPieChart({ data }) {
  const COLORS = ['var(--color-primary)', 'var(--color-secondary)', 'var(--color-info)', 'var(--color-warning)'];

  return (
    <div className="chart-container card-solid">
      <h4>Client Segment Distribution</h4>
      <div className="chart-wrapper pie-chart-wrapper">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                background: 'var(--bg-surface-solid)', 
                borderColor: 'var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '12px'
              }} 
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pie-legend">
          {data.map((entry, index) => (
            <div key={entry.name} className="legend-item">
              <span className="legend-color" style={{ background: COLORS[index % COLORS.length] }}></span>
              <span className="legend-label">{entry.name} ({entry.value})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
