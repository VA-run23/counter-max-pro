import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler } from 'chart.js';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

const ICONS = { github: '💻', leetcode: '🧩', gfg: '📚', chess: '♟️', detox: '🧘', screentime: '📱', running: '🏃', gym: '💪', yoga: '🧘‍♀️', swimming: '🏊', productivity: '⭐' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [viewMode, setViewMode] = useState('table');
  const [periodView, setPeriodView] = useState('week'); // 'week' or 'month'
  const [editingMin, setEditingMin] = useState(false);
  const [minTasks, setMinTasks] = useState(3);
  const { logout } = useAuth();

  const loadDashboard = async () => {
    try {
      const res = await api.get('/tasks/dashboard');
      setData(res.data);
      setMinTasks(res.data.streakSettings?.minTasksRequired || 3);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const toggleTask = async (taskId, completed) => {
    setUpdating(prev => ({ ...prev, [taskId]: true }));
    try {
      await api.post(`/tasks/${taskId}/complete`, { completed });
      await loadDashboard();
      toast.success(completed ? 'Task completed! 🎉' : 'Task unchecked');
    } catch (err) {
      toast.error('Failed to update task');
    } finally {
      setUpdating(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const updateMinTasks = async () => {
    try {
      await api.put('/tasks/settings', { minTasksRequired: minTasks });
      toast.success('Streak settings updated');
      setEditingMin(false);
      loadDashboard();
    } catch (err) {
      toast.error('Failed to update settings');
    }
  };

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!data) return <div className="error-screen">Failed to load data</div>;

  const chartData = {
    labels: data.chartData.slice(-14).map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Completion %',
      data: data.chartData.slice(-14).map(d => d.percentage),
      borderColor: '#00ff88',
      backgroundColor: 'rgba(0, 255, 136, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const streakProgress = data.stats.completedToday / data.streakSettings.minTasksRequired * 100;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome, {data.user.name} 👋</h1>
          <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="header-actions">
          {data.user.isAdmin && <Link to="/admin" className="btn btn-secondary">Admin</Link>}
          <Link to="/select-tasks" className="btn btn-secondary">Edit Goals</Link>
          <button onClick={logout} className="btn btn-outline">Logout</button>
        </div>
      </header>

      {/* Global Streak Card */}
      <div className="global-streak-card">
        <div className="streak-main">
          <div className="streak-fire">🔥</div>
          <div className="streak-info">
            <h2>{data.globalStreak.currentStreak} Day Streak</h2>
            <p>Best: {data.globalStreak.bestStreak} days</p>
          </div>
        </div>
        <div className="streak-progress-section">
          <div className="streak-progress-header">
            <span>Today's Progress: {data.stats.progressToStreak}</span>
            {data.stats.streakEarned ? (
              <span className="streak-earned">✓ Streak Earned!</span>
            ) : (
              <span className="streak-pending">Complete {data.streakSettings.minTasksRequired - data.stats.completedToday} more</span>
            )}
          </div>
          <div className="streak-progress-bar">
            <div className="streak-progress-fill" style={{ width: `${Math.min(streakProgress, 100)}%` }}></div>
          </div>
          <div className="streak-settings">
            {editingMin ? (
              <div className="min-tasks-edit">
                <span>Min tasks for streak:</span>
                <input type="number" min="1" max={data.tasks.length || 10} value={minTasks} onChange={e => setMinTasks(parseInt(e.target.value) || 1)} />
                <button onClick={updateMinTasks} className="btn btn-sm btn-primary">Save</button>
                <button onClick={() => setEditingMin(false)} className="btn btn-sm btn-outline">Cancel</button>
              </div>
            ) : (
              <button className="btn-link" onClick={() => setEditingMin(true)}>
                ⚙️ Min {data.streakSettings.minTasksRequired} tasks/day for streak
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <h3>{data.stats.completedToday}/{data.stats.totalTasks}</h3>
          <p>Completed Today</p>
        </div>
        <div className="stat-card success">
          <h3>{data.stats.completionRate}%</h3>
          <p>Completion Rate</p>
        </div>
        <div className="stat-card info">
          <h3>{data.globalStreak.currentStreak}</h3>
          <p>Current Streak</p>
        </div>
        <div className="stat-card warning">
          <h3>{data.globalStreak.bestStreak}</h3>
          <p>Best Streak</p>
        </div>
      </div>

      <div className="chart-section">
        <h2>📊 14-Day Progress</h2>
        <div className="chart-container">
          <Line data={chartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }} />
        </div>
      </div>

      <div className="tasks-section">
        <div className="tasks-header">
          <h2>🗂 Today's Tasks</h2>
          <div className="header-controls">
            <div className="period-toggle">
              <button className={`toggle-btn ${periodView === 'week' ? 'active' : ''}`} onClick={() => setPeriodView('week')}>Week</button>
              <button className={`toggle-btn ${periodView === 'month' ? 'active' : ''}`} onClick={() => setPeriodView('month')}>Month</button>
            </div>
            <div className="view-toggle">
              <button className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')}>▦ Cards</button>
              <button className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>☰ Table</button>
            </div>
          </div>
        </div>

        {data.tasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks selected yet</p>
            <Link to="/select-tasks" className="btn btn-primary">Select Tasks</Link>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="tasks-grid">
            {data.tasks.map(task => (
              <div key={task.id} className={`task-card ${task.completed ? 'completed' : ''}`}>
                <div className="task-header">
                  <span className="task-icon">{ICONS[task.id] || '🎯'}</span>
                  <h3>{task.name}</h3>
                </div>
                <div className="task-stats">
                  <div>
                    <span className="stat-value">{periodView === 'week' ? task.weekCompleted : task.monthCompleted}</span>
                    <span className="stat-label">{periodView === 'week' ? 'This Week' : 'This Month'}</span>
                  </div>
                </div>
                <button 
                  className={`btn ${task.completed ? 'btn-done' : 'btn-complete'}`}
                  onClick={() => toggleTask(task.id, !task.completed)}
                  disabled={updating[task.id]}
                >
                  {updating[task.id] ? '...' : task.completed ? '✓ Completed' : 'Mark Complete'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="tasks-table-container">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>{periodView === 'week' ? 'This Week' : 'This Month'}</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {data.tasks.map(task => (
                  <tr key={task.id} className={task.completed ? 'row-completed' : ''}>
                    <td className="task-name-cell">
                      <span className="task-icon">{ICONS[task.id] || '🎯'}</span>
                      {task.name}
                    </td>
                    <td>
                      <span className="period-badge">
                        📅 {periodView === 'week' ? `${task.weekCompleted}/7` : `${task.monthCompleted}/30`}
                      </span>
                    </td>
                    <td>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={task.completed}
                          disabled={updating[task.id]}
                          onChange={() => toggleTask(task.id, !task.completed)}
                        />
                        <span className="slider"></span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer className="dashboard-footer">
        <p>🔥 Complete {data.streakSettings.minTasksRequired}+ tasks daily to maintain your streak!</p>
      </footer>
    </div>
  );
}
