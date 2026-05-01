import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchProjects = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/v1/projects', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/v1/projects', newProject, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowModal(false);
      setNewProject({ name: '', description: '' });
      fetchProjects();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Projects</h1>
        {user.role === 'ADMIN' && (
          <button className="btn" style={{ width: 'auto' }} onClick={() => setShowModal(true)}>
            + New Project
          </button>
        )}
      </div>

      <div className="item-list">
        {projects.map(p => (
          <div key={p.id} className="item-card">
            <div>
              <div className="item-title">{p.name}</div>
              <div className="item-desc">{p.description}</div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Created by {p.user?.name}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Create Project</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Name</label>
                <input required value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} />
              </div>
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
