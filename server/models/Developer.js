const mongoose = require('mongoose');

const developerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, default: 'Developer' },
  avatar: { type: String, default: '' },
  githubUsername: { type: String, default: '' },
  skills: [{ type: String }],
  commits: { type: Number, default: 0 },
  pullRequestsMerged: { type: Number, default: 0 },
  issuesResolved: { type: Number, default: 0 },
  tasksCompleted: { type: Number, default: 0 },
  tasksAssigned: { type: Number, default: 0 },
  bugsFixed: { type: Number, default: 0 },
  productivityScore: { type: Number, default: 0 },
  weeklyActivity: [{
    week: String,
    commits: Number,
    tasks: Number,
    prs: Number,
    bugs: Number,
  }],
  projectsContributions: [{
    repositoryName: { type: String, required: true },
    commits: { type: Number, default: 0 },
    pullRequestsMerged: { type: Number, default: 0 },
    issuesResolved: { type: Number, default: 0 }
  }],
  joinedAt: { type: Date, default: Date.now },
});

developerSchema.methods.calculateProductivityScore = function () {
  const commitWeight = 0.3;
  const prWeight = 0.25;
  const taskWeight = 0.25;
  const bugWeight = 0.2;

  const maxCommits = 200;
  const maxPRs = 50;
  const maxTasks = 100;
  const maxBugs = 80;

  const score =
    (Math.min(this.commits / maxCommits, 1) * commitWeight +
      Math.min(this.pullRequestsMerged / maxPRs, 1) * prWeight +
      Math.min(this.tasksCompleted / maxTasks, 1) * taskWeight +
      Math.min(this.bugsFixed / maxBugs, 1) * bugWeight) * 100;

  this.productivityScore = Math.round(score);
  return this.productivityScore;
};

module.exports = mongoose.model('Developer', developerSchema);
