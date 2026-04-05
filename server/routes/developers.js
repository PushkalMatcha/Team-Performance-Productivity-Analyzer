const express = require('express');
const Developer = require('../models/Developer');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/developers
router.get('/', auth, async (req, res) => {
  try {
    const developers = await Developer.find().sort({ productivityScore: -1 });
    res.json(developers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/developers/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const developer = await Developer.findById(req.params.id);
    if (!developer) return res.status(404).json({ message: 'Developer not found' });

    const tasks = await Task.find({ assignedTo: developer._id }).sort({ createdAt: -1 }).limit(20);
    const activities = await Activity.find({ developer: developer._id }).sort({ timestamp: -1 }).limit(30);

    res.json({ developer, tasks, activities });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/developers/:id/stats
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const developer = await Developer.findById(req.params.id);
    if (!developer) return res.status(404).json({ message: 'Developer not found' });

    const totalTasks = await Task.countDocuments({ assignedTo: developer._id });
    const completedTasks = await Task.countDocuments({ assignedTo: developer._id, status: 'Completed' });
    const pendingTasks = await Task.countDocuments({ assignedTo: developer._id, status: 'Pending' });
    const inProgressTasks = await Task.countDocuments({ assignedTo: developer._id, status: 'In Progress' });
    const overdueTasks = await Task.countDocuments({
      assignedTo: developer._id,
      status: { $ne: 'Completed' },
      deadline: { $lt: new Date() },
    });

    res.json({
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      commits: developer.commits,
      pullRequestsMerged: developer.pullRequestsMerged,
      issuesResolved: developer.issuesResolved,
      bugsFixed: developer.bugsFixed,
      productivityScore: developer.productivityScore,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
