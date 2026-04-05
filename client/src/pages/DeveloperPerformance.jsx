import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDevelopers, getDeveloper, getDeveloperStats, syncGithubData } from '../services/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { HiOutlineCode, HiOutlineCheckCircle, HiOutlineArrowLeft, HiOutlineRefresh, HiOutlineUser } from 'react-icons/hi';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

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

function DeveloperCard({ dev, index }) {
  return (
    <Link
      to={`/developers/${dev._id}`}
      className="glass-card p-5 hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 group"
    >
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
          style={{ background: `linear-gradient(135deg, ${COLORS[index % COLORS.length]}, ${COLORS[(index + 1) % COLORS.length]})` }}
        >
          {dev.name.charAt(0)}
        </div>
        <div>
          <p className="text-text-primary font-semibold group-hover:text-primary-light transition-colors">{dev.name}</p>
          <p className="text-xs text-text-secondary">{dev.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-surface/50">
          <p className="text-lg font-bold text-primary-light">{dev.commits}</p>
          <p className="text-[10px] text-text-secondary uppercase">Commits</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-surface/50">
          <p className="text-lg font-bold text-success">{dev.tasksCompleted}</p>
          <p className="text-[10px] text-text-secondary uppercase">Tasks Done</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-surface/50">
          <p className="text-lg font-bold text-accent">{dev.pullRequestsMerged}</p>
          <p className="text-[10px] text-text-secondary uppercase">PRs Merged</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-surface/50">
          <p className="text-lg font-bold text-warning">{dev.bugsFixed}</p>
          <p className="text-[10px] text-text-secondary uppercase">Bugs Fixed</p>
        </div>
      </div>

      {/* Productivity Score Bar */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-text-secondary">Productivity Score</span>
          <span className="text-xs font-semibold text-primary-light">{dev.productivityScore}%</span>
        </div>
        <div className="w-full bg-surface-lighter rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-1000"
            style={{
              width: `${dev.productivityScore}%`,
              background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]}, ${COLORS[(index + 1) % COLORS.length]})`,
            }}
          />
        </div>
      </div>

      {/* Skills */}
      {dev.skills && dev.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {dev.skills.slice(0, 4).map((skill) => (
            <span key={skill} className="px-2 py-0.5 text-[10px] rounded-full bg-surface-lighter text-text-secondary">
              {skill}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

function DeveloperDetail({ developerId }) {
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [syncMessage, setSyncMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchData();
  }, [developerId]);

  const fetchData = async () => {
    try {
      const [devRes, statsRes] = await Promise.all([
        getDeveloper(developerId),
        getDeveloperStats(developerId),
      ]);
      setData(devRes.data);
      setStats(statsRes.data);
      if (devRes.data.developer.githubUsername) {
        setGithubUsername(devRes.data.developer.githubUsername);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!githubUsername) {
      setSyncMessage({ text: 'Please enter a GitHub username', type: 'error' });
      return;
    }
    
    setSyncing(true);
    setSyncMessage({ text: '', type: '' });
    
    try {
      await syncGithubData(developerId, { githubUsername });
      await fetchData(); // Refresh data
      setSyncMessage({ text: 'GitHub data synced successfully!', type: 'success' });
      
      // Clear message after 3 seconds
      setTimeout(() => setSyncMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setSyncMessage({ 
        text: error.response?.data?.message || 'Failed to sync with GitHub', 
        type: 'error' 
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const { developer, tasks, activities } = data;

  const weeklyChartData = developer.weeklyActivity?.map((w) => ({
    name: w.week,
    Commits: w.commits,
    Tasks: w.tasks,
    PRs: w.prs,
    Bugs: w.bugs,
  })) || [];

  const contributionData = [
    { name: 'Commits', value: developer.commits, color: '#6366f1' },
    { name: 'PRs', value: developer.pullRequestsMerged, color: '#06b6d4' },
    { name: 'Tasks', value: developer.tasksCompleted, color: '#10b981' },
    { name: 'Bugs', value: developer.bugsFixed, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      <Link to="/developers" className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
        <HiOutlineArrowLeft /> Back to Developers
      </Link>

      {/* Profile Header */}
      <div className="glass-card p-6 animate-fade-in-up">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-primary/25">
            {developer.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-text-primary">{developer.name}</h1>
            <p className="text-text-secondary">{developer.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {developer.skills?.map((skill) => (
                <span key={skill} className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary-light border border-primary/20">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div className="text-center">
            <div className="w-24 h-24 rounded-full border-4 border-primary flex items-center justify-center pulse-glow">
              <div>
                <p className="text-2xl font-bold text-primary-light">{developer.productivityScore}%</p>
                <p className="text-[10px] text-text-secondary uppercase">Score</p>
              </div>
            </div>
          </div>
        </div>

        {/* GitHub Integration Area */}
        <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-text-primary mb-1">GitHub Integration</h3>
            <p className="text-xs text-text-secondary">Sync commits, pull requests, and issues directly from GitHub.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="GitHub Username"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface rounded-lg border border-border text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 transition-all"
              />
            </div>
            
            <button
              onClick={handleSync}
              disabled={syncing || !githubUsername}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary-light border border-primary/20 hover:bg-primary/20 hover:border-primary/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HiOutlineRefresh className={syncing ? "animate-spin" : ""} />
              {syncing ? 'Syncing...' : 'Sync Data'}
            </button>
          </div>
        </div>
        
        {syncMessage.text && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            syncMessage.type === 'success' 
              ? 'bg-success/10 text-success border border-success/20' 
              : 'bg-danger/10 text-danger border border-danger/20'
          }`}>
            {syncMessage.text}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in-up-delay-1">
        {[
          { label: 'Commits', value: stats?.commits || developer.commits, color: 'primary' },
          { label: 'PRs Merged', value: stats?.pullRequestsMerged || developer.pullRequestsMerged, color: 'accent' },
          { label: 'Tasks Done', value: stats?.completedTasks || developer.tasksCompleted, color: 'success' },
          { label: 'Issues Fixed', value: stats?.issuesResolved || developer.issuesResolved, color: 'warning' },
          { label: 'Bugs Fixed', value: stats?.bugsFixed || developer.bugsFixed, color: 'danger' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center hover:-translate-y-1 transition-transform duration-200">
            <p className={`text-2xl font-bold text-${color}`}>{value}</p>
            <p className="text-xs text-text-secondary mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-card p-6 animate-fade-in-up-delay-2">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Contribution Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={weeklyChartData}>
              <defs>
                <linearGradient id="gC2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gT2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="Commits" stroke="#6366f1" fill="url(#gC2)" strokeWidth={2} />
              <Area type="monotone" dataKey="Tasks" stroke="#10b981" fill="url(#gT2)" strokeWidth={2} />
              <Area type="monotone" dataKey="PRs" stroke="#06b6d4" fillOpacity={0.1} fill="#06b6d4" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6 animate-fade-in-up-delay-3">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Contribution Split</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={contributionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {contributionData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(value) => <span className="text-text-secondary text-xs">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6 animate-fade-in-up-delay-3">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h3>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {activities.map((activity, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-lighter/50 transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                activity.type === 'commit' ? 'bg-primary/10 text-primary-light' :
                activity.type === 'pull_request' ? 'bg-accent/10 text-accent' :
                activity.type === 'bug_fix' ? 'bg-warning/10 text-warning' :
                activity.type === 'task_completed' ? 'bg-success/10 text-success' :
                'bg-surface-lighter text-text-secondary'
              }`}>
                {activity.type === 'commit' ? <HiOutlineCode /> : <HiOutlineCheckCircle />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">{activity.description}</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {activity.type.replace('_', ' ')} · {new Date(activity.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DeveloperPerformance() {
  const { id } = useParams();
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      getDevelopers()
        .then((res) => setDevelopers(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id]);

  if (id) {
    return <DeveloperDetail developerId={id} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-text-primary">Developer Performance</h1>
        <p className="text-text-secondary mt-1">Individual developer productivity metrics and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {developers.map((dev, i) => (
          <DeveloperCard key={dev._id} dev={dev} index={i} />
        ))}
      </div>
    </div>
  );
}
