// src/hooks/useConnections.ts
import { useState, useEffect, useCallback } from 'react';

export interface LLMProvider {
  id: string;
  name: string;
  icon: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
}

// ── Global State ──────────────────────────────────────────────────────────────
// เก็บ state ไว้ global เพื่อให้ทุก component แชร์กันได้
let globalState = {
  isOpen: false,
  providers: [
    {
      id: 'openai',
      name: 'OpenAI',
      icon: '/llms/openai.png',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
      enabled: false,
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      icon: '/llms/Claude.png',
      apiKey: '',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-opus',
      enabled: false,
    },
    {
      id: 'google',
      name: 'Google AI',
      icon: '/llms/Gemini.png',
      apiKey: '',
      baseUrl: 'https://generativelanguage.googleapis.com/v1',
      model: 'gemini-pro',
      enabled: false,
    },
    {
      id: 'grok',
      name: 'Grok',
      icon: '/llms/grok.png',
      apiKey: '',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'mixtral-8x7b',
      enabled: false,
    },
    {
      id: 'ollama',
      name: 'Ollama (Local)',
      icon: '/llms/ollama.jpeg',
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      model: 'llama3',
      enabled: false,
    },
  ] as LLMProvider[],
};

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useConnections() {
  const [state, setState] = useState(globalState);

  // Subscribe to global state changes
  useEffect(() => {
    const listener = () => {
      setState({ ...globalState });
    };
    listeners.add(listener);
    
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────

  const toggle = useCallback(() => {
    globalState = { ...globalState, isOpen: !globalState.isOpen };
    setState({ ...globalState });
    notifyListeners();
  }, []);

  const open = useCallback(() => {
    globalState = { ...globalState, isOpen: true };
    setState({ ...globalState });
    notifyListeners();
  }, []);

  const close = useCallback(() => {
    globalState = { ...globalState, isOpen: false };
    setState({ ...globalState });
    notifyListeners();
  }, []);

  const updateProvider = useCallback((id: string, updates: Partial<LLMProvider>) => {
    globalState = {
      ...globalState,
      providers: globalState.providers.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    };
    setState({ ...globalState });
    notifyListeners();
  }, []);

  const toggleProvider = useCallback((id: string) => {
    globalState = {
      ...globalState,
      providers: globalState.providers.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p
      ),
    };
    setState({ ...globalState });
    notifyListeners();
  }, []);

  const addProvider = useCallback((provider: LLMProvider) => {
    globalState = {
      ...globalState,
      providers: [...globalState.providers, provider],
    };
    setState({ ...globalState });
    notifyListeners();
  }, []);

  const removeProvider = useCallback((id: string) => {
    globalState = {
      ...globalState,
      providers: globalState.providers.filter((p) => p.id !== id),
    };
    setState({ ...globalState });
    notifyListeners();
  }, []);

  return {
    isOpen: state.isOpen,
    providers: state.providers,
    toggle,
    open,
    close,
    updateProvider,
    toggleProvider,
    addProvider,
    removeProvider,
  };
}

// ── Listener Hook (ใช้ใน ActivityBar) ──────────────────────────────────────

export function useConnectionsListener() {
  const { toggle } = useConnections();
  
  useEffect(() => {
    const handler = () => {
      toggle();
    };
    
    window.addEventListener('toggleConnections', handler);
    
    return () => {
      window.removeEventListener('toggleConnections', handler);
    };
  }, [toggle]);
}