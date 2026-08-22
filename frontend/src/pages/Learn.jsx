import { useState } from 'react';
import { BookOpen, PlayCircle, NotebookText } from 'lucide-react';
import LearnLibrary from './LearnLibrary';
import LearnVideos from './LearnVideos';
import LearnGuides from './LearnGuides';

export default function Learn() {
  const [tab, setTab] = useState('library');

  const TABS = [
    { key: 'library', label: 'Component Library', Icon: BookOpen },
    { key: 'videos',  label: 'Video Lessons',      Icon: PlayCircle },
    { key: 'guides',  label: 'Guides & Articles',  Icon: NotebookText },
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 88px)', minHeight: 0 }}>

      <div className="fade-in-up" style={{ display: 'flex', gap: 8, marginBottom: 14, flexShrink: 0 }}>
        {TABS.map(t => (
          <div key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? '' : 'card card-hover'}
            style={{
              padding: '10px 20px', borderRadius: 14, fontSize: 12.5, cursor: 'pointer', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
              background: tab === t.key ? 'linear-gradient(120deg, #1e3a5f, #16496b)' : '#fff',
              color: tab === t.key ? '#7dd3fc' : 'var(--text-secondary)',
              boxShadow: tab === t.key ? 'var(--shadow-md)' : 'none',
              transition: 'all 200ms ease',
            }}>
            <t.Icon size={16} /> {t.label}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {tab === 'library' && <LearnLibrary />}
        {tab === 'videos'  && <LearnVideos />}
        {tab === 'guides'  && <LearnGuides />}
      </div>
    </div>
  );
}
