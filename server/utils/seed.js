const Developer = require('../models/Developer');
const Task = require('../models/Task');
const Activity = require('../models/Activity');

const developerData = [
  {
    name: 'Arjun Patel',
    email: 'arjun@team.dev',
    githubUsername: 'arjunpatel',
    skills: ['React', 'Node.js', 'TypeScript', 'MongoDB'],
    commits: 156,
    pullRequestsMerged: 34,
    issuesResolved: 28,
    tasksCompleted: 42,
    tasksAssigned: 48,
    bugsFixed: 18,
  },
  {
    name: 'Priya Sharma',
    email: 'priya@team.dev',
    githubUsername: 'priyasharma',
    skills: ['Python', 'Django', 'PostgreSQL', 'Docker'],
    commits: 189,
    pullRequestsMerged: 41,
    issuesResolved: 35,
    tasksCompleted: 55,
    tasksAssigned: 58,
    bugsFixed: 22,
  },
  {
    name: 'Rahul Kumar',
    email: 'rahul@team.dev',
    githubUsername: 'rahulkumar',
    skills: ['Java', 'Spring Boot', 'AWS', 'Kubernetes'],
    commits: 134,
    pullRequestsMerged: 28,
    issuesResolved: 22,
    tasksCompleted: 38,
    tasksAssigned: 45,
    bugsFixed: 25,
  },
  {
    name: 'Sneha Reddy',
    email: 'sneha@team.dev',
    githubUsername: 'snehareddy',
    skills: ['React Native', 'Flutter', 'Firebase', 'GraphQL'],
    commits: 112,
    pullRequestsMerged: 22,
    issuesResolved: 19,
    tasksCompleted: 31,
    tasksAssigned: 40,
    bugsFixed: 14,
  },
  {
    name: 'Vikram Singh',
    email: 'vikram@team.dev',
    githubUsername: 'vikramsingh',
    skills: ['Go', 'Rust', 'gRPC', 'Redis'],
    commits: 98,
    pullRequestsMerged: 19,
    issuesResolved: 16,
    tasksCompleted: 25,
    tasksAssigned: 35,
    bugsFixed: 12,
  },
  {
    name: 'Ananya Gupta',
    email: 'ananya@team.dev',
    githubUsername: 'ananyagupta',
    skills: ['Vue.js', 'Nuxt', 'Tailwind', 'Figma'],
    commits: 145,
    pullRequestsMerged: 30,
    issuesResolved: 24,
    tasksCompleted: 48,
    tasksAssigned: 52,
    bugsFixed: 20,
  },
];

const generateWeeklyActivity = (dev) => {
  const weeks = [];
  for (let i = 0; i < 8; i++) {
    const factor = 0.5 + Math.random();
    weeks.push({
      week: `Week ${i + 1}`,
      commits: Math.round((dev.commits / 8) * factor),
      tasks: Math.round((dev.tasksCompleted / 8) * factor),
      prs: Math.round((dev.pullRequestsMerged / 8) * factor),
      bugs: Math.round((dev.bugsFixed / 8) * factor),
    });
  }
  return weeks;
};

