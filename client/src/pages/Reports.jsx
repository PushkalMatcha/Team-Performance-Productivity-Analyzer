import { useState, useEffect } from 'react';
import { getTeamAnalytics, getDevelopers, getTasks } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { HiOutlineDownload, HiOutlineDocumentReport, HiOutlineCalendar } from 'react-icons/hi';
import jsPDF from 'jspdf';

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

export default function Reports() {
  const [analytics, setAnalytics] = useState(null);
  const [developers, setDevelopers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, devsRes, tasksRes] = await Promise.all([
        getTeamAnalytics(),
        getDevelopers(),
        getTasks(),
      ]);
      setAnalytics(analyticsRes.data);
      setDevelopers(devsRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Title
      doc.setFontSize(22);
      doc.setTextColor(99, 102, 241);
      doc.text('TeamPulse - Productivity Report', pageWidth / 2, y, { align: 'center' });
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, y, { align: 'center' });
      y += 15;

      // Line separator
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(0.5);
      doc.line(20, y, pageWidth - 20, y);
      y += 15;

      // Team Summary
      doc.setFontSize(16);
      doc.setTextColor(30, 30, 30);
      doc.text('Team Summary', 20, y);
      y += 10;

      const { summary } = analytics;
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);

      const summaryItems = [
        [`Total Commits: ${summary.totalCommits}`, `Tasks Completed: ${summary.totalTasksCompleted}`],
        [`Pull Requests: ${summary.totalPRs}`, `Bugs Fixed: ${summary.totalBugsFixed}`],
        [`Task Completion Rate: ${summary.taskCompletionRate}%`, `Team Size: ${summary.teamSize}`],
        [`Team Velocity: ${summary.teamVelocity} tasks/dev`, `Avg Productivity: ${summary.avgProductivity}%`],
        [`Overdue Tasks: ${summary.overdueTasks}`, `Total Tasks: ${summary.totalTasks}`],
      ];

      summaryItems.forEach(([left, right]) => {
        doc.text(left, 25, y);
        doc.text(right, pageWidth / 2 + 10, y);
        y += 7;
      });

      y += 10;

      // Developer Performance Table
      doc.setFontSize(16);
      doc.setTextColor(30, 30, 30);
      doc.text('Developer Performance', 20, y);
      y += 10;

      // Table header
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(99, 102, 241);
      doc.rect(20, y - 5, pageWidth - 40, 8, 'F');
      const cols = ['Developer', 'Commits', 'PRs', 'Tasks', 'Bugs', 'Score'];
      const colWidths = [50, 22, 22, 22, 22, 22];
      let x = 25;
      cols.forEach((col, i) => {
        doc.text(col, x, y);
        x += colWidths[i];
      });
      y += 8;

      // Table rows
      doc.setTextColor(60, 60, 60);
      developers.forEach((dev, idx) => {
        if (idx % 2 === 0) {
          doc.setFillColor(245, 245, 250);
          doc.rect(20, y - 5, pageWidth - 40, 7, 'F');
        }
        x = 25;
        const row = [dev.name, String(dev.commits), String(dev.pullRequestsMerged), String(dev.tasksCompleted), String(dev.bugsFixed), `${dev.productivityScore}%`];
        row.forEach((val, i) => {
          doc.text(val, x, y);
          x += colWidths[i];
        });
        y += 7;
      });

      y += 15;

      // Task Summary
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(16);
      doc.setTextColor(30, 30, 30);
      doc.text('Task Breakdown', 20, y);
      y += 10;

      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      const tasksByStatus = {
        Pending: tasks.filter(t => t.status === 'Pending').length,
        'In Progress': tasks.filter(t => t.status === 'In Progress').length,
        Completed: tasks.filter(t => t.status === 'Completed').length,
      };

      Object.entries(tasksByStatus).forEach(([status, count]) => {
        doc.text(`${status}: ${count} tasks`, 25, y);
        y += 7;
      });

      const overdueTasks = tasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < new Date());
      y += 3;
      doc.setTextColor(220, 50, 50);
      doc.text(`Overdue Tasks: ${overdueTasks.length}`, 25, y);
      y += 15;

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated by TeamPulse - Team Performance & Productivity Analyzer', pageWidth / 2, 285, { align: 'center' });

      doc.save('TeamPulse_Report.pdf');
    } catch (error) {
      console.error('PDF generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const { summary, workloadDistribution } = analytics;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
          <p className="text-text-secondary mt-1">Generate and download team productivity reports</p>
        </div>
        <button
          onClick={generatePDF}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-medium hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-95 disabled:opacity-50"
        >
          {generating ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Generating...
            </>
          ) : (
            <>
              <HiOutlineDownload />
              Download PDF Report
            </>
          )}
        </button>
      </div>

      {/* Report Preview */}
      <div className="glass-card p-8 animate-fade-in-up-delay-1">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <HiOutlineDocumentReport className="text-xl text-primary-light" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Report Preview</h2>
            <p className="text-xs text-text-secondary flex items-center gap-1">
              <HiOutlineCalendar /> Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Summary Section */}
        <div className="mb-8">
          <h3 className="text-md font-semibold text-text-primary mb-4 pb-2 border-b border-border">Team Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Commits', value: summary.totalCommits },
              { label: 'Tasks Completed', value: summary.totalTasksCompleted },
              { label: 'PRs Merged', value: summary.totalPRs },
              { label: 'Bugs Fixed', value: summary.totalBugsFixed },
              { label: 'Completion Rate', value: `${summary.taskCompletionRate}%` },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl bg-surface text-center">
                <p className="text-xl font-bold text-primary-light">{value}</p>
                <p className="text-[11px] text-text-secondary mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Developer Performance Chart */}
        <div className="mb-8">
          <h3 className="text-md font-semibold text-text-primary mb-4 pb-2 border-b border-border">Developer Performance</h3>
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

        {/* Developer Table */}
        <div>
          <h3 className="text-md font-semibold text-text-primary mb-4 pb-2 border-b border-border">Developer Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-text-secondary uppercase tracking-wider border-b border-border">
                  <th className="py-3 px-4">Developer</th>
                  <th className="py-3 px-4">Commits</th>
                  <th className="py-3 px-4">PRs</th>
                  <th className="py-3 px-4">Tasks</th>
                  <th className="py-3 px-4">Bugs</th>
                  <th className="py-3 px-4">Score</th>
                </tr>
              </thead>
              <tbody>
                {developers.map((dev, i) => (
                  <tr key={dev._id} className="border-b border-border/50 hover:bg-surface-lighter/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ background: `linear-gradient(135deg, ${['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'][i % 6]}, ${['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'][i % 6]})` }}
                        >
                          {dev.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm text-text-primary font-medium">{dev.name}</p>
                          <p className="text-[11px] text-text-secondary">{dev.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary">{dev.commits}</td>
                    <td className="py-3 px-4 text-sm text-text-primary">{dev.pullRequestsMerged}</td>
                    <td className="py-3 px-4 text-sm text-text-primary">{dev.tasksCompleted}</td>
                    <td className="py-3 px-4 text-sm text-text-primary">{dev.bugsFixed}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-surface-lighter rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${dev.productivityScore}%` }}
                          />
                        </div>
                        <span className="text-sm text-primary-light font-medium">{dev.productivityScore}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
