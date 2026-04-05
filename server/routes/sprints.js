const express = require('express');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const { auth, managerOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/sprints
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const sprints = await Sprint.find(filter).sort({ startDate: -1 });

    const enriched = await Promise.all(
      sprints.map(async (sprint) => {
        const tasks = await Task.find({ sprintId: sprint._id }).select('status storyPoints');
        const committedPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        const completedPoints = tasks
          .filter((t) => t.status === 'Completed')
          .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

        return {
          ...sprint.toObject(),
          stats: {
            taskCount: tasks.length,
            committedPoints,
            completedPoints,
          },
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/sprints
router.post('/', auth, managerOnly, async (req, res) => {
  try {
    const { name, goal, startDate, endDate, status, capacityPoints } = req.body;
    const sprint = new Sprint({
      name,
      goal,
      startDate,
      endDate,
      status: status || 'Planning',
      capacityPoints: capacityPoints || 0,
      createdBy: req.user._id,
    });

    await sprint.save();
    res.status(201).json(sprint);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/sprints/:id
router.put('/:id', auth, managerOnly, async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });

    const prevStatus = sprint.status;
    const nextStatus = req.body.status;

    if (nextStatus && nextStatus !== prevStatus) {
      if (!sprint.canTransitionTo(nextStatus)) {
        return res.status(400).json({
          message: `Invalid transition from ${prevStatus} to ${nextStatus}`,
        });
      }

      const sprintTasks = await Task.find({ sprintId: sprint._id }).select('status _id');

      if (nextStatus === 'Active') {
        if (sprintTasks.length === 0) {
          return res.status(400).json({
            message: 'Cannot activate sprint without planned tasks',
          });
        }
        sprint.activatedAt = new Date();
      }

      if (nextStatus === 'Completed') {
        const incomplete = sprintTasks.filter((t) => t.status !== 'Completed');
        if (incomplete.length > 0) {
          return res.status(400).json({
            message: 'Cannot complete sprint while tasks are still pending or in progress',
          });
        }
        sprint.completedAt = new Date();
      }
    }

    Object.assign(sprint, req.body);
    await sprint.save();

    res.json(sprint);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/sprints/:id
router.delete('/:id', auth, managerOnly, async (req, res) => {
  try {
    const assignedTasks = await Task.countDocuments({ sprintId: req.params.id });
    if (assignedTasks > 0) {
      return res.status(400).json({
        message: 'Sprint has tasks assigned. Move tasks to backlog before deletion.',
      });
    }

    const deleted = await Sprint.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Sprint not found' });

    res.json({ message: 'Sprint deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/sprints/:id/board
router.get('/:id/board', auth, async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });

    const tasks = await Task.find({ sprintId: sprint._id })
      .populate('assignedTo', 'name email avatar')
      .sort({ priorityRank: 1, createdAt: -1 });

    res.json({
      sprint,
      columns: {
        Pending: tasks.filter((t) => t.status === 'Pending'),
        inProgress: tasks.filter((t) => t.status === 'In Progress'),
        Completed: tasks.filter((t) => t.status === 'Completed'),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