const taskTemplates = [
  { title: 'Implement user authentication flow', priority: 'High' },
  { title: 'Design database schema for analytics', priority: 'High' },
  { title: 'Create REST API endpoints', priority: 'High' },
  { title: 'Build dashboard UI components', priority: 'Medium' },
  { title: 'Write unit tests for auth module', priority: 'Medium' },
  { title: 'Optimize database queries', priority: 'Medium' },
  { title: 'Fix login page responsive issues', priority: 'Low' },
  { title: 'Add email notification service', priority: 'Medium' },
  { title: 'Implement file upload feature', priority: 'High' },
  { title: 'Refactor legacy codebase', priority: 'Low' },
  { title: 'Set up CI/CD pipeline', priority: 'High' },
  { title: 'Create onboarding flow', priority: 'Medium' },
  { title: 'Implement search functionality', priority: 'Medium' },
  { title: 'Fix memory leak in background worker', priority: 'Critical' },
  { title: 'Update API documentation', priority: 'Low' },
  { title: 'Migrate to new payment gateway', priority: 'Critical' },
  { title: 'Build analytics dashboard charts', priority: 'High' },
  { title: 'Implement caching layer', priority: 'Medium' },
  { title: 'Security audit and fixes', priority: 'Critical' },
  { title: 'Add dark mode support', priority: 'Low' },
  { title: 'Implement WebSocket notifications', priority: 'Medium' },
  { title: 'Create data export feature', priority: 'Medium' },
  { title: 'Fix cross-browser compatibility', priority: 'Low' },
  { title: 'Build admin panel', priority: 'High' },
  { title: 'Integrate third-party analytics', priority: 'Medium' },
  { title: 'Performance profiling and optimization', priority: 'High' },
  { title: 'Set up error monitoring', priority: 'Medium' },
  { title: 'Implement rate limiting', priority: 'High' },
  { title: 'Create user feedback system', priority: 'Low' },
  { title: 'Build automated backup system', priority: 'Medium' },
];

const activityTypes = ['commit', 'pull_request', 'bug_fix', 'task_completed', 'code_review'];
const activityDescriptions = {
  commit: [
    'Pushed changes to feature branch',
    'Fixed typo in configuration file',
    'Updated dependency versions',
    'Refactored utility functions',
    'Added new API endpoint',
  ],
  pull_request: [
    'Merged feature: user dashboard',
    'Merged hotfix: auth token refresh',
    'Merged refactor: database layer',
    'Merged feature: notification system',
  ],
  bug_fix: [
    'Fixed null pointer exception',
    'Resolved race condition in queue',
    'Fixed CSS layout issue on mobile',
    'Patched security vulnerability',
  ],
  task_completed: [
    'Completed sprint task',
    'Finished code review',
    'Delivered feature implementation',
    'Completed documentation update',
  ],
  code_review: [
    'Reviewed PR: auth module refactor',
    'Reviewed PR: database migration',
    'Reviewed PR: API endpoint updates',
    'Reviewed PR: UI component library',
  ],
};

async function seedDatabase() {
  try {
    // Clear existing data
    await Developer.deleteMany({});
    await Task.deleteMany({});
    await Activity.deleteMany({});

    console.log('Cleared existing data');

    // Create developers
    const createdDevs = [];
    for (const devData of developerData) {
      const dev = new Developer({
        ...devData,
        weeklyActivity: generateWeeklyActivity(devData),
      });
      dev.calculateProductivityScore();
      await dev.save();
      createdDevs.push(dev);
    }
    console.log(`Created ${createdDevs.length} developers`);

    // Create tasks
    const statuses = ['Pending', 'In Progress', 'Completed'];
    const createdTasks = [];
    for (let i = 0; i < taskTemplates.length; i++) {
      const template = taskTemplates[i];
      const dev = createdDevs[i % createdDevs.length];
      const statusIdx = i % 3;
      const daysOffset = Math.floor(Math.random() * 30) - 10;
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + daysOffset);

      const task = new Task({
        title: template.title,
        description: `Detailed description for: ${template.title}. This task involves implementing the required functionality and writing tests.`,
        assignedTo: dev._id,
        assignedToName: dev.name,
        deadline,
        status: statuses[statusIdx],
        priority: template.priority,
        completedAt: statusIdx === 2 ? new Date(deadline.getTime() - 86400000 * Math.random() * 5) : null,
      });
      await task.save();
      createdTasks.push(task);
    }
    console.log(`Created ${createdTasks.length} tasks`);

    // Create activities
    let activityCount = 0;
    for (const dev of createdDevs) {
      for (let i = 0; i < 15; i++) {
        const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        const descriptions = activityDescriptions[type];
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        const daysAgo = Math.floor(Math.random() * 30);
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - daysAgo);

        const activity = new Activity({
          type,
          developer: dev._id,
          developerName: dev.name,
          description,
          timestamp,
        });
        await activity.save();
        activityCount++;
      }
    }
    console.log(`Created ${activityCount} activities`);

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Seed error:', error);
  }
}

module.exports = seedDatabase;
