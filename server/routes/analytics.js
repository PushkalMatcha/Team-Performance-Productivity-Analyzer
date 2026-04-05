const express = require('express');
const Developer = require('../models/Developer');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const Sprint = require('../models/Sprint');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/team
router.get('/team', auth, async (req, res) => {
  try {
    const developers = await Developer.find();
    const tasks = await Task.find();
    const sprints = await Sprint.find();

    const totalCommits = developers.reduce((sum, d) => sum + d.commits, 0);
    const totalPRs = developers.reduce((sum, d) => sum + d.pullRequestsMerged, 0);
    const totalBugsFixed = developers.reduce((sum, d) => sum + d.bugsFixed, 0);
    const totalTasksCompleted = developers.reduce((sum, d) => sum + d.tasksCompleted, 0);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const overdueTasks = tasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < new Date()).length;

    const avgProductivity = developers.length > 0
      ? Math.round(developers.reduce((sum, d) => sum + d.productivityScore, 0) / developers.length)
      : 0;

    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const bugResolutionRate = totalBugsFixed > 0 ? Math.round(Math.min((totalBugsFixed / (totalBugsFixed + 10)) * 100, 100)) : 0;

    // Weekly activity aggregation
    const weeklyLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'];
    const weeklyCommits = weeklyLabels.map((_, i) => {
      return developers.reduce((sum, d) => {
        const wa = d.weeklyActivity && d.weeklyActivity[i];
        return sum + (wa ? wa.commits : 0);
      }, 0);
    });
    const weeklyTasks = weeklyLabels.map((_, i) => {
      return developers.reduce((sum, d) => {
        const wa = d.weeklyActivity && d.weeklyActivity[i];
        return sum + (wa ? wa.tasks : 0);
      }, 0);
    });
    const weeklyPRs = weeklyLabels.map((_, i) => {
      return developers.reduce((sum, d) => {
        const wa = d.weeklyActivity && d.weeklyActivity[i];
        return sum + (wa ? wa.prs : 0);
      }, 0);
    });
    const weeklyBugs = weeklyLabels.map((_, i) => {
      return developers.reduce((sum, d) => {
        const wa = d.weeklyActivity && d.weeklyActivity[i];
        return sum + (wa ? wa.bugs : 0);
      }, 0);
    });

    // Most active developer
    const sortedDevs = [...developers].sort((a, b) => b.productivityScore - a.productivityScore);
    const mostActiveDev = sortedDevs[0] || null;

    // Workload distribution
    const workloadDistribution = developers.map(d => ({
      name: d.name,
      tasksAssigned: d.tasksAssigned || 0,
      tasksCompleted: d.tasksCompleted || 0,
      commits: d.commits,
      productivityScore: d.productivityScore,
    }));

    res.json({
      summary: {
        totalCommits,
        totalPRs,
        totalBugsFixed,
        totalTasksCompleted,
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        overdueTasks,
        avgProductivity,
        taskCompletionRate,
        bugResolutionRate,
        teamSize: developers.length,
        teamVelocity: Math.round(totalTasksCompleted / Math.max(developers.length, 1)),
      },
      sprintSummary: {
        totalSprints: sprints.length,
        activeSprints: sprints.filter((s) => s.status === 'Active').length,
        completedSprints: sprints.filter((s) => s.status === 'Completed').length,
      },
      weeklyActivity: {
        labels: weeklyLabels,
        commits: weeklyCommits,
        tasks: weeklyTasks,
        prs: weeklyPRs,
        bugs: weeklyBugs,
      },
      mostActiveDev: mostActiveDev ? {
        name: mostActiveDev.name,
        productivityScore: mostActiveDev.productivityScore,
        commits: mostActiveDev.commits,
      } : null,
      workloadDistribution,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/analytics/sprints
router.get('/sprints', auth, async (req, res) => {
  try {
    const sprints = await Sprint.find().sort({ startDate: 1 }).lean();
    const metrics = [];

    for (const sprint of sprints) {
      const tasks = await Task.find({ sprintId: sprint._id }).lean();
      const committedPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const completedPoints = tasks
        .filter((t) => t.status === 'Completed')
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      const start = new Date(sprint.startDate);
      const end = new Date(sprint.endDate);
      const dayCount = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
      const burndown = [];

      for (let i = 0; i < dayCount; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);

        const completedByDay = tasks
          .filter((t) => t.completedAt && new Date(t.completedAt) <= day)
          .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

        burndown.push({
          day: `Day ${i + 1}`,
          remaining: Math.max(committedPoints - completedByDay, 0),
          ideal: Math.max(Math.round(committedPoints - (committedPoints * (i / Math.max(dayCount - 1, 1)))), 0),
        });
      }

      metrics.push({
        sprintId: sprint._id,
        sprintName: sprint.name,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        committedPoints,
        completedPoints,
        velocity: completedPoints,
        burndown,
      });
    }

    res.json({
      bySprint: metrics,
      velocityTrend: metrics.map((m) => ({
        sprintName: m.sprintName,
        committedPoints: m.committedPoints,
        completedPoints: m.completedPoints,
        velocity: m.velocity,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/analytics/bottlenecks
router.get('/bottlenecks', auth, async (req, res) => {
  try {
    const developers = await Developer.find();
    const tasks = await Task.find();
    const alerts = [];

    // Overloaded developers (more than 8 active tasks)
    for (const dev of developers) {
      const activeTasks = tasks.filter(
        t => t.assignedTo && t.assignedTo.toString() === dev._id.toString() && t.status !== 'Completed'
      ).length;

      if (activeTasks > 8) {
        alerts.push({
          type: 'overloaded',
          severity: 'high',
          title: `${dev.name} is overloaded`,
          description: `${dev.name} has ${activeTasks} active tasks. Consider redistributing workload.`,
          developer: dev.name,
        });
      }
    }

    // Overdue tasks
    const overdueTasks = tasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < new Date());
    if (overdueTasks.length > 0) {
      alerts.push({
        type: 'overdue',
        severity: overdueTasks.length > 5 ? 'high' : 'medium',
        title: `${overdueTasks.length} overdue tasks`,
        description: `There are ${overdueTasks.length} tasks past their deadline that need attention.`,
      });
    }

    // Low productivity developers
    for (const dev of developers) {
      if (dev.productivityScore < 25 && dev.tasksAssigned > 3) {
        alerts.push({
          type: 'low_productivity',
          severity: 'medium',
          title: `${dev.name} has low productivity`,
          description: `${dev.name}'s productivity score is ${dev.productivityScore}%. Consider providing support.`,
          developer: dev.name,
        });
      }
    }

    // High bug rate
    const totalBugs = developers.reduce((sum, d) => sum + d.bugsFixed, 0);
    const totalCommits = developers.reduce((sum, d) => sum + d.commits, 0);
    if (totalCommits > 0 && (totalBugs / totalCommits) > 0.3) {
      alerts.push({
        type: 'high_bug_rate',
        severity: 'high',
        title: 'High bug-to-commit ratio',
        description: `Bug rate is ${Math.round((totalBugs / totalCommits) * 100)}%. Code quality review recommended.`,
      });
    }

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/analytics/insights
router.get('/insights', auth, async (req, res) => {
  try {
    const developers = await Developer.find();
    const tasks = await Task.find();
    const insights = [];

    // Workload redistribution
    const avgTasks = developers.length > 0
      ? developers.reduce((sum, d) => sum + (d.tasksAssigned || 0), 0) / developers.length
      : 0;

    const overloadedDevs = developers.filter(d => (d.tasksAssigned || 0) > avgTasks * 1.5);
    const underloadedDevs = developers.filter(d => (d.tasksAssigned || 0) < avgTasks * 0.5);

    if (overloadedDevs.length > 0 && underloadedDevs.length > 0) {
      insights.push({
        type: 'workload',
        icon: '⚖️',
        title: 'Redistribute Workload',
        description: `${overloadedDevs.map(d => d.name).join(', ')} ${overloadedDevs.length > 1 ? 'are' : 'is'} overloaded while ${underloadedDevs.map(d => d.name).join(', ')} ${underloadedDevs.length > 1 ? 'have' : 'has'} capacity. Consider redistributing tasks.`,
        priority: 'high',
      });
    }

    // Bug fixing efficiency
    const highBugDevs = developers.filter(d => d.bugsFixed > 15 && d.productivityScore < 50);
    if (highBugDevs.length > 0) {
      insights.push({
        type: 'bugs',
        icon: '🐛',
        title: 'Improve Bug Fixing Efficiency',
        description: `${highBugDevs.map(d => d.name).join(', ')} spend significant time on bugs. Consider pair programming or code reviews to reduce bug introduction.`,
        priority: 'medium',
      });
    }

    // Productivity trends
    const topPerformers = developers.filter(d => d.productivityScore >= 70);
    if (topPerformers.length > 0) {
      insights.push({
        type: 'trend',
        icon: '📈',
        title: 'Strong Performers',
        description: `${topPerformers.map(d => d.name).join(', ')} ${topPerformers.length > 1 ? 'are' : 'is'} exceeding productivity expectations. Consider them for mentoring roles.`,
        priority: 'low',
      });
    }

    // Overdue trend
    const overdueTasks = tasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < new Date());
    if (overdueTasks.length > tasks.length * 0.2) {
      insights.push({
        type: 'deadline',
        icon: '⏰',
        title: 'Deadline Management Needed',
        description: `${Math.round((overdueTasks.length / tasks.length) * 100)}% of tasks are overdue. Review sprint planning and estimation practices.`,
        priority: 'high',
      });
    }

    // Team velocity insight
    const totalCompleted = tasks.filter(t => t.status === 'Completed').length;
    insights.push({
      type: 'velocity',
      icon: '🚀',
      title: 'Team Velocity',
      description: `The team has completed ${totalCompleted} out of ${tasks.length} tasks (${tasks.length > 0 ? Math.round((totalCompleted / tasks.length) * 100) : 0}%). ${totalCompleted / Math.max(tasks.length, 1) > 0.7 ? 'Great velocity!' : 'Room for improvement.'}`,
      priority: 'low',
    });

    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
