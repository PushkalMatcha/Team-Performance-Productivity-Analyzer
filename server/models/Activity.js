const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['commit', 'pull_request', 'bug_fix', 'task_completed', 'code_review'],
    required: true,
  },
  developer: { type: mongoose.Schema.Types.ObjectId, ref: 'Developer' },
  developerName: { type: String },
  description: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Activity', activitySchema);
