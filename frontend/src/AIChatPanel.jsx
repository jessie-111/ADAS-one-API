import React from 'react';
import useAIChat from './hooks/useAIChat';

// 右側抽屜式對話面板
export default function AIChatPanel() {
  const {
    messages,
    loading,
    error,
    isOpen,
    contextSources,
    closePanel,
    sendMessage
  } = useAIChat();

  const [input, setInput] = React.useState('');

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 420,
        height: '100vh',
        background: '#0b1220',
        color: '#e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 2100,
        boxShadow: '0 0 30px rgba(0,0,0,0.35)'
      }}
    >
      {/* Header */}
      <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <div style={{ fontWeight: 700 }}>智能客服</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {contextSources && contextSources.length > 0 && (
              <>上下文來源：{contextSources.join('、')}</>
            )}
          </div>
        </div>
        <button onClick={closePanel} style={{ background: 'transparent', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>關閉</button>
      </div>

      {/* 建議快捷鍵 */}
      <div style={{ padding: 12, display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => sendMessage('', { requestDocSuggestions: true })}
          style={{ background: '#111827', color: '#93c5fd', border: '1px solid #1f2937', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}
        >
          一鍵插入 Cloudflare 文件
        </button>
        <button
          onClick={() => sendMessage('', { requestPlanScaffold: true })}
          style={{ background: '#111827', color: '#86efac', border: '1px solid #1f2937', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}
        >
          產生步驟與回滾建議
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, idx) => (
          <div key={m.ts + '_' + idx} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{m.role === 'user' ? '你' : '助手'}</div>
            <div style={{ background: m.role === 'user' ? '#1f2937' : '#0f172a', border: '1px solid rgba(255,255,255,0.07)', padding: 10, borderRadius: 10, whiteSpace: 'pre-wrap' }}>{m.content}</div>
          </div>
        ))}
        {loading && <div style={{ fontSize: 12, opacity: 0.8 }}>思考中…</div>}
        {error && <div style={{ color: '#fca5a5', fontSize: 12 }}>{error}</div>}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage(input.trim());
          setInput('');
        }}
        style={{ padding: 12, display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="請輸入訊息，或點上方按鈕獲取建議"
          style={{ flex: 1, background: '#0f172a', color: '#e5e7eb', border: '1px solid #1f2937', borderRadius: 8, padding: '10px 12px' }}
        />
        <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>送出</button>
      </form>
    </div>
  );
}

