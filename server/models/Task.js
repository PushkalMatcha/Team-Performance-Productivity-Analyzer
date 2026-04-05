const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type: {
    type: String,
    enum: ['Feature', 'Bug', 'Chore', 'Spike'],
    default: 'Feature',
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Developer' },
  assignedToName: { type: String, default: '' },
  repositoryName: { type: String, default: '', trim: true },
  sprintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', default: null },
  storyPoints: { type: Number, min: 1, max: 100, default: 1 },
  estimateHours: { type: Number, min: 0, default: 0 },
  priorityRank: { type: Number, min: 1, default: 3 },
  isBlocked: { type: Boolean, default: false },
  blockedReason: { type: String, default: '', trim: true },
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  acceptanceCriteria: [{ type: String, trim: true }],
  deadline: { type: Date, required: true },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Pending',
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Task', taskSchema);
