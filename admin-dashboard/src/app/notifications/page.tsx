'use client';

import { useState } from 'react';
import Sidebar from '../Sidebar';
import { sendPushNotification } from '../actions';

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; sentCount: number } | null>(null);

  async function handleSend() {
    if (!title || !body) return;
    setSending(true);
    setResult(null);
    try {
      const res = await sendPushNotification(title, body);
      setResult(res);
      if (res.success) {
        setTitle('');
        setBody('');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to send notifications');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="dashboard-content">
        <header className="content-header">
          <div>
            <h1>Push Notifications</h1>
            <p>Send messages to your mobile users</p>
          </div>
        </header>

        <div className="glass-panel main-section" style={{ maxWidth: '600px' }}>
          <div className="section-header">
            <h2>Compose Notification</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
            <div className="input-group">
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.5rem', display: 'block' }}>
                Notification Title
              </label>
              <input
                type="text"
                placeholder="e.g. New Feature Alert!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div className="input-group">
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.5rem', display: 'block' }}>
                Message Body
              </label>
              <textarea
                placeholder="Write your message here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={sending || !title || !body}
              style={{ padding: '0.75rem' }}
            >
              {sending ? 'Sending...' : 'Send to All Users'}
            </button>

            {result && (
              <div className={`glass-panel ${result.success ? 'positive' : 'negative'}`} style={{ padding: '1rem', marginTop: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  {result.success 
                    ? `✓ Successfully sent to ${result.sentCount} devices.`
                    : '✗ Failed to send notifications.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel main-section" style={{ maxWidth: '600px', marginTop: '2rem' }}>
          <div className="section-header">
            <h2>Notification Tips</h2>
          </div>
          <ul style={{ paddingLeft: '1.2rem', color: 'var(--muted)', fontSize: '0.85rem', lineHeight: '1.6' }}>
            <li>Keep titles short and catchy.</li>
            <li>Use body text to provide value or instructions.</li>
            <li>Avoid sending too many notifications to prevent users from disabling them.</li>
            <li>Notifications are delivered via Expo's Push Service.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
