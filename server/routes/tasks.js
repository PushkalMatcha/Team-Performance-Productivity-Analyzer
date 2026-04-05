const express = require('express');
const Task = require('../models/Task');
const Developer = require('../models/Developer');
const Sprint = require('../models/Sprint');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/tasks
router.get('/', auth, async (req, res) => {
  try {
    const { status, assignedTo, sprintId, backlog, sort } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (sprintId) filter.sprintId = sprintId;
    if (backlog === 'true') filter.sprintId = null;

    let query = Task.find(filter)
      .populate('assignedTo', 'name email avatar')
      .populate('sprintId', 'name status startDate endDate')
      .populate('dependencies', 'title status');
    if (sort === 'deadline') query = query.sort({ deadline: 1 });
    else if (sort === 'priorityRank') query = query.sort({ priorityRank: 1, createdAt: -1 });
    else query = query.sort({ createdAt: -1 });

    const tasks = await query;
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/tasks
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      assignedTo,
      deadline,
      priority,
      priorityRank,
      status,
      sprintId,
      type,
      storyPoints,
      estimateHours,
      isBlocked,
      blockedReason,
      dependencies,
      acceptanceCriteria,
    } = req.body;

    if (sprintId) {
      const sprint = await Sprint.findById(sprintId);
      if (!sprint) {
        return res.status(400).json({ message: 'Invalid sprint selected' });
      }
      if (sprint.status === 'Completed') {
        return res.status(400).json({ message: 'Cannot add task to a completed sprint' });
      }
      if (sprint.status === 'Planning' && status === 'Completed') {
        return res.status(400).json({ message: 'Task cannot be completed in a planning sprint' });
      }
    }

    const dependencyIds = Array.isArray(dependencies) ? dependencies.filter(Boolean) : [];
    if (dependencyIds.length > 0) {
      const existingDeps = await Task.countDocuments({ _id: { $in: dependencyIds } });
      if (existingDeps !== dependencyIds.length) {
        return res.status(400).json({ message: 'Some dependency tasks were not found' });
      }
    }

    const normalizedCriteria = Array.isArray(acceptanceCriteria)
      ? acceptanceCriteria.map((c) => String(c).trim()).filter(Boolean)
      : [];

    if (isBlocked && !blockedReason) {
      return res.status(400).json({ message: 'Blocked reason is required when task is blocked' });
    }

    let assignedToName = '';
    if (assignedTo) {
      const dev = await Developer.findById(assignedTo);
      if (dev) {
        assignedToName = dev.name;
        dev.tasksAssigned = (dev.tasksAssigned || 0) + 1;
        await dev.save();
      }
    }

    const task = new Task({
      title,
      description,
      ...(assignedTo ? { assignedTo } : {}),
      assignedToName,
      ...(sprintId ? { sprintId } : {}),
      type: type || 'Feature',
      storyPoints: storyPoints || 1,
      estimateHours: estimateHours || 0,
      priorityRank: priorityRank || 3,
      isBlocked: Boolean(isBlocked),
      blockedReason: blockedReason || '',
      dependencies: dependencyIds,
      acceptanceCriteria: normalizedCriteria,
      deadline,
      priority: priority || 'Medium',
      status: status || 'Pending',
      createdBy: req.user._id,
    });

    if (dependencyIds.length > 0 && task.status !== 'Pending') {
      const dependencyTasks = await Task.find({ _id: { $in: dependencyIds } }).select('status');
      const hasIncompleteDependency = dependencyTasks.some((dep) => dep.status !== 'Completed');
      if (hasIncompleteDependency) {
        return res.status(400).json({
          message: 'Task with incomplete dependencies must start as Pending',
        });
      }
    }

    if (task.isBlocked && task.status !== 'Pending') {
      return res.status(400).json({ message: 'Blocked task must stay in Pending status' });
    }

    await task.save();
    const createdTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar')
      .populate('sprintId', 'name status startDate endDate')
      .populate('dependencies', 'title status');

    res.status(201).json(createdTask);
    
    // Emit real-time update
    if (req.io) req.io.emit('DATA_UPDATED', { message: 'Task created', task: createdTask._id });
    
  } catch (error) {
    console.error('Task Create Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const prevStatus = task.status;
    
    // Fix empty string cast error for assignedTo
    if (req.body.assignedTo === '') {
      req.body.assignedTo = null;
      req.body.assignedToName = '';
    } else if (req.body.assignedTo && req.body.assignedTo !== String(task.assignedTo)) {
      const dev = await Developer.findById(req.body.assignedTo);
      if (dev) req.body.assignedToName = dev.name;
    }

    if (req.body.sprintId === '') {
      req.body.sprintId = null;
    } else if (req.body.sprintId) {
      const sprint = await Sprint.findById(req.body.sprintId);
      if (!sprint) {
        return res.status(400).json({ message: 'Invalid sprint selected' });
      }
      if (sprint.status === 'Completed') {
        return res.status(400).json({ message: 'Cannot move task to a completed sprint' });
      }
      if (sprint.status === 'Planning' && status === 'Completed') {
        return res.status(400).json({ message: 'Task cannot be completed in a planning sprint' });
      }
    }

    if (req.body.dependencies) {
      const dependencyIds = req.body.dependencies.filter(Boolean);
      if (dependencyIds.some((id) => String(id) === String(task._id))) {
        return res.status(400).json({ message: 'Task cannot depend on itself' });
      }

      const existingDeps = await Task.countDocuments({ _id: { $in: dependencyIds } });
      if (existingDeps !== dependencyIds.length) {
        return res.status(400).json({ message: 'Some dependency tasks were not found' });
      }
    }

    if (req.body.acceptanceCriteria) {
      req.body.acceptanceCriteria = req.body.acceptanceCriteria
        .map((c) => String(c).trim())
        .filter(Boolean);
    }

    const isBlocked = req.body.isBlocked !== undefined ? Boolean(req.body.isBlocked) : task.isBlocked;
    const blockedReason = req.body.blockedReason !== undefined ? req.body.blockedReason : task.blockedReason;
    if (isBlocked && !blockedReason) {
      return res.status(400).json({ message: 'Blocked reason is required when task is blocked' });
    }

    if (isBlocked && status && status !== 'Pending') {
      return res.status(400).json({ message: 'Blocked task must stay in Pending status' });
    }

    const nextStatus = status || task.status;
    const nextDependencies = req.body.dependencies || task.dependencies || [];
    if (nextDependencies.length > 0 && nextStatus !== 'Pending') {
      const dependencyTasks = await Task.find({ _id: { $in: nextDependencies } }).select('status');
      const hasIncompleteDependency = dependencyTasks.some((dep) => dep.status !== 'Completed');
      if (hasIncompleteDependency) {
        return res.status(400).json({
          message: 'Cannot move task forward until all dependencies are completed',
        });
      }
    }

    Object.assign(task, req.body);

    if (status === 'Completed' && prevStatus !== 'Completed') {
      task.completedAt = new Date();
      if (task.assignedTo) {
        const dev = await Developer.findById(task.assignedTo);
        if (dev) {
          dev.tasksCompleted = (dev.tasksCompleted || 0) + 1;
          dev.calculateProductivityScore();
          await dev.save();
        }
      }
    }

    await task.save();
    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar')
      .populate('sprintId', 'name status startDate endDate')
      .populate('dependencies', 'title status');
    res.json(updatedTask);
    
    // Emit real-time update
    if (req.io) req.io.emit('DATA_UPDATED', { message: 'Task updated', task: updatedTask._id });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    // Emit real-time update
    if (req.io) req.io.emit('DATA_UPDATED', { message: 'Task deleted' });

    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
