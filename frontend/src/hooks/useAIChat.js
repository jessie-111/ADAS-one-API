import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// 簡易 AI 對話 hook：
// - 管理訊息串、上下文來源、徽章提示
// - 從 localStorage 讀取 AI Provider 設定（Gemini / Ollama）
// - 封裝與後端 /api/ai/chat 的通訊

export default function useAIChat() {
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant'|'system', content: string, ts: number }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewSuggestion, setHasNewSuggestion] = useState(false);
  const [contextSources, setContextSources] = useState([]); // 例如：["封鎖特定國別"]

  const analysisContextRef = useRef(null);

  const providerConfig = useMemo(() => {
    const provider = localStorage.getItem('ai_provider') || 'gemini';
    const gemini = {
      apiKey: localStorage.getItem('gemini_api_key') || '',
      model: localStorage.getItem('gemini_model') || ''
    };
    const ollama = {
      apiUrl: localStorage.getItem('ollama_api_url') || 'http://localhost:11434',
      model: localStorage.getItem('ollama_model') || ''
    };
    return { provider, gemini, ollama };
  }, []);

  // 不在 UI 顯示 provider，僅內部使用，維持切換能力

  // 監聽分析上下文事件，顯示徽章與收集上下文來源
  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {};
      analysisContextRef.current = detail;
      // 決定顯示的來源標籤
      const labels = [];
      if (detail?.title) labels.push(detail.title);
      if (detail?.recommendations && Array.isArray(detail.recommendations)) {
        const top = detail.recommendations.slice(0, 2).map(r => (typeof r === 'string' ? r : r?.label || '建議'));
        labels.push(...top);
      }
      setContextSources(labels);
      setHasNewSuggestion(true);
    };
    const openHandler = () => setIsOpen(true);
    const closeHandler = () => setIsOpen(false);
    window.addEventListener('ai:analysisContext', handler);
    window.addEventListener('ai:openPanel', openHandler);
    window.addEventListener('ai:closePanel', closeHandler);
    return () => {
      window.removeEventListener('ai:analysisContext', handler);
      window.removeEventListener('ai:openPanel', openHandler);
      window.removeEventListener('ai:closePanel', closeHandler);
    };
  }, []);

  const openPanel = useCallback(() => {
    setIsOpen(true);
    setHasNewSuggestion(false);
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const appendMessage = useCallback((role, content) => {
    setMessages(prev => ([...prev, { role, content, ts: Date.now() }]));
  }, []);

  const buildChatPayload = useCallback((message, options = {}) => {
    const base = {
      message,
      context: {
        analysisContext: analysisContextRef.current || null
      },
      requestDocSuggestions: !!options.requestDocSuggestions,
      requestPlanScaffold: !!options.requestPlanScaffold
    };
    if (providerConfig.provider === 'gemini') {
      base.provider = 'gemini';
      base.apiKey = providerConfig.gemini.apiKey;
      base.model = providerConfig.gemini.model;
    } else {
      base.provider = 'ollama';
      base.apiUrl = providerConfig.ollama.apiUrl;
      base.model = providerConfig.ollama.model;
    }
    return base;
  }, [providerConfig]);

  const sendMessage = useCallback(async (message, options = {}) => {
    setError('');
    setLoading(true);
    try {
      if (!message && !options.requestDocSuggestions && !options.requestPlanScaffold) {
        throw new Error('請輸入訊息');
      }

      if (message) appendMessage('user', message);

      const payload = buildChatPayload(message, options);
      const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';
      const res = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('伺服器回應錯誤');
      const data = await res.json();

      if (data?.reply) {
        appendMessage('assistant', data.reply);
      }
      return data;
    } catch (err) {
      setError(err.message || '發送失敗');
      return null;
    } finally {
      setLoading(false);
    }
  }, [appendMessage, buildChatPayload]);

  return {
    messages,
    loading,
    error,
    isOpen,
    hasNewSuggestion,
    contextSources,
    openPanel,
    closePanel,
    sendMessage,
    appendMessage
  };
}

