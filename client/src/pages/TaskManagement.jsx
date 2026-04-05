import { useState, useEffect, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getDevelopers,
  getSprints,
  createSprint,
  updateSprint,
  generateTaskDescription,
  SOCKET_URL
} from '../services/api';
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineX,
  HiOutlineSparkles,
} from 'react-icons/hi';

const statusColors = {
  Pending: 'bg-warning/10 text-warning border-warning/20',
  'In Progress': 'bg-primary/10 text-primary-light border-primary/20',
  Completed: 'bg-success/10 text-success border-success/20',
};

const priorityColors = {
  Low: 'text-text-secondary',
  Medium: 'text-accent',
  High: 'text-warning',
  Critical: 'text-danger',
};

const priorityDots = {
  Low: 'bg-text-secondary',
  Medium: 'bg-accent',
  High: 'bg-warning',
  Critical: 'bg-danger animate-pulse',
};

const typeColors = {
  Feature: 'text-primary-light border-primary/20 bg-primary/10',
  Bug: 'text-danger border-danger/20 bg-danger/10',
  Chore: 'text-warning border-warning/20 bg-warning/10',
  Spike: 'text-accent border-accent/20 bg-accent/10',
};

function TaskModal({ isOpen, onClose, onSubmit, task, developers, sprints, allTasks }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    repositoryName: '',
    assignedTo: '',
    sprintId: '',
    deadline: '',
    priority: 'Medium',
    status: 'Pending',
    type: 'Feature',
    storyPoints: 1,
    estimateHours: 0,
    priorityRank: 3,
    isBlocked: false,
    blockedReason: '',
    dependencies: [],
    acceptanceCriteriaText: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        repositoryName: task.repositoryName || '',
        assignedTo: task.assignedTo?._id || task.assignedTo || '',
        sprintId: task.sprintId?._id || task.sprintId || '',
        deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
        priority: task.priority || 'Medium',
        status: task.status || 'Pending',
        type: task.type || 'Feature',
        storyPoints: task.storyPoints || 1,
        estimateHours: task.estimateHours || 0,
        priorityRank: task.priorityRank || 3,
        isBlocked: task.isBlocked || false,
        blockedReason: task.blockedReason || '',
        dependencies: (task.dependencies || []).map((dep) => dep._id || dep),
        acceptanceCriteriaText: (task.acceptanceCriteria || []).join('\n'),
      });
    } else {
      setFormData({
        title: '',
        description: '',
        repositoryName: '',
        assignedTo: '',
        sprintId: '',
        deadline: '',
        priority: 'Medium',
        status: 'Pending',
        type: 'Feature',
        storyPoints: 1,
        estimateHours: 0,
        priorityRank: 3,
        isBlocked: false,
        blockedReason: '',
        dependencies: [],
        acceptanceCriteriaText: '',
      });
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      storyPoints: Number(formData.storyPoints),
      estimateHours: Number(formData.estimateHours),
      priorityRank: Number(formData.priorityRank),
      dependencies: formData.dependencies,
      acceptanceCriteria: formData.acceptanceCriteriaText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    });
  };

  const dependencyCandidates = (allTasks || []).filter((candidate) => candidate._id !== task?._id);

  const handleAutoGenerate = async () => {
    if (!formData.title) return alert('Please enter a Title first!');
    setIsGenerating(true);
    try {
      let assigneeName = '';
      if (formData.assignedTo) {
        const dev = developers.find((d) => d._id === formData.assignedTo);
        if (dev) assigneeName = dev.name;
      }
      const res = await generateTaskDescription({ title: formData.title, assigneeName });
      if (res.data?.description) {
        setFormData(prev => ({ ...prev, description: res.data.description }));
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to auto-generate description');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card p-6 w-full max-w-2xl mx-4 animate-fade-in-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-primary">{task ? 'Edit Task' : 'Create Task'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-lighter text-text-secondary">
            <HiOutlineX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
              placeholder="Enter task title"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">GitHub Repository (Optional)</label>
            <input
              type="text"
              value={formData.repositoryName}
              onChange={(e) => setFormData({ ...formData, repositoryName: e.target.value })}
              className="w-full px-4 py-2.5 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g. backend-api or PushkalMatcha/Project"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm text-text-secondary">Description</label>
              <button 
                type="button" 
                onClick={handleAutoGenerate}
                disabled={isGenerating || !formData.title}
                className="flex items-center gap-1 text-xs text-primary-light hover:text-primary transition-colors disabled:opacity-50"
              >
                <HiOutlineSparkles className={isGenerating ? "animate-pulse text-amber-300" : "text-amber-400"} />
                {isGenerating ? 'Generating...' : 'Auto-Generate'}
              </button>
            </div>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors resize-y min-h-[100px] text-sm leading-relaxed"
              placeholder="Describe the task..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Assign To</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
              >
                <option value="">Unassigned</option>
                {developers.map((dev) => (
                  <option key={dev._id} value={dev._id}>{dev.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">Sprint</label>
              <select
                value={formData.sprintId}
                onChange={(e) => setFormData({ ...formData, sprintId: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
              >
                <option value="">Backlog (No sprint)</option>
                {sprints.map((sprint) => (
                  <option key={sprint._id} value={sprint._id}>{sprint.name} ({sprint.status})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Deadline</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">Task Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
              >
                <option value="Feature">Feature</option>
                <option value="Bug">Bug</option>
                <option value="Chore">Chore</option>
                <option value="Spike">Spike</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Story Points</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.storyPoints}
                onChange={(e) => setFormData({ ...formData, storyPoints: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">Estimate Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.estimateHours}
                onChange={(e) => setFormData({ ...formData, estimateHours: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">Priority Rank</label>
              <input
                type="number"
                min="1"
                value={formData.priorityRank}
                onChange={(e) => setFormData({ ...formData, priorityRank: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Blocked</label>
              <select
                value={formData.isBlocked ? 'yes' : 'no'}
                onChange={(e) => setFormData({ ...formData, isBlocked: e.target.value === 'yes' })}
                className="w-full px-4 py-2.5 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">Dependency Tasks</label>
              <select
                multiple
                value={formData.dependencies}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                  setFormData({ ...formData, dependencies: selected });
                }}
                className="w-full px-3 py-2 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors min-h-[96px]"
              >
                {dependencyCandidates.map((candidate) => (
                  <option key={candidate._id} value={candidate._id}>
                    {candidate.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formData.isBlocked && (
            <div>
              <label className="block text-sm text-text-secondary mb-1">Blocked Reason</label>
              <input
                type="text"
                value={formData.blockedReason}
                onChange={(e) => setFormData({ ...formData, blockedReason: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
                placeholder="What is blocking this task?"
                required={formData.isBlocked}
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-text-secondary mb-1">Acceptance Criteria (one per line)</label>
            <textarea
              value={formData.acceptanceCriteriaText}
              onChange={(e) => setFormData({ ...formData, acceptanceCriteriaText: e.target.value })}
              className="w-full px-4 py-2.5 bg-surface rounded-xl border border-border text-text-primary focus:outline-none focus:border-primary transition-colors resize-none h-24"
              placeholder={"Given...\nWhen...\nThen..."}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary hover:bg-surface-lighter transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-medium hover:shadow-lg hover:shadow-primary/25 transition-all"
            >
              {task ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TaskManagement() {
  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sprintFilter, setSprintFilter] = useState('all');
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintGoal, setNewSprintGoal] = useState('');
  const [newSprintStartDate, setNewSprintStartDate] = useState('');
  const [newSprintEndDate, setNewSprintEndDate] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, devsRes, sprintsRes] = await Promise.all([
        getTasks(),
        getDevelopers(),
        getSprints(),
      ]);
      setTasks(tasksRes.data);
      setDevelopers(devsRes.data);
      setSprints(sprintsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Setup WebSocket connection securely
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      auth: { token }
    });
    
    socket.on('DATA_UPDATED', (payload) => {
      console.log('Real-time task update received:', payload);
      fetchData(); // Refetch tasks transparently whenever server emits a change
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchData]);

  const handleCreate = async (data) => {
    try {
      await createTask(data);
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateTask(editingTask._id, data);
      setModalOpen(false);
      setEditingTask(null);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(id);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      await updateTask(task._id, { status: newStatus });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateSprint = async () => {
    if (!newSprintName || !newSprintStartDate || !newSprintEndDate) return;
    try {
      await createSprint({
        name: newSprintName,
        goal: newSprintGoal,
        startDate: newSprintStartDate,
        endDate: newSprintEndDate,
        status: 'Planning',
      });
      setNewSprintName('');
      setNewSprintGoal('');
      setNewSprintStartDate('');
      setNewSprintEndDate('');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create sprint');
    }
  };

  const handleSprintTransition = async (sprint) => {
    const nextStatus = sprint.status === 'Planning' ? 'Active' : sprint.status === 'Active' ? 'Completed' : null;
    if (!nextStatus) return;
    try {
      await updateSprint(sprint._id, { status: nextStatus });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to transition sprint');
    }
  };

  const filteredTasks = useMemo(() => {
    let result = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

    if (sprintFilter === 'backlog') {
      result = result.filter((t) => !t.sprintId);
    } else if (sprintFilter !== 'all') {
      result = result.filter((t) => {
        const sprintId = t.sprintId?._id || t.sprintId;
        return sprintId === sprintFilter;
      });
    }

    return result;
  }, [tasks, filter, sprintFilter]);

  const isOverdue = (task) => task.status !== 'Completed' && new Date(task.deadline) < new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const taskCounts = {
    all: tasks.length,
    Pending: tasks.filter((t) => t.status === 'Pending').length,
    'In Progress': tasks.filter((t) => t.status === 'In Progress').length,
    Completed: tasks.filter((t) => t.status === 'Completed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Task Management</h1>
          <p className="text-text-secondary mt-1">Create, assign, and plan tasks across sprints</p>
        </div>
        <button
          onClick={() => { setEditingTask(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-medium hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-95"
        >
          <HiOutlinePlus />
          New Task
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 animate-fade-in-up-delay-1">
        <div className="flex flex-wrap gap-2">
          {['all', 'Pending', 'In Progress', 'Completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                filter === status
                  ? 'bg-primary/15 text-primary-light border border-primary/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-lighter/50'
              }`}
            >
              {status === 'all' ? 'All' : status}
              <span className="ml-2 text-xs opacity-70">({taskCounts[status]})</span>
            </button>
          ))}
        </div>

        <div className="lg:ml-auto w-full lg:w-72">
          <select
            value={sprintFilter}
            onChange={(e) => setSprintFilter(e.target.value)}
            className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="all">All Sprints</option>
            <option value="backlog">Backlog Only</option>
            {sprints.map((sprint) => (
              <option key={sprint._id} value={sprint._id}>{sprint.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-card p-4 animate-fade-in-up-delay-1">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Sprint Lifecycle</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {sprints.length === 0 ? (
              <p className="text-sm text-text-secondary">No sprints yet. Create one to start planning.</p>
            ) : (
              sprints.map((sprint) => (
                <div key={sprint._id} className="p-3 rounded-xl border border-border bg-surface-lighter/20 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{sprint.name}</p>
                    <p className="text-xs text-text-secondary">{new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[11px] px-2 py-1 rounded-lg border border-border text-text-secondary">{sprint.status}</span>
                  {sprint.status !== 'Completed' && (
                    <button
                      onClick={() => handleSprintTransition(sprint)}
                      className="px-2.5 py-1.5 text-xs rounded-lg bg-primary/15 text-primary-light hover:bg-primary/25"
                    >
                      {sprint.status === 'Planning' ? 'Activate' : 'Complete'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={newSprintName}
              onChange={(e) => setNewSprintName(e.target.value)}
              placeholder="Sprint name"
              className="px-3 py-2 bg-surface rounded-lg border border-border text-sm text-text-primary"
            />
            <input
              type="text"
              value={newSprintGoal}
              onChange={(e) => setNewSprintGoal(e.target.value)}
              placeholder="Sprint goal"
              className="px-3 py-2 bg-surface rounded-lg border border-border text-sm text-text-primary"
            />
            <input
              type="date"
              value={newSprintStartDate}
              onChange={(e) => setNewSprintStartDate(e.target.value)}
              className="px-3 py-2 bg-surface rounded-lg border border-border text-sm text-text-primary"
            />
            <input
              type="date"
              value={newSprintEndDate}
              onChange={(e) => setNewSprintEndDate(e.target.value)}
              className="px-3 py-2 bg-surface rounded-lg border border-border text-sm text-text-primary"
            />
            <button
              onClick={handleCreateSprint}
              className="sm:col-span-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary-dark text-sm font-medium text-white"
            >
              Create Planning Sprint
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 animate-fade-in-up-delay-2">
        {filteredTasks.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-text-secondary">No tasks found</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task._id}
              className={`glass-card p-5 hover:border-primary/20 transition-all duration-200 ${
                isOverdue(task) ? 'border-danger/30' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-2.5 h-2.5 rounded-full mt-2 ${priorityDots[task.priority]}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-text-primary font-semibold">{task.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] border ${typeColors[task.type || 'Feature']}`}>
                      {task.type || 'Feature'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] border border-border text-text-secondary">
                      {task.storyPoints || 1} SP
                    </span>
                    {task.isBlocked && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] border border-danger/30 bg-danger/10 text-danger">
                        Blocked
                      </span>
                    )}
                    {isOverdue(task) && (
                      <span className="flex items-center gap-1 text-xs text-danger">
                        <HiOutlineExclamationCircle /> Overdue
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-sm text-text-secondary mb-2 line-clamp-1">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                    {task.repositoryName && (
                      <span className="flex items-center gap-1 font-semibold text-primary-light bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        📦 {task.repositoryName}
                      </span>
                    )}
                    {task.assignedToName && (
                      <span className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] text-white font-bold">
                          {task.assignedToName.charAt(0)}
                        </div>
                        {task.assignedToName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <HiOutlineClock />
                      {new Date(task.deadline).toLocaleDateString()}
                    </span>
                    <span className={`font-medium ${priorityColors[task.priority]}`}>{task.priority}</span>
                    <span>Rank {task.priorityRank || 3}</span>
                    <span>{task.estimateHours || 0}h est.</span>
                    <span>
                      Sprint: {task.sprintId?.name || 'Backlog'}
                    </span>
                    {(task.dependencies || []).length > 0 && <span>Deps: {(task.dependencies || []).length}</span>}
                  </div>
                  {task.isBlocked && task.blockedReason && (
                    <p className="text-xs text-danger mt-2">Blocked reason: {task.blockedReason}</p>
                  )}
                  {task.acceptanceCriteria?.length > 0 && (
                    <p className="text-xs text-text-secondary mt-1">Criteria: {task.acceptanceCriteria.length} item(s)</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task, e.target.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${statusColors[task.status]} bg-transparent cursor-pointer focus:outline-none`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>

                  <button
                    onClick={() => { setEditingTask(task); setModalOpen(true); }}
                    className="p-2 rounded-lg text-text-secondary hover:text-primary-light hover:bg-primary/10 transition-colors"
                  >
                    <HiOutlinePencil />
                  </button>
                  <button
                    onClick={() => handleDelete(task._id)}
                    className="p-2 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
                  >
                    <HiOutlineTrash />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <TaskModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTask(null); }}
        onSubmit={editingTask ? handleUpdate : handleCreate}
        task={editingTask}
        developers={developers}
        sprints={sprints}
        allTasks={tasks}
      />
    </div>
  );
}
