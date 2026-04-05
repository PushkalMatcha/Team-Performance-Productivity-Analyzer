import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getTasks, updateTask } from '../services/api';
import { DndContext, closestCenter, useDroppable, useDraggable, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { HiOutlineClock, HiOutlineExclamationCircle } from 'react-icons/hi';

const statusColors = {
  Pending: 'bg-warning/20 text-warning',
  'In Progress': 'bg-primary/20 text-primary-light',
  Completed: 'bg-success/20 text-success',
};

const priorityColors = {
  High: 'bg-danger/10 text-danger border border-danger/20',
  Medium: 'bg-warning/10 text-warning border border-warning/20',
  Low: 'bg-success/10 text-success border border-success/20',
};

function KanbanCardContent({ task, isDragging, isOverlay }) {
  return (
    <div 
      className={`p-4 mb-3 rounded-xl bg-surface border shadow-sm transition-colors duration-200 cursor-grab active:cursor-grabbing group
        ${isOverlay ? 'border-primary ring-2 ring-primary/50 scale-[1.02] shadow-2xl z-50 bg-surface-light' : 'border-border'}
        ${isDragging && !isOverlay ? 'opacity-30 border-dashed border-primary bg-surface-lighter/50' : ''}
        ${task.isBlocked ? 'border-l-4 border-l-danger bg-danger/5' : ''}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-semibold text-text-primary line-clamp-2">{task.title}</h4>
      </div>
      
      {task.isBlocked && (
        <div className="flex items-center gap-1 text-[10px] text-danger mb-2 bg-danger/10 p-1 rounded font-medium">
          <HiOutlineExclamationCircle /> Blocked: {task.blockedReason}
        </div>
      )}

      <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
          {task.priority || 'Medium'}
        </span>
        <div className="flex items-center gap-2">
          {task.storyPoints && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-lighter text-text-secondary border border-border">
              {task.storyPoints} pts
            </span>
          )}
          {task.assignedTo && (
             <div 
                className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                title={task.assignedTo.name}
             >
               {task.assignedTo.name.charAt(0).toUpperCase()}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanCard({ task }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task._id,
    data: task,
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <KanbanCardContent task={task} isDragging={isDragging} />
    </div>
  );
}

function KanbanColumn({ status, tasks }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`flex flex-col rounded-2xl min-h-[600px] border-2 transition-all duration-300
        ${isOver ? 'bg-primary/5 border-primary/40 shadow-inner' : 'bg-surface/50 border-transparent'}
      `}
    >
      <div className="p-4 border-b border-border/50 sticky top-0 bg-surface-light/90 backdrop-blur-md rounded-t-xl z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status].split(' ')[0]}`} />
          <h3 className="text-sm font-bold text-text-primary tracking-wide">{status}</h3>
        </div>
        <span className="text-xs font-semibold text-text-secondary bg-surface px-2 py-1 rounded-md border border-border">
          {tasks.length}
        </span>
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto">
        {tasks.map(task => <KanbanCard key={task._id} task={task} />)}
        {tasks.length === 0 && (
          <div className="h-full flex items-center justify-center text-text-secondary text-sm italic opacity-50 border-2 border-dashed border-border/50 rounded-xl m-2">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const tasksRes = await getTasks();
      setTasks(tasksRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    const socket = io('http://localhost:5000');
    socket.on('DATA_UPDATED', () => fetchData());
    return () => socket.disconnect();
  }, [fetchData]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDragEnd = async (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const newStatus = over.id;

    const task = tasks.find(t => t._id === taskId);
    if (!task || task.status === newStatus) return;
    
    // Prevent dragging blocked tasks to Complete
    if (task.isBlocked && newStatus !== 'Pending') {
      alert("Blocked tasks must remain in 'Pending' until unblocked!");
      return;
    }

    // Optimistic UI push
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));

    try {
      await updateTask(taskId, { status: newStatus });
    } catch(e) {
      alert(e.response?.data?.message || "Error updating task status");
      fetchData(); // Rollback on failure
    }
  };

  const activeTask = tasks.find(t => t._id === activeId);

  const columns = ['Pending', 'In Progress', 'Completed'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
      <div className="animate-fade-in-up flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Kanban Board</h1>
          <p className="text-text-secondary mt-1">Drag and drop tasks across workflow stages</p>
        </div>
      </div>

      <DndContext 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart} 
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
          {columns.map(status => (
            <KanbanColumn 
              key={status} 
              status={status} 
              tasks={tasks.filter(t => t.status === status).sort((a,b) => b.priorityRank - a.priorityRank)} 
            />
          ))}
        </div>
        
        <DragOverlay dropAnimation={{
          duration: 250,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
        }}>
          {activeTask ? <KanbanCardContent task={activeTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
