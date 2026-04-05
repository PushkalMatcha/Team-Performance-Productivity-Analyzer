const mongoose = require('mongoose');

const sprintSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  goal: { type: String, default: '' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['Planning', 'Active', 'Completed'],
    default: 'Planning',
  },
  capacityPoints: { type: Number, min: 0, default: 0 },
  activatedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

sprintSchema.pre('validate', function () {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    throw new Error('End date must be on or after start date');
  }
});

sprintSchema.methods.canTransitionTo = function (nextStatus) {
  const allowed = {
    Planning: ['Active'],
    Active: ['Completed'],
    Completed: [],
  };

  return (allowed[this.status] || []).includes(nextStatus);
};

module.exports = mongoose.model('Sprint', sprintSchema);
