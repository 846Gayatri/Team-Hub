import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalTasks: 0, myTasks: 0, completedTasks: 0, projects: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/v1/dashboard', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setStats(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <h1>Dashboard Overview</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.projects}</h3>
          <p>Total Projects</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalTasks}</h3>
          <p>Total Tasks</p>
        </div>
        <div className="stat-card">
          <h3>{stats.myTasks}</h3>
          <p>My Tasks</p>
        </div>
        <div className="stat-card">
          <h3>{stats.completedTasks}</h3>
          <p>Completed Tasks</p>
        </div>
      </div>
    </div>
  );
}
