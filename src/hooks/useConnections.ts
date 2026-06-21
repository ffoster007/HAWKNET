import { useState, useEffect } from 'react';

export interface LLMProvider {
  id: string;
  name: string;
  icon: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
}

// Global state
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

function notify() {
  listeners.forEach(listener => listener());
}

export function useConnections() {
  const [state, setState] = useState(globalState);

  useEffect(() => {
    const listener = () => setState({ ...globalState });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toggle = () => {
    globalState = { ...globalState, isOpen: !globalState.isOpen };
    setState({ ...globalState });
    notify();
  };

  const open = () => {
    globalState = { ...globalState, isOpen: true };
    setState({ ...globalState });
    notify();
  };

  const close = () => {
    globalState = { ...globalState, isOpen: false };
    setState({ ...globalState });
    notify();
  };

  const updateProvider = (id: string, updates: Partial<LLMProvider>) => {
    globalState = {
      ...globalState,
      providers: globalState.providers.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    };
    setState({ ...globalState });
    notify();
  };

  const toggleProvider = (id: string) => {
    globalState = {
      ...globalState,
      providers: globalState.providers.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p
      ),
    };
    setState({ ...globalState });
    notify();
  };

  const addProvider = (provider: LLMProvider) => {
    globalState = {
      ...globalState,
      providers: [...globalState.providers, provider],
    };
    setState({ ...globalState });
    notify();
  };

  const removeProvider = (id: string) => {
    globalState = {
      ...globalState,
      providers: globalState.providers.filter((p) => p.id !== id),
    };
    setState({ ...globalState });
    notify();
  };

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

// Hook เพื่อ listen event จาก ActivityBar
export function useConnectionsListener() {
  const { toggle } = useConnections();
  
  useEffect(() => {
    const handler = () => toggle();
    window.addEventListener('toggleConnections', handler);
    return () => window.removeEventListener('toggleConnections', handler);
  }, [toggle]);
}