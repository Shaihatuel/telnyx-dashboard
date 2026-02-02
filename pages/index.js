import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Head from 'next/head';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState('jan2026');
  const [customStart, setCustomStart] = useState('2025-11-01');
  const [customEnd, setCustomEnd] = useState('2026-02-01');
  const [activeTab, setActiveTab] = useState('summary');

  const dateRanges = {
    nov2025: { start: '2025-11-01T00:00:00-05:00', end: '2025-12-01T00:00:00-05:00' },
    dec2025: { start: '2025-12-01T00:00:00-05:00', end: '2026-01-01T00:00:00-05:00' },
    jan2026: { start: '2026-01-01T00:00:00-05:00', end: '2026-02-01T00:00:00-05:00' },
    feb2026: { start: '2026-02-01T00:00:00-05:00', end: '2026-03-01T00:00:00-05:00' },
    mar2026: { start: '2026-03-01T00:00:00-05:00', end: '2026-04-01T00:00:00-04:00' },
    apr2026: { start: '2026-04-01T00:00:00-04:00', end: '2026-05-01T00:00:00-04:00' },
    may2026: { start: '2026-05-01T00:00:00-04:00', end: '2026-06-01T00:00:00-04:00' },
    jun2026: { start: '2026-06-01T00:00:00-04:00', end: '2026-07-01T00:00:00-04:00' },
    jul2026: { start: '2026-07-01T00:00:00-04:00', end: '2026-08-01T00:00:00-04:00' },
    aug2026: { start: '2026-08-01T00:00:00-04:00', end: '2026-09-01T00:00:00-04:00' },
    sep2026: { start: '2026-09-01T00:00:00-04:00', end: '2026-10-01T00:00:00-04:00' },
    oct2026: { start: '2026-10-01T00:00:00-04:00', end: '2026-11-01T00:00:00-04:00' },
    nov2026: { start: '2026-11-01T00:00:00-05:00', end: '2026-12-01T00:00:00-05:00' },
    dec2026: { start: '2026-12-01T00:00:00-05:00', end: '2027-01-01T00:00:00-05:00' },
    custom: { start: '', end: '' }
  };

  const getQuickDates = (type) => {
    const now = new Date();
    if (type === 'today') {
      const today = now.toISOString().split('T')[0];
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { start: today + 'T00:00:00-05:00', end: tomorrow.toISOString().split('T')[0] + 'T00:00:00-05:00' };
    } else if (type === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const today = now.toISOString().split('T')[0];
      return { start: yesterday.toISOString().split('T')[0] + 'T00:00:00-05:00', end: today + 'T00:00:00-05:00' };
    } else if (type === 'last7') {
      const end = new Date(now); end.setDate(end.getDate() + 1);
      const start = new Date(now); start.setDate(start.getDate() - 6);
      return { start: start.toISOString().split('T')[0] + 'T00:00:00-05:00', end: end.toISOString().split('T')[0] + 'T00:00:00-05:00' };
    } else if (type === 'thisMonth') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 1);
      return { start: firstDay.toISOString().split('T')[0] + 'T00:00:00-05:00', end: lastDay.toISOString().split('T')[0] + 'T00:00:00-05:00' };
    }
  };

  const fetchDataWithDates = async (startDate, endDate) => {
    setLoading(true); setError(null); setInitialLoad(false);
    try {
      const res = await fetch('/api/telnyx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate, endDate }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'API Error: ' + res.status);
      if (!result.data || !result.data.length) { setData(null); setError('No data found for the selected period.'); }
      else setData(processData(result.data));
    } catch (err) { setError(err.message); setData(null); }
    finally { setLoading(false); }
  };

  const handleToday = () => { const dates = getQuickDates('today'); fetchDataWithDates(dates.start, dates.end); };
  const handleYesterday = () => { const dates = getQuickDates('yesterday'); fetchDataWithDates(dates.start, dates.end); };
  const handleLast7Days = () => { const dates = getQuickDates('last7'); fetchDataWithDates(dates.start, dates.end); };
  const handleThisMonth = () => { const dates = getQuickDates('thisMonth'); fetchDataWithDates(dates.start, dates.end); };

  const fetchData = async () => {
    const startDate = dateRange === 'custom' ? customStart + 'T00:00:00-05:00' : dateRanges[dateRange].start;
    const endDate = dateRange === 'custom' ? customEnd + 'T00:00:00-05:00' : dateRanges[dateRange].end;
    await fetchDataWithDates(startDate, endDate);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr || dateStr === 'Unknown') return dateStr;
    try {
      const cleanDate = dateStr.split('T')[0];
      const parts = cleanDate.split('-');
      if (parts.length !== 3) return dateStr;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
      const date = new Date(year, month, day);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[date.getDay()] + ' ' + String(month + 1).padStart(2, '0') + '/' + String(day).padStart(2, '0') + '/' + year;
    } catch (e) { return dateStr; }
  };

  const processData = (rawData) => {
    const dailyMap = {}, carrierMap = {}, directionMap = {};
    let totalMessages = 0, totalCost = 0, totalParts = 0, totalDelivered = 0, totalFailed = 0;
    rawData.forEach(item => {
      let rawDate = item.date || 'Unknown';
      if (rawDate && rawDate.includes('T')) rawDate = rawDate.split('T')[0];
      const date = rawDate;
      const carrier = item.normalized_carrier || 'Unknown';
      const direction = item.direction || 'Unknown';
      const status = item.status_v2 || item.status || '';
      const count = Number(item.count) || 0;
      const cost = Number(item.cost) || 0;
      const parts = Number(item.parts) || 0;
      if (status === 'delivered' || status === 'sent') totalDelivered += count;
      else if (status === 'failed' || status === 'delivery_failed') totalFailed += count;
      if (!dailyMap[date]) dailyMap[date] = { date, messages: 0, cost: 0, parts: 0, inbound: 0, outbound: 0 };
      dailyMap[date].messages += count; dailyMap[date].cost += cost; dailyMap[date].parts += parts;
      if (direction === 'inbound') dailyMap[date].inbound += count; else if (direction === 'outbound') dailyMap[date].outbound += count;
      if (!carrierMap[carrier]) carrierMap[carrier] = { carrier, messages: 0, cost: 0, parts: 0, inbound: 0, outbound: 0 };
      carrierMap[carrier].messages += count; carrierMap[carrier].cost += cost; carrierMap[carrier].parts += parts;
      if (direction === 'inbound') carrierMap[carrier].inbound += count; else if (direction === 'outbound') carrierMap[carrier].outbound += count;
      if (!directionMap[direction]) directionMap[direction] = { direction, messages: 0, cost: 0, parts: 0 };
      directionMap[direction].messages += count; directionMap[direction].cost += cost; directionMap[direction].parts += parts;
      totalMessages += count; totalCost += cost; totalParts += parts;
    });
    const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const carrierData = Object.values(carrierMap).sort((a, b) => b.cost - a.cost);
    const directionData = Object.values(directionMap);
    const numDays = dailyData.length || 1;
    const totalInbound = directionData.find(d => d.direction === 'inbound')?.messages || 0;
    const totalOutbound = directionData.find(d => d.direction === 'outbound')?.messages || 0;
    const deliveryRate = (totalDelivered + totalFailed) > 0 ? (totalDelivered / (totalDelivered + totalFailed)) * 100 : null;
    return { daily: dailyData, carriers: carrierData, directions: directionData, summary: { totalMessages, totalCost, totalParts, totalInbound, totalOutbound, deliveryRate, avgMessagesPerDay: totalMessages / numDays, avgCostPerDay: totalCost / numDays, avgCostPerMessage: totalMessages > 0 ? totalCost / totalMessages : 0, avgCostPerSegment: totalParts > 0 ? totalCost / totalParts : 0, numDays } };
  };

  const formatCurrency = (v) => '$' + Number(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatNumber = (v) => Number(v).toLocaleString();
  
  const MetricCard = ({ title, value, subtitle, color = "blue" }) => {
    const colors = { blue: 'text-blue-400', green: 'text-green-400', orange: 'text-orange-400', indigo: 'text-indigo-400', purple: 'text-purple-400', cyan: 'text-cyan-400' };
    return (<div className="bg-[#1E3A5F] rounded-xl shadow-lg border border-[#FF8C00]/20 p-5 hover:border-[#FF8C00]/50 transition-all"><h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</h3><p className={'mt-2 text-2xl font-bold ' + (colors[color] || 'text-white')}>{value}</p>{subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}</div>);
  };

  const LoadingSpinner = () => (<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>);

  return (
    <React.Fragment>
      <Head><title>AllTalk Pro - Messaging Analytics</title></Head>
      <div className="min-h-screen" style={{ backgroundColor: '#0F1A2E' }}>
        <div className="bg-gradient-to-r from-[#1E3A5F] via-[#2D4A6F] to-[#1E3A5F] text-white border-b border-[#FF8C00]/30">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div><h1 className="text-2xl font-bold text-[#FF8C00]">Messaging Analytics</h1><p className="text-sm text-gray-300">Real-time messaging metrics and cost insights</p></div>
            <img src="/logo.png" alt="AllTalk Pro" className="h-14 w-auto" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-[#1E3A5F] rounded-xl shadow-lg border border-[#FF8C00]/20 p-5 mb-6">
            <div className="flex flex-wrap items-end gap-4">
              <button onClick={handleToday} disabled={loading} className="bg-[#4A90D9] text-white px-5 py-2.5 rounded-lg hover:bg-[#3A7BC8] disabled:bg-gray-600 font-semibold transition-colors shadow flex items-center gap-2">
                {loading && <LoadingSpinner />} Today
              </button>
              <button onClick={handleYesterday} disabled={loading} className="bg-[#4A90D9] text-white px-5 py-2.5 rounded-lg hover:bg-[#3A7BC8] disabled:bg-gray-600 font-semibold transition-colors shadow flex items-center gap-2">
                {loading && <LoadingSpinner />} Yesterday
              </button>
              <button onClick={handleLast7Days} disabled={loading} className="bg-[#4A90D9] text-white px-5 py-2.5 rounded-lg hover:bg-[#3A7BC8] disabled:bg-gray-600 font-semibold transition-colors shadow flex items-center gap-2">
                {loading && <LoadingSpinner />} Last 7 Days
              </button>
              <button onClick={handleThisMonth} disabled={loading} className="bg-[#4A90D9] text-white px-5 py-2.5 rounded-lg hover:bg-[#3A7BC8] disabled:bg-gray-600 font-semibold transition-colors shadow flex items-center gap-2">
                {loading && <LoadingSpinner />} This Month
              </button>
              <div className="flex items-center gap-2">
                <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="bg-[#0F1A2E] border border-[#FF8C00]/30 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[#FF8C00] min-w-[180px]">
                  <option value="nov2025">November 2025</option><option value="dec2025">December 2025</option><option value="jan2026">January 2026</option><option value="feb2026">February 2026</option><option value="mar2026">March 2026</option><option value="apr2026">April 2026</option><option value="may2026">May 2026</option><option value="jun2026">June 2026</option><option value="jul2026">July 2026</option><option value="aug2026">August 2026</option><option value="sep2026">September 2026</option><option value="oct2026">October 2026</option><option value="nov2026">November 2026</option><option value="dec2026">December 2026</option><option value="custom">Custom Range</option>
                </select>
                {dateRange === 'custom' && (<React.Fragment><input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-[#0F1A2E] border border-[#FF8C00]/30 rounded-lg px-3 py-2.5 text-white" /><input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-[#0F1A2E] border border-[#FF8C00]/30 rounded-lg px-3 py-2.5 text-white" /></React.Fragment>)}
                <button onClick={fetchData} disabled={loading} className="bg-[#FF8C00] text-white px-6 py-2.5 rounded-lg hover:bg-[#E67E00] disabled:bg-gray-600 font-semibold flex items-center gap-2 shadow-lg">
                  {loading && <LoadingSpinner />} {loading ? 'Loading...' : 'Request Data'}
                </button>
              </div>
            </div>
          </div>
          {error && <div className="bg-red-900/50 border border-red-500 text-red-200 px-5 py-4 rounded-xl mb-6"><strong>Error:</strong> {error}</div>}
          {loading && <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8C00]"></div></div>}
          {initialLoad && !loading && <div className="text-center py-20"><svg className="mx-auto h-16 w-16 text-[#FF8C00]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><h3 className="mt-4 text-lg font-medium text-white">Ready to Load Analytics</h3><p className="mt-2 text-gray-400">Select a time period and click a button to view messaging metrics.</p></div>}
          {data && !loading && (
            <React.Fragment>
              <div className="border-b border-[#FF8C00]/30 mb-6"><nav className="flex space-x-8">
                {['summary', 'daily', 'carriers', 'direction'].map((tab) => (<button key={tab} onClick={() => setActiveTab(tab)} className={'py-3 px-1 border-b-2 font-medium text-sm capitalize ' + (activeTab === tab ? 'border-[#FF8C00] text-[#FF8C00]' : 'border-transparent text-gray-400 hover:text-white')}>{tab === 'direction' ? 'Inbound/Outbound' : tab}</button>))}
              </nav></div>
              {activeTab === 'summary' && (<div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Total Outbound" value={formatNumber(data.summary.totalOutbound)} subtitle="Messages sent" color="orange" />
                  <MetricCard title="Total Inbound" value={formatNumber(data.summary.totalInbound)} subtitle="Messages received" color="blue" />
                  <MetricCard title="Total Segments" value={formatNumber(data.summary.totalParts)} subtitle="SMS parts" color="cyan" />
                  <MetricCard title="Total Cost" value={formatCurrency(data.summary.totalCost)} color="green" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Delivery Rate" value={data.summary.deliveryRate !== null ? data.summary.deliveryRate.toFixed(1) + '%' : 'N/A'} subtitle="Successfully delivered" color="green" />
                  <MetricCard title="Avg Messages/Day" value={formatNumber(Math.round(data.summary.avgMessagesPerDay))} subtitle={'Over ' + data.summary.numDays + ' days'} color="indigo" />
                  <MetricCard title="Avg Cost/Message" value={'$' + data.summary.avgCostPerMessage.toFixed(4)} color="purple" />
                  <MetricCard title="Avg Cost/Segment" value={'$' + data.summary.avgCostPerSegment.toFixed(4)} color="orange" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[#1E3A5F] rounded-xl shadow-lg border border-[#FF8C00]/20 p-6"><h3 className="text-lg font-semibold text-white mb-4">Messages Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}><LineChart data={data.daily}><CartesianGrid strokeDasharray="3 3" stroke="#2D4A6F" /><XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} angle={-45} textAnchor="end" height={60} tickFormatter={formatDateDisplay} /><YAxis tick={{ fill: '#9CA3AF' }} /><Tooltip formatter={(v) => formatNumber(v)} contentStyle={{ backgroundColor: '#1E3A5F', border: '1px solid #FF8C00', borderRadius: '8px' }} labelFormatter={formatDateDisplay} /><Legend /><Line type="monotone" dataKey="outbound" stroke="#FF8C00" strokeWidth={2} dot={false} name="Outbound" /><Line type="monotone" dataKey="inbound" stroke="#4A90D9" strokeWidth={2} dot={false} name="Inbound" /></LineChart></ResponsiveContainer>
                  </div>
                  <div className="bg-[#1E3A5F] rounded-xl shadow-lg border border-[#FF8C00]/20 p-6"><h3 className="text-lg font-semibold text-white mb-4">Cost by Carrier</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.carriers.slice(0, 8)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#2D4A6F" />
                        <XAxis type="number" tick={{ fill: '#9CA3AF' }} tickFormatter={(v) => '$' + v.toFixed(0)} />
                        <YAxis dataKey="carrier" type="category" width={120} tick={{ fill: '#FFFFFF', fontSize: 11 }} />
                        <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: '#1E3A5F', border: '1px solid #FF8C00', borderRadius: '8px' }} />
                        <Bar dataKey="cost" fill="#FF8C00" name="Cost" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>)}
              {activeTab === 'daily' && (<div className="space-y-6">
                <div className="bg-[#1E3A5F] rounded-xl shadow-lg border border-[#FF8C00]/20 p-6"><h3 className="text-lg font-semibold text-white mb-4">Daily Messages and Cost</h3>
                  <ResponsiveContainer width="100%" height={400}><BarChart data={data.daily}><CartesianGrid strokeDasharray="3 3" stroke="#2D4A6F" /><XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} angle={-45} textAnchor="end" height={80} tickFormatter={formatDateDisplay} /><YAxis yAxisId="left" tick={{ fill: '#9CA3AF' }} /><YAxis yAxisId="right" orientation="right" tick={{ fill: '#9CA3AF' }} /><Tooltip formatter={(v, n) => n === 'Cost ($)' ? formatCurrency(v) : formatNumber(v)} contentStyle={{ backgroundColor: '#1E3A5F', border: '1px solid #FF8C00', borderRadius: '8px' }} labelFormatter={formatDateDisplay} /><Legend /><Bar yAxisId="left" dataKey="outbound" fill="#FF8C00" name="Outbound" radius={[4, 4, 0, 0]} /><Bar yAxisId="left" dataKey="inbound" fill="#4A90D9" name="Inbound" radius={[4, 4, 0, 0]} /><Bar yAxisId="right" dataKey="cost" fill="#00C49F" name="Cost ($)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                </div>
                <div className="bg-[#1E3A5F] rounded-xl shadow-lg border border-[#FF8C00]/20 overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-[#2D4A6F]"><thead className="bg-[#0F1A2E]"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-[#FF8C00] uppercase">Date</th><th className="px-6 py-4 text-right text-xs font-semibold text-[#FF8C00] uppercase">Outbound</th><th className="px-6 py-4 text-right text-xs font-semibold text-[#FF8C00] uppercase">Inbound</th><th className="px-6 py-4 text-right text-xs font-semibold text-[#FF8C00] uppercase">Segments</th><th className="px-6 py-4 text-right text-xs font-semibold text-[#FF8C00] uppercase">Cost</th></tr></thead><tbody className="divide-y divide-[#2D4A6F]">{data.daily.map((r, i) => (<tr key={i} className="hover:bg-[#2D4A6F]/50"><td className="px-6 py-4 text-sm font-medium text-white">{formatDateDisplay(r.date)}</td><td className="px-6 py-4 text-sm text-gray-300 text-right">{formatNumber(r.outbound)}</td><td className="px-6 py-4 text-sm text-gray-300 text-right">{formatNumber(r.inbound)}</td><td className="px-6 py-4 text-sm text-gray-300 text-right">{formatNumber(r.parts)}</td><td className="px-6 py-4 text-sm text-gray-300 text-right">{formatCurrency(r.cost)}</td></tr>))}</tbody><tfoot className="bg-[#0F1A2E]"><tr className="font-semibold"><td className="px-6 py-4 text-sm text-[#FF8C00]">TOTAL</td><td className="px-6 py-4 text-sm text-white text-right">{formatNumber(data.summary.totalOutbound)}</td><td className="px-6 py-4 text-sm text-white text-right">{formatNumber(data.summary.totalInbound)}</td><td className="px-6 py-4 text-sm text-white text-right">{formatNumber(data.summary.totalParts)}</td><td className="px-6 py-4 text-sm text-white text-right">{formatCurrency(data.summary.totalCost)}</td></tr></tfoot></table></div></div>
              </div>)}
              {activeTab === 'carriers' && (<div className="space-y-6">
                <div className="bg-[#1E3A5F] rounded-xl shadow-lg border border-[#FF8C00]/20 p-6"><h3 className="text-lg font-semibold text-white mb-4">Messages by Carrier</h3>
                  <ResponsiveContainer width="100%" height={Math.max(400, data.carriers.length * 40)}><BarChart data={data.carriers} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#2D4A6F" /><XAxis type="number" tick={{ fill: '#9CA3AF' }} /><YAxis dataKey="carrier" type="category" width={150} tick={{ fontSize: 11, fill: '#FFFFFF' }} /><Tooltip formatter={(v, n) => n === 'Cost ($)' ? formatCurrency(v) : formatNumber(v)} contentStyle={{ backgroundColor: '#1E3A5F', border: '1px solid #FF8C00', borderRadius: '8px' }} /><Legend /><Bar dataKey="outbound" fill="#FF8C00" name="Outbound" radius={[0, 4, 4, 0]} /><Bar dataKey="inbound" fill="#4A90D9" name="Inbound" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>
                </div>
                <div className="bg-[#1E3A5F] rounded-xl shadow-lg border border-[#FF8C00]/20 overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-[#2D4A6F]"><thead className="bg-[#0F1A2E]"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-[#FF8C00] uppercase">Carrier</th><th className="px-6 py-4 text-right text-xs font-semibold text-[#FF8C00] uppercase">Outbound</th><th className="px-6 py-4 text-right text-xs font-semibold text-[#FF8C00] uppercase">Inbound</th><th className="px-6 py-4 text-right text-xs font-semibold text-[#FF8C00] uppercase">Segments</th><th className="px-6 py-4 text-right text-xs font-semibold text-[#FF8C00] uppercase">Cost</th><th className="px-6 py-4 text-right text-xs font-semibold text-[#FF8C00] uppercase">Avg/Msg</th></tr></thead><tbody className="divide-y divide-[#2D4A6F]">{data.carriers.map((r, i) => (<tr key={i} className="hover:bg-[#2D4A6F]/50"><td className="px-6 py-4 text-sm font-medium text-white">{r.carrier}</td><td className="px-6 py-4 text-sm text-gray-300 text-right">{formatNumber(r.outbound)}</td><td className="px-6 py-4 text-sm text-gray-300 text-right">{formatNumber(r.inbound)}</td><td className="px-6 py-4 text-sm text-gray-300 text-right">{formatNumber(r.parts)}</td><td className="px-6 py-4 text-sm text-gray-300 text-right">{formatCurrency(r.cost)}</td><td className="px-6 py-4 text-sm text-gray-300 text-right">{'$' + (r.messages > 0 ? (r.cost / r.messages).toFixed(4) : '0.0000')}</td></tr>))}</tbody></table></div></div>
              </div>)}
              {activeTab === 'direction' && (<div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{data.directions.map((d, i) => (<div key={i} className="bg-[#1E3A5F] rounded-xl shadow-lg border border-[#FF8C00]/20 p-6"><div className="flex items-center gap-3 mb-4"><div className={'w-4 h-4 rounded-full ' + (d.direction === 'outbound' ? 'bg-[#FF8C00]' : 'bg-[#4A90D9]')}></div><h3 className="text-lg font-semibold text-white capitalize">{d.direction} Messages</h3></div><div className="space-y-3"><div className="flex justify-between py-2 border-b border-[#2D4A6F]"><span className="text-gray-400">Messages:</span><span className="font-semibold text-white">{formatNumber(d.messages)}</span></div><div className="flex justify-between py-2 border-b border-[#2D4A6F]"><span className="text-gray-400">Segments:</span><span className="font-semibold text-white">{formatNumber(d.parts)}</span></div><div className="flex justify-between py-2 border-b border-[#2D4A6F]"><span className="text-gray-400">Total Cost:</span><span className="font-semibold text-white">{formatCurrency(d.cost)}</span></div><div className="flex justify-between py-2 border-b border-[#2D4A6F]"><span className="text-gray-400">Avg Cost/Message:</span><span className="font-semibold text-white">{'$' + (d.messages > 0 ? (d.cost / d.messages).toFixed(4) : '0.0000')}</span></div><div className="flex justify-between py-2"><span className="text-gray-400">Avg Cost/Segment:</span><span className="font-semibold text-white">{'$' + (d.parts > 0 ? (d.cost / d.parts).toFixed(4) : '0.0000')}</span></div></div></div>))}</div>
                <div className="bg-[#1E3A5F] rounded-xl shadow-lg border border-[#FF8C00]/20 p-6"><h3 className="text-lg font-semibold text-white mb-4">Direction Comparison</h3><ResponsiveContainer width="100%" height={300}><BarChart data={data.directions}><CartesianGrid strokeDasharray="3 3" stroke="#2D4A6F" /><XAxis dataKey="direction" tick={{ fill: '#9CA3AF' }} /><YAxis yAxisId="left" tick={{ fill: '#9CA3AF' }} /><YAxis yAxisId="right" orientation="right" tick={{ fill: '#9CA3AF' }} /><Tooltip formatter={(v, n) => n === 'Cost ($)' ? formatCurrency(v) : formatNumber(v)} contentStyle={{ backgroundColor: '#1E3A5F', border: '1px solid #FF8C00', borderRadius: '8px' }} /><Legend /><Bar yAxisId="left" dataKey="messages" fill="#FF8C00" name="Messages" radius={[4, 4, 0, 0]} /><Bar yAxisId="right" dataKey="cost" fill="#00C49F" name="Cost ($)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
              </div>)}
            </React.Fragment>
          )}
        </div>
        <div className="border-t border-[#FF8C00]/20 mt-12"><div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">AllTalk Pro Messaging Analytics Dashboard</div></div>
      </div>
    </React.Fragment>
  );
}
