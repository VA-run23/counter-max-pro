import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function SelectTasks() {
  const [options, setOptions] = useState({ career: [], personal: [] });
  const [selected, setSelected] = useState({ career: [], personal: [], custom: [] });
  const [customTask, setCustomTask] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/tasks/options').then(res => setOptions(res.data)).catch(() => {});
  }, []);

  const toggleTask = (category, taskId) => {
    setSelected(prev => ({
      ...prev,
      [category]: prev[category].includes(taskId)
        ? prev[category].filter(id => id !== taskId)
        : [...prev[category], taskId]
    }));
  };

  const addCustom = () => {
    if (customTask.trim() && !selected.custom.includes(customTask.trim())) {
      setSelected(prev => ({ ...prev, custom: [...prev.custom, customTask.trim()] }));
      setCustomTask('');
    }
  };

  const removeCustom = (task) => {
    setSelected(prev => ({ ...prev, custom: prev.custom.filter(t => t !== task) }));
  };

  const handleSubmit = async () => {
    const total = selected.career.length + selected.personal.length + selected.custom.length;
    if (total === 0) return toast.error('Select at least one task');
    
    setLoading(true);
    try {
      await api.put('/users/tasks', { selectedTasks: selected });
      toast.success('Tasks saved!');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Failed to save tasks');
    } finally {
      setLoading(false);
    }
  };

  const TaskCard = ({ task, category }) => {
    const isSelected = selected[category].includes(task.id);
    return (
      <div className={`task-option ${isSelected ? 'selected' : ''}`} onClick={() => toggleTask(category, task.id)}>
        <span className="task-icon">{task.icon}</span>
        <span className="task-name">{task.name}</span>
        {isSelected && <span className="check">✓</span>}
      </div>
    );
  };

  return (
    <div className="select-tasks-container">
      <h1>🎯 Choose Your Goals</h1>
      <p>Select activities you want to track daily</p>

      <section>
        <h2>💼 Career Goals</h2>
        <div className="task-grid">
          {options.career.map(task => <TaskCard key={task.id} task={task} category="career" />)}
        </div>
      </section>

      <section>
        <h2>🌱 Personal Goals</h2>
        <div className="task-grid">
          {options.personal.map(task => <TaskCard key={task.id} task={task} category="personal" />)}
        </div>
      </section>

      <section>
        <h2>✨ Custom Goals</h2>
        <div className="custom-tasks">
          {selected.custom.map(task => (
            <div key={task} className="custom-tag">
              {task} <button onClick={() => removeCustom(task)}>×</button>
            </div>
          ))}
        </div>
        <div className="add-custom">
          <input value={customTask} onChange={e => setCustomTask(e.target.value)} placeholder="Add custom goal..." 
            onKeyDown={e => e.key === 'Enter' && addCustom()} maxLength={50} />
          <button onClick={addCustom}>Add</button>
        </div>
      </section>

      <div className="submit-section">
        <p>Selected: {selected.career.length + selected.personal.length + selected.custom.length} goals</p>
        <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : 'Continue to Dashboard 🚀'}
        </button>
      </div>
    </div>
  );
}
