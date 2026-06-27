import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  User, 
  Shield, 
  MapPin, 
  Key, 
  ListRestart, 
  LogOut, 
  Sparkles,
  Wifi,
  RefreshCw
} from 'lucide-react';

export default function Profile({ user, onLogout }) {
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const fetchLogs = async () => {
    if (!user?.employeeId) return;
    try {
      setLogsLoading(true);
      const data = await api.getAuditLogs(user.employeeId);
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  // Format createdAt timestamp to HH:MM:SS
  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  return (
    <div className="profile-page animate-fade">
      <div className="profile-grid">
        {/* Profile Card */}
        <div className="profile-card card glow-effect">
          <div className="avatar-large">
            {user ? user.name[0] : 'A'}
          </div>
          <h3>{user ? user.name : 'Arjun Mehta'}</h3>
          <p className="profile-role">{user ? user.role : 'Sales Admin'}</p>

          <div className="profile-meta-details">
            <div className="meta-row">
              <Shield size={16} />
              <span>Permission: <strong>Write / Edit Registry</strong></span>
            </div>
            <div className="meta-row">
              <MapPin size={16} />
              <span>Allocated Hub: <strong>Ganga Maxx Central Hub B</strong></span>
            </div>
            <div className="meta-row">
              <Wifi size={16} />
              <span>Network State: <strong>Online • Secure SSL</strong></span>
            </div>
          </div>

          <button className="btn btn-danger sign-out-btn" onClick={onLogout}>
            <LogOut size={16} />
            <span>Sign Out Session</span>
          </button>
        </div>

        {/* System activity logs */}
        <div className="logs-card card-solid">
          <div className="logs-header">
            <h4>Workspace Activity Log</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={fetchLogs}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
              >
                <RefreshCw size={13} /> Refresh
              </button>
              <span className="live-pill">Live Stream</span>
            </div>
          </div>
          <p className="logs-desc">Audited record of operations performed during your current active session:</p>
          
          <div className="logs-terminal">
            {logsLoading ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Loading audit logs...</div>
            ) : logs.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No activity recorded yet. Perform an action to see logs.</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="terminal-line">
                  <span className="term-time">[{formatTime(log.createdAt)}]</span>
                  <span className={`term-tag tag-${log.type.toLowerCase()}`}>{log.type}</span>
                  <span className="term-msg">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        .profile-page {
          height: 100%;
        }

        .profile-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 1.5rem;
          align-items: start;
        }

        @media (max-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
        }

        .profile-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2.25rem 1.5rem;
        }

        .avatar-large {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-secondary), var(--color-primary));
          color: #fff;
          font-weight: 800;
          font-size: 2.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.35);
        }

        .profile-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
        }

        .profile-role {
          font-size: 0.85rem;
          color: var(--color-primary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 0.15rem;
          margin-bottom: 1.5rem;
        }

        .profile-meta-details {
          width: 100%;
          border-top: 1px solid var(--border-color);
          padding-top: 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          text-align: left;
        }

        .meta-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .meta-row strong {
          color: var(--text-primary);
        }

        .sign-out-btn {
          width: 100%;
        }

        /* Terminal Activity Logs */
        .logs-card {
          padding: 1.5rem;
        }

        .logs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .logs-header h4 {
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
        }

        .live-pill {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-success);
          background: var(--color-success-bg);
          border: 1px solid rgba(16, 185, 129, 0.15);
          padding: 0.15rem 0.5rem;
          border-radius: 9999px;
          text-transform: uppercase;
        }

        .logs-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 1.25rem;
        }

        .logs-terminal {
          background: #07090e;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.25rem;
          font-family: monospace;
          font-size: 0.8rem;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          min-height: 280px;
          max-height: 400px;
          overflow-y: auto;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.8);
        }

        .terminal-line {
          display: flex;
          gap: 0.75rem;
          line-height: 1.45;
          align-items: flex-start;
        }

        .term-time {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .term-tag {
          font-weight: 700;
          font-size: 0.7rem;
          padding: 0.05rem 0.35rem;
          border-radius: 4px;
          text-transform: uppercase;
          flex-shrink: 0;
          width: 75px;
          text-align: center;
        }

        .tag-session { background: rgba(99, 102, 241, 0.15); color: var(--color-primary); }
        .tag-order { background: rgba(168, 85, 247, 0.15); color: var(--color-secondary); }
        .tag-dispatch { background: rgba(14, 165, 233, 0.15); color: var(--color-info); }
        .tag-credit { background: rgba(239, 68, 68, 0.15); color: var(--color-error); }
        .tag-inventory { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }

        .term-msg {
          color: #f1f5f9;
        }
      `}</style>
    </div>
  );
}
