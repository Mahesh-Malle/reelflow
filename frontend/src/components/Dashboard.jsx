import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar } from 'react-chartjs-2';
import { AlertCircle } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

// ─── helpers ─────────────────────────────────────────────────────────────────

// Word-aware truncation — never cuts mid-word
const truncateLabel = (name, maxChars = 20) => {
  if (!name || name.length <= maxChars) return name;
  const words = name.split(' ');
  let result = '';
  for (const word of words) {
    const candidate = result ? `${result} ${word}` : word;
    if (candidate.length > maxChars) break;
    result = candidate;
  }
  return result ? `${result}…` : `${name.slice(0, maxChars)}…`;
};

const formatNum = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
};

const PLATFORMS = [
  { key: 'combined',  label: 'Combined'  },
  { key: 'youtube',   label: 'YouTube'   },
  { key: 'instagram', label: 'Instagram' },
];

// Returns views for the given platform mode
const getViews = (item, platform) => {
  if (platform === 'youtube')   return item.youtubeViews   || 0;
  if (platform === 'instagram') return item.instagramViews || 0;
  return item.totalViews || 0;
};

// Returns subs/followers for the given platform mode
const getSubs = (item, platform) => {
  if (platform === 'youtube')   return item.totalSubs      || 0;
  if (platform === 'instagram') return item.totalFollowers || 0;
  return (item.totalSubs || 0) + (item.totalFollowers || 0);
};

// Conversion: subs per 1 000 views for the given platform mode
const getConv = (item, platform) => {
  const v = getViews(item, platform);
  const s = getSubs(item, platform);
  return v > 0 ? (s / v) * 1000 : 0;
};

// Platform-aware video count
const getVideoCount = (item, platform) => {
  if (platform === 'youtube')   return item.youtubeVideoCount   ?? 0;
  if (platform === 'instagram') return item.instagramVideoCount ?? 0;
  return item.totalVideos ?? 0;
};

// Below this threshold, conversion is statistically unreliable
const LOW_VIEWS_THRESHOLD = 10_000;
const isLowData = (item, platform) => getViews(item, platform) < LOW_VIEWS_THRESHOLD;

// ─── PlatformToggle ───────────────────────────────────────────────────────────

const PlatformToggle = ({ value, onChange }) => (
  <div style={{
    display: 'flex',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '0.5rem',
    padding: '0.2rem',
    gap: '0.15rem',
    border: '1px solid rgba(255,255,255,0.08)',
  }}>
    {PLATFORMS.map((p) => (
      <button
        key={p.key}
        onClick={() => onChange(p.key)}
        style={{
          padding: '0.3rem 0.9rem',
          borderRadius: '0.35rem',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.82rem',
          fontWeight: value === p.key ? '600' : '400',
          background: value === p.key ? 'var(--primary)' : 'transparent',
          color: value === p.key ? 'white' : 'var(--text-muted)',
          transition: 'background 0.15s, color 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {p.label}
      </button>
    ))}
  </div>
);

// ─── InsightCard ──────────────────────────────────────────────────────────────

const InsightCard = ({ icon, label, name, metric, color }) => (
  <div style={{
    background: `${color}12`,
    border: `1px solid ${color}35`,
    borderRadius: '0.75rem',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  }}>
    <span style={{ fontSize: '1.5rem' }}>{icon}</span>
    <div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontWeight: '700', fontSize: '1rem' }}>{name || '—'}</div>
      <div style={{ fontSize: '0.83rem', color, marginTop: '0.1rem' }}>{metric}</div>
    </div>
  </div>
);

// ─── makeChartOptions ─────────────────────────────────────────────────────────

const makeChartOptions = (isConv, tooltipLabelFn, datalabels = { display: false }, tooltipTitleFn = null) => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { top: datalabels.display !== false ? 28 : 8, bottom: 4 } },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        ...(tooltipTitleFn ? { title: tooltipTitleFn } : {}),
        label: tooltipLabelFn,
      },
      backgroundColor: 'rgba(10,10,25,0.96)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      titleColor: 'white',
      bodyColor: '#94a3b8',
      padding: 12,
      bodyFont: { family: 'monospace', size: 12 },
    },
    datalabels,
  },
  scales: {
    y: {
      ticks: {
        color: '#94a3b8',
        callback: isConv ? (v) => v.toFixed(2) : (v) => formatNum(v),
      },
      grid: { color: 'rgba(255,255,255,0.05)' },
    },
    x: {
      ticks: {
        color: '#94a3b8',
        maxRotation: 40,
        minRotation: 30,
        autoSkip: false,
      },
      grid: { display: false },
    },
  },
});

// ─── AnalyticsSection ─────────────────────────────────────────────────────────

const AnalyticsSection = ({ title, data, reachColor, convColor }) => {
  const [platform, setPlatform] = useState('combined');

  if (data.length === 0) {
    return (
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <PlatformToggle value={platform} onChange={setPlatform} />
        </div>
        <div className="chart-container">
          <p style={{ color: 'var(--text-muted)' }}>No data yet</p>
        </div>
      </div>
    );
  }

  // Derived values for the active platform
  const highestReach = [...data].sort((a, b) => getViews(b, platform) - getViews(a, platform))[0];
  // Best conversion excludes low-data items so the insight card is trustworthy
  const reliableItems = data.filter((d) => !isLowData(d, platform));
  const bestConv = reliableItems.length > 0
    ? [...reliableItems].sort((a, b) => getConv(b, platform) - getConv(a, platform))[0]
    : null;

  const viewsLabel = platform === 'youtube' ? 'YouTube Views' : platform === 'instagram' ? 'Instagram Views' : 'Total Views';
  const subsLabel  = platform === 'youtube' ? 'YT Subscribers' : platform === 'instagram' ? 'IG Followers' : 'Subs + Followers';

  const truncatedLabels = data.map((d) => truncateLabel(d.name));

  const tooltipTitleFn = (ctxArr) => {
    const item = data[ctxArr[0]?.dataIndex];
    return item?.name || '';
  };

  const reachChartData = {
    labels: truncatedLabels,
    datasets: [{
      label: viewsLabel,
      data: data.map((d) => getViews(d, platform)),
      backgroundColor: `${reachColor}90`,
      borderColor: reachColor,
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const convChartData = {
    labels: truncatedLabels,
    datasets: [{
      label: `${subsLabel} per 1K Views`,
      // Low-data bars rendered as null so they're skipped entirely
      data: data.map((d) => isLowData(d, platform) ? null : parseFloat(getConv(d, platform).toFixed(4))),
      backgroundColor: `${convColor}90`,
      borderColor: convColor,
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const reachTooltipFn = (ctx) => {
    const item = data[ctx.dataIndex];
    if (!item) return '';
    const n = getVideoCount(item, platform);
    return [
      getViews(item, platform).toLocaleString(),
      `${n} video${n !== 1 ? 's' : ''}`,
    ];
  };

  const convTooltipFn = (ctx) => {
    const item = data[ctx.dataIndex];
    if (!item) return '';
    if (isLowData(item, platform)) {
      return [
        getViews(item, platform).toLocaleString(),
        '⚠ Low data (< 10K views)',
      ];
    }
    return getConv(item, platform).toFixed(2);
  };

  const reachDatalabels = {
    anchor: 'end',
    align: 'end',
    offset: 2,
    formatter: (_, ctx) => {
      const n = getVideoCount(data[ctx.dataIndex], platform);
      return n != null ? `(${n})` : '';
    },
    color: '#64748b',
    font: { size: 11, weight: '500' },
    clip: false,
  };

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Header row: title + toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <PlatformToggle value={platform} onChange={setPlatform} />
      </div>

      {/* Insight cards */}
      <div className="responsive-grid" style={{ marginBottom: '1.25rem' }}>
        <InsightCard
          icon="🔥"
          label={`Highest Reach · ${PLATFORMS.find(p => p.key === platform).label}`}
          name={highestReach?.name}
          metric={`${formatNum(getViews(highestReach, platform))} views`}
          color={reachColor}
        />
        <InsightCard
          icon="🚀"
          label={`Best Conversion · ${PLATFORMS.find(p => p.key === platform).label}`}
          name={bestConv?.name ?? 'Not enough data'}
          metric={bestConv ? `${getConv(bestConv, platform).toFixed(2)} subs per 1K views` : '⚠ All items below 10K views'}
          color={bestConv ? convColor : '#64748b'}
        />
      </div>

      {/* Charts */}
      <div className="responsive-grid">
        <div className="chart-container">
          <div style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Reach</span>
            <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{viewsLabel}</span>
          </div>
          <div style={{ position: 'relative', height: '260px' }}>
            <Bar data={reachChartData} options={makeChartOptions(false, reachTooltipFn, reachDatalabels, tooltipTitleFn)} />
          </div>
        </div>
        <div className="chart-container">
          <div style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Conversion Efficiency</span>
            <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{subsLabel} per 1,000 Views</span>
          </div>
          <div style={{ position: 'relative', height: '260px' }}>
            <Bar data={convChartData} options={makeChartOptions(true, convTooltipFn, { display: false }, tooltipTitleFn)} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { activeChannel, API_URL } = useApp();
  const [overview, setOverview]               = useState({ totalViews: 0, totalSubs: 0, totalFollowers: 0, videoCount: 0 });
  const [catAnalytics, setCatAnalytics]       = useState([]);
  const [contentTypeAnalytics, setContentTypeAnalytics] = useState([]);
  const [hookTypeAnalytics, setHookTypeAnalytics]       = useState([]);
  const [loading, setLoading]                 = useState(true);

  useEffect(() => {
    if (activeChannel) fetchData();
  }, [activeChannel]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [overRes, catRes, ctRes, htRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/overview?channelId=${activeChannel._id}`),
        axios.get(`${API_URL}/analytics/categories?channelId=${activeChannel._id}`),
        axios.get(`${API_URL}/analytics/content-types?channelId=${activeChannel._id}`),
        axios.get(`${API_URL}/analytics/hook-types?channelId=${activeChannel._id}`),
      ]);
      setOverview(overRes.data);
      setCatAnalytics(catRes.data);
      setContentTypeAnalytics(ctRes.data);
      setHookTypeAnalytics(htRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '5rem' }}>
      <div className="stat-card">
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Fetching your analytics...</p>
      </div>
    </div>
  );

  if (!overview || overview.videoCount === 0) return (
    <div className="dashboard">
      <div className="insight-banner" style={{ background: 'var(--bg-card)', border: '1px dashed var(--primary)' }}>
        <AlertCircle size={24} color="var(--primary)" />
        <div>
          <strong>No Data to Show Yet!</strong> Get started by going to the <strong>Content Planner</strong> to add your first content idea or posted video.
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total Views</div><div className="stat-value">0</div></div>
        <div className="stat-card"><div className="stat-label">Combined Engagement</div><div className="stat-value">0</div></div>
        <div className="stat-card"><div className="stat-label">Posted Content</div><div className="stat-value">0</div></div>
      </div>
    </div>
  );

  const globalBestConv = [...catAnalytics].sort(
    (a, b) => getConv(b, 'combined') - getConv(a, 'combined')
  )[0];

  const overallConv = overview.totalViews > 0
    ? (((overview.totalSubs + overview.totalFollowers) / overview.totalViews) * 1000).toFixed(2)
    : '0.00';

  return (
    <div className="dashboard">
      {/* Global insight banner */}
      {globalBestConv && (
        <div className="insight-banner">
          <span style={{ fontSize: '1.4rem' }}>🚀</span>
          <div>
            <strong>Top Insight:</strong> Your <strong>{globalBestConv.name}</strong> category has the highest combined conversion — {getConv(globalBestConv, 'combined').toFixed(2)} subs per 1,000 views. Double down on it!
          </div>
        </div>
      )}

      {/* Overview stats */}
      <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Views</div>
          <div className="stat-value">{formatNum(overview.totalViews)}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{overview.totalViews.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">YouTube Subs + Instagram Followers</div>
          <div className="stat-value">{(overview.totalSubs + overview.totalFollowers).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Posted Content</div>
          <div className="stat-value">{overview.videoCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overall Conversion</div>
          <div className="stat-value">{overallConv}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>subs per 1K views</div>
        </div>
      </div>

      <AnalyticsSection
        title="Content Category Performance"
        data={catAnalytics}
        reachColor="#6366f1"
        convColor="#ec4899"
      />
      <AnalyticsSection
        title="Content Type Performance"
        data={contentTypeAnalytics}
        reachColor="#22c55e"
        convColor="#a855f7"
      />
      <AnalyticsSection
        title="Hook Type Performance"
        data={hookTypeAnalytics}
        reachColor="#f97316"
        convColor="#0ea5e9"
      />
    </div>
  );
};

export default Dashboard;
