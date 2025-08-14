import React from 'react';
import useAIChat from './hooks/useAIChat';

export default function AIChatWidget() {
  const { hasNewSuggestion, contextSources, openPanel } = useAIChat();

  // 只呈現懸浮小球，面板由 AIChatPanel 控制
  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 2000 }}>
      <div
        onClick={() => {
          try {
            window.dispatchEvent(new Event('ai:openPanel'));
          } catch {}
          openPanel();
        }}
        title="智能客服"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: hasNewSuggestion ? '#22c55e' : '#0ea5e9',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget.querySelector('.ai-balloon');
          if (el) el.style.opacity = 1;
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget.querySelector('.ai-balloon');
          if (el) el.style.opacity = 0;
        }}
      >
        💬
        <div
          className="ai-balloon"
          style={{
            position: 'absolute',
            right: 70,
            bottom: 10,
            background: '#1f2937',
            color: '#e5e7eb',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            transition: 'opacity 0.2s ease',
            opacity: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
          }}
        >
          智能客服
          {contextSources && contextSources.length > 0 && (
            <div style={{ marginTop: 4, opacity: 0.8 }}>來源：{contextSources.join('、')}</div>
          )}
        </div>
      </div>
    </div>
  );
}

