import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Team() {
  const [users, setUsers] = useState([]);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/v1/users', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setUsers(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (currentUser.role === 'ADMIN') {
      fetchUsers();
    }
  }, [currentUser.role]);

  if (currentUser.role !== 'ADMIN') {
    return <div>Access Denied. Admins only.</div>;
  }

  return (
    <div>
      <h1>Team Members</h1>
      <div className="item-list">
        {users.map(u => (
          <div key={u.id} className="item-card">
            <div>
              <div className="item-title">{u.name}</div>
              <div className="item-desc">{u.email}</div>
            </div>
            <div>
              <span className={`badge ${u.role === 'ADMIN' ? 'todo' : 'done'}`}>{u.role}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
