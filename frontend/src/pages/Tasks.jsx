import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', projectId: '', assigneeId: '' });
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchTasks = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/v1/tasks', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDeps = async () => {
    try {
      const [projRes, usersRes] = await Promise.all([
        axios.get('http://localhost:3000/api/v1/projects', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        currentUser.role === 'ADMIN' ? axios.get('http://localhost:3000/api/v1/users', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }) : Promise.resolve({ data: [] })
      ]);
      setProjects(projRes.data);
      if (usersRes.data) setUsers(usersRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchDeps();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/v1/tasks', newTask, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowModal(false);
      setNewTask({ title: '', description: '', projectId: '', assigneeId: '' });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`http://localhost:3000/api/v1/tasks/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Tasks</h1>
        <button className="btn" style={{ width: 'auto' }} onClick={() => setShowModal(true)}>
          + New Task
        </button>
      </div>

      <div className="item-list">
        {tasks.map(t => (
          <div key={t.id} className="item-card">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="item-title">{t.title}</span>
                <span className={`badge ${t.status.toLowerCase()}`}>{t.status.replace('_', ' ')}</span>
              </div>
              <div className="item-desc">{t.description}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                Project: {t.project?.name} | Assignee: {t.assignee?.name || 'Unassigned'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <select value={t.status} onChange={e => updateStatus(t.id, e.target.value)} style={{ padding: '5px' }}>
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Create Task</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Title</label>
                <input required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Project</label>
                <select required value={newTask.projectId} onChange={e => setNewTask({...newTask, projectId: e.target.value})}>
                  <option value="">Select a project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {currentUser.role === 'ADMIN' && (
                <div className="form-group">
                  <label>Assignee</label>
                  <select value={newTask.assigneeId} onChange={e => setNewTask({...newTask, assigneeId: e.target.value})}>
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn" style={{ background: '#ccc' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
