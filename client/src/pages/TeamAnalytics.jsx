import { useState, useEffect } from 'react';
import { getTeamAnalytics, getBottlenecks, getSprintAnalytics } from '../services/api';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar,
  LineChart, Line,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-3 !rounded-lg text-sm">
      <p className="text-text-secondary font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function TeamAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [bottlenecks, setBottlenecks] = useState([]);
  const [sprintAnalytics, setSprintAnalytics] = useState(null);
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, bottlenecksRes, sprintRes] = await Promise.all([
        getTeamAnalytics(),
        getBottlenecks(),
        getSprintAnalytics(),
      ]);
      setAnalytics(analyticsRes.data);
      setBottlenecks(bottlenecksRes.data);
      setSprintAnalytics(sprintRes.data);

      const firstSprint = sprintRes.data?.bySprint?.[0];
      if (firstSprint) {
        setSelectedSprintId(firstSprint.sprintId);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const { summary, weeklyActivity, workloadDistribution } = analytics;
  const velocityTrend = sprintAnalytics?.velocityTrend || [];
  const sprintList = sprintAnalytics?.bySprint || [];
  const selectedSprint = sprintList.find((s) => String(s.sprintId) === String(selectedSprintId)) || sprintList[0];

  const weeklyChartData = weeklyActivity.labels.map((label, i) => ({
    name: label,
    Commits: weeklyActivity.commits[i],
    Tasks: weeklyActivity.tasks[i],
    PRs: weeklyActivity.prs[i],
    Bugs: weeklyActivity.bugs[i],
  }));

  const velocityData = workloadDistribution.map((d) => ({
    name: d.name.split(' ')[0],
    productivity: d.productivityScore,
    tasks: d.tasksCompleted,
    commits: d.commits,
  }));

  const gaugeData = [
    { name: 'Task Completion', value: summary.taskCompletionRate, fill: '#10b981' },
    { name: 'Bug Resolution', value: summary.bugResolutionRate, fill: '#06b6d4' },
    { name: 'Avg Productivity', value: summary.avgProductivity, fill: '#6366f1' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-text-primary">Team Analytics</h1>
        <p className="text-text-secondary mt-1">Deep dive into team productivity metrics</p>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-fade-in-up-delay-1">
        {[
          { label: 'Total Tasks', value: summary.totalTasks, color: 'primary' },
          { label: 'Completed', value: summary.completedTasks, color: 'success' },
          { label: 'In Progress', value: summary.inProgressTasks, color: 'accent' },
          { label: 'Pending', value: summary.pendingTasks, color: 'warning' },
          { label: 'Overdue', value: summary.overdueTasks, color: 'danger' },
          { label: 'Team Size', value: summary.teamSize, color: 'primary-light' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center hover:-translate-y-1 transition-transform duration-200">
            <p className={`text-2xl font-bold text-${color}`}>{value}</p>
            <p className="text-xs text-text-secondary mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Radial Gauges + Performance Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-6 animate-fade-in-up-delay-2">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Performance Gauges</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="30%"
              outerRadius="90%"
              data={gaugeData}
              startAngle={180}
              endAngle={0}
            >
              <RadialBar
                background={{ fill: '#1e293b' }}
                dataKey="value"
                cornerRadius={8}
              />
              <Legend
                iconSize={10}
                layout="horizontal"
                verticalAlign="bottom"
                formatter={(value) => <span className="text-text-secondary text-xs">{value}</span>}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6 animate-fade-in-up-delay-3">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Developer Skills Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={velocityData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <PolarRadiusAxis stroke="#334155" fontSize={10} />
              <Radar name="Productivity" dataKey="productivity" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
              <Radar name="Tasks" dataKey="tasks" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              <Legend formatter={(value) => <span className="text-text-secondary text-xs">{value}</span>} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Trends */}
      <div className="glass-card p-6 animate-fade-in-up-delay-2">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Activity Trends</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={weeklyChartData}>
            <defs>
              <linearGradient id="gradC" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradT" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="Commits" stroke="#6366f1" fill="url(#gradC)" strokeWidth={2} />
            <Area type="monotone" dataKey="Tasks" stroke="#10b981" fill="url(#gradT)" strokeWidth={2} />
            <Area type="monotone" dataKey="PRs" stroke="#06b6d4" fill="url(#gradP)" strokeWidth={2} />
            <Area type="monotone" dataKey="Bugs" stroke="#f59e0b" fill="url(#gradB)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Developer Comparison */}
      <div className="glass-card p-6 animate-fade-in-up-delay-3">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Developer Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={workloadDistribution} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="commits" name="Commits" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tasksCompleted" name="Tasks Done" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="productivityScore" name="Score %" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sprint Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-6 animate-fade-in-up-delay-3">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Sprint Velocity (Story Points)</h3>
          {velocityTrend.length === 0 ? (
            <p className="text-sm text-text-secondary">No sprint data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={velocityTrend} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="sprintName" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="committedPoints" name="Committed SP" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completedPoints" name="Completed SP" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-6 animate-fade-in-up-delay-3">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h3 className="text-lg font-semibold text-text-primary">Sprint Burndown</h3>
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary"
            >
              {sprintList.map((sprint) => (
                <option key={sprint.sprintId} value={sprint.sprintId}>{sprint.sprintName}</option>
              ))}
            </select>
          </div>

          {!selectedSprint ? (
            <p className="text-sm text-text-secondary">No sprint burndown available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={selectedSprint.burndown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="remaining" name="Remaining" stroke="#ef4444" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {bottlenecks.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Current Bottlenecks</h3>
          <div className="space-y-2">
            {bottlenecks.slice(0, 4).map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-border bg-surface-lighter/20">
                <p className="text-sm font-medium text-text-primary">{item.title}</p>
                <p className="text-xs text-text-secondary mt-1">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
