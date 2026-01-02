import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../api/axios';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [whatsappStatus, setWhatsappStatus] = useState({ enabled: false });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/admin/users'),
      api.get('/admin/leaderboard'),
      api.get('/whatsapp/status').catch(() => ({ data: { enabled: false } }))
    ]).then(([usersRes, leaderRes, waRes]) => {
      setUsers(usersRes.data.users);
      setLeaderboard(leaderRes.data.leaderboard);
      setWhatsappStatus(waRes.data);
    }).catch(() => toast.error('Failed to load admin data'))
      .finally(() => setLoading(false));
  }, []);

  const sendReminders = async () => {
    setSending(true);
    try {
      const res = await api.post('/whatsapp/send-reminders');
      toast.success(res.data.message);
    } catch (err) {
      toast.error('Failed to send reminders');
    }
    setSending(false);
  };

  const sendPollToUser = async (userId, userName) => {
    try {
      await api.post(`/whatsapp/send-poll/${userId}`);
      toast.success(`Poll sent to ${userName}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send poll');
    }
  };

  if (loading) return <div className="loading-screen">Loading...</div>;

  const chartData = {
    labels: leaderboard.slice(0, 10).map(u => u.name),
    datasets: [
      { label: 'Current Streak', data: leaderboard.slice(0, 10).map(u => u.totalStreak), backgroundColor: '#00ff88' },
      { label: 'Best Streak', data: leaderboard.slice(0, 10).map(u => u.bestStreak), backgroundColor: '#0088ff' }
    ]
  };

  const activeToday = users.filter(u => u.stats.completedToday > 0).length;

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>📊 Admin Dashboard</h1>
          <p>Track all users' activity and streaks</p>
        </div>
        <div className="header-actions">
          <button 
            className={`btn ${whatsappStatus.enabled ? 'btn-whatsapp' : 'btn-secondary'}`}
            onClick={sendReminders}
            disabled={sending}
          >
            {sending ? '📤 Sending...' : '📱 Send WhatsApp Reminders'}
          </button>
          <Link to="/dashboard" className="btn btn-secondary">← Dashboard</Link>
        </div>
      </header>

      <div className="whatsapp-status">
        <span className={`status-dot ${whatsappStatus.enabled ? 'active' : ''}`}></span>
        WhatsApp: {whatsappStatus.enabled ? 'Connected' : 'Not configured'}
        {!whatsappStatus.enabled && <small> (Set TWILIO_* env vars)</small>}
      </div>

      <div className="stats-grid">
        <div className="stat-card primary"><h3>{users.length}</h3><p>Total Users</p></div>
        <div className="stat-card success"><h3>{activeToday}</h3><p>Active Today</p></div>
        <div className="stat-card info"><h3>{leaderboard[0]?.totalStreak || 0}</h3><p>Top Streak</p></div>
        <div className="stat-card warning"><h3>{users.length ? Math.round((activeToday / users.length) * 100) : 0}%</h3><p>Engagement</p></div>
      </div>

      <div className="chart-section">
        <h2>🏆 Leaderboard</h2>
        <div className="chart-container">
          <Bar data={chartData} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} />
        </div>
      </div>

      <div className="users-section">
        <h2>👥 All Users</h2>
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Today</th>
                <th>Streak</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>{u.firstName} {u.lastName}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || '-'}</td>
                  <td>{u.stats.completedToday}</td>
                  <td>🔥 {u.stats.totalStreak}</td>
                  <td>
                    {u.phone && (
                      <button 
                        className="btn btn-sm btn-whatsapp"
                        onClick={() => sendPollToUser(u._id, u.firstName)}
                      >
                        📱 Send Poll
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
