import { useState, useCallback } from 'react';

interface SidebarState {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

let globalState: {
  isOpen: boolean;
  listeners: Array<(state: { isOpen: boolean }) => void>;
} = {
  isOpen: false,
  listeners: [],
};

function useSidebar(): SidebarState {
  const [isOpen, setIsOpen] = useState(globalState.isOpen);

  // Subscribe to global state changes
  useState(() => {
    const listener = (state: { isOpen: boolean }) => {
      setIsOpen(state.isOpen);
    };
    globalState.listeners.push(listener);
    return () => {
      globalState.listeners = globalState.listeners.filter(l => l !== listener);
    };
  });

  const toggle = useCallback(() => {
    globalState.isOpen = !globalState.isOpen;
    globalState.listeners.forEach(listener => listener({ isOpen: globalState.isOpen }));
  }, []);

  const open = useCallback(() => {
    globalState.isOpen = true;
    globalState.listeners.forEach(listener => listener({ isOpen: globalState.isOpen }));
  }, []);

  const close = useCallback(() => {
    globalState.isOpen = false;
    globalState.listeners.forEach(listener => listener({ isOpen: globalState.isOpen }));
  }, []);

  return { isOpen, toggle, open, close };
}

export { useSidebar };