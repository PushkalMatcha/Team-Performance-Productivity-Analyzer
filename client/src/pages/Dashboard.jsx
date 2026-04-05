import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTeamAnalytics, getBottlenecks, getTeamAiInsights, createAuthenticatedSocket } from '../services/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  HiOutlineLightningBolt, HiOutlineCode, HiOutlineCheckCircle,
  HiOutlineUsers, HiOutlineTrendingUp, HiOutlineClock,
  HiOutlineExclamation, HiOutlineTicket
} from 'react-icons/hi';

const CHART_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

function MetricCard({ icon: Icon, label, value, change, color, delay }) {
  return (
    <div className={`glass-card p-6 hover:border-${color || 'primary'}/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl animate-fade-in-up-delay-${delay || 1}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-secondary text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-text-primary mt-2">{value}</p>
          {change && (
            <p className={`text-xs mt-2 flex items-center gap-1 ${change > 0 ? 'text-success' : 'text-danger'}`}>
              <HiOutlineTrendingUp className={change < 0 ? 'rotate-180' : ''} />
              {Math.abs(change)}% from last week
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-${color || 'primary'}/10 flex items-center justify-center`}>
          <Icon className={`text-2xl text-${color || 'primary'}`} />
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert }) {
  const severityColors = {
    high: 'border-danger/30 bg-danger/5',
    medium: 'border-warning/30 bg-warning/5',
    low: 'border-success/30 bg-success/5',
  };
  const iconColors = {
    high: 'text-danger',
    medium: 'text-warning',
    low: 'text-success',
  };

  return (
    <div className={`p-4 rounded-xl border ${severityColors[alert.severity]} transition-all duration-200 hover:scale-[1.01]`}>
      <div className="flex items-start gap-3">
        <HiOutlineExclamation className={`text-xl mt-0.5 ${iconColors[alert.severity]}`} />
        <div>
          <p className="text-sm font-semibold text-text-primary">{alert.title}</p>
          <p className="text-xs text-text-secondary mt-1">{alert.description}</p>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ insight }) {
  return (
    <div className={`p-4 rounded-xl bg-surface-lighter/50 border-l-4 border-l-primary hover:bg-surface-lighter transition-all duration-200`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">✨</span>
        <div className="flex-1">
          <p className="text-sm text-text-primary leading-relaxed">{insight.text}</p>
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-3 !rounded-lg text-sm">
      <p className="text-text-secondary font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-text-primary" style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [bottlenecks, setBottlenecks] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, bottlenecksRes, insightsRes] = await Promise.all([
        getTeamAnalytics(),
        getBottlenecks(),
        getTeamAiInsights().catch(() => ({ data: { insights: [] } })),
      ]);
      setAnalytics(analyticsRes.data);
      setBottlenecks(bottlenecksRes.data);
      setInsights(insightsRes.data?.insights || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    let socket;
    try {
      socket = createAuthenticatedSocket();
    } catch {
      return undefined;
    }
    
    socket.on('DATA_UPDATED', (payload) => {
      console.log('Real-time update received:', payload);
      fetchData(); // Refetch data transparently whenever server emits a change
    });

    return () => {
      socket?.disconnect();
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-text-secondary mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-text-secondary">Failed to load dashboard data. Ensure backend is running.</p>
      </div>
    );
  }

  const { summary, weeklyActivity, mostActiveDev, workloadDistribution } = analytics;

  const weeklyChartData = weeklyActivity.labels.map((label, i) => ({
    name: label,
    Commits: weeklyActivity.commits[i],
    Tasks: weeklyActivity.tasks[i],
    PRs: weeklyActivity.prs[i],
  }));

  const taskStatusData = [
    { name: 'Completed', value: summary.completedTasks, color: '#10b981' },
    { name: 'In Progress', value: summary.inProgressTasks, color: '#6366f1' },
    { name: 'Pending', value: summary.pendingTasks, color: '#f59e0b' },
    { name: 'Overdue', value: summary.overdueTasks, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome back, <span className="gradient-text">{user?.name || 'User'}</span>
        </h1>
        <p className="text-text-secondary mt-1">Here&apos;s your team&apos;s performance overview</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard icon={HiOutlineCode} label="Total Commits" value={summary.totalCommits.toLocaleString()} change={12} color="primary" delay={1} />
        <MetricCard icon={HiOutlineCheckCircle} label="Tasks Completed" value={summary.totalTasksCompleted} change={8} color="success" delay={2} />
        <MetricCard icon={HiOutlineTicket} label="Bugs Resolved" value={summary.totalBugsFixed} change={-3} color="warning" delay={3} />
        <MetricCard icon={HiOutlineUsers} label="Team Score" value={`${summary.avgProductivity}%`} change={5} color="accent" delay={4} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Activity Chart */}
        <div className="lg:col-span-2 glass-card p-6 animate-fade-in-up-delay-2">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Weekly Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={weeklyChartData}>
              <defs>
                <linearGradient id="gradCommits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPRs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="Commits" stroke="#6366f1" fill="url(#gradCommits)" strokeWidth={2} />
              <Area type="monotone" dataKey="Tasks" stroke="#10b981" fill="url(#gradTasks)" strokeWidth={2} />
              <Area type="monotone" dataKey="PRs" stroke="#06b6d4" fill="url(#gradPRs)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Task Status Pie */}
        <div className="glass-card p-6 animate-fade-in-up-delay-3">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Task Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={taskStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {taskStatusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span className="text-text-secondary text-xs">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workload Distribution + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Workload Bar Chart */}
        <div className="lg:col-span-2 glass-card p-6 animate-fade-in-up-delay-2">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Workload Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={workloadDistribution} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="tasksAssigned" name="Assigned" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="tasksCompleted" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="commits" name="Commits" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div className="space-y-5">
          {/* Most Active Dev */}
          {mostActiveDev && (
            <div className="glass-card p-5 animate-fade-in-up-delay-3">
              <h3 className="text-sm font-semibold text-text-secondary mb-3">🏆 Most Active Developer</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                  {mostActiveDev.name.charAt(0)}
                </div>
                <div>
                  <p className="text-text-primary font-semibold">{mostActiveDev.name}</p>
                  <p className="text-xs text-text-secondary">{mostActiveDev.commits} commits · Score: {mostActiveDev.productivityScore}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Team Stats */}
          <div className="glass-card p-5 animate-fade-in-up-delay-4">
            <h3 className="text-sm font-semibold text-text-secondary mb-3">📊 Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Task Completion Rate</span>
                <span className="text-sm font-semibold text-success">{summary.taskCompletionRate}%</span>
              </div>
              <div className="w-full bg-surface-lighter rounded-full h-2">
                <div className="bg-gradient-to-r from-success to-emerald-400 h-2 rounded-full transition-all duration-1000" style={{ width: `${summary.taskCompletionRate}%` }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Team Velocity</span>
                <span className="text-sm font-semibold text-primary-light">{summary.teamVelocity} tasks/dev</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Overdue Tasks</span>
                <span className="text-sm font-semibold text-danger">{summary.overdueTasks}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Team Size</span>
                <span className="text-sm font-semibold text-text-primary">{summary.teamSize} developers</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bottleneck Alerts */}
        <div className="glass-card p-6 animate-fade-in-up-delay-3">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineExclamation className="text-warning text-xl" />
            <h3 className="text-lg font-semibold text-text-primary">Bottleneck Alerts</h3>
          </div>
          <div className="space-y-3">
            {bottlenecks.length > 0 ? (
              bottlenecks.map((alert, i) => <AlertCard key={i} alert={alert} />)
            ) : (
              <p className="text-text-secondary text-sm py-4 text-center">No bottlenecks detected ✨</p>
            )}
          </div>
        </div>

        {/* AI Insights */}
        <div className="glass-card p-6 animate-fade-in-up-delay-4">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineLightningBolt className="text-primary-light text-xl" />
            <h3 className="text-lg font-semibold text-text-primary">AI Insights</h3>
          </div>
          <div className="space-y-3">
            {insights.length > 0 ? (
              insights.map((insight, i) => <InsightCard key={i} insight={insight} />)
            ) : (
              <p className="text-text-secondary text-sm py-4 text-center">No insights available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
