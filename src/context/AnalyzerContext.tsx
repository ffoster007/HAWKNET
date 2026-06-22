import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Job, VulnGraph, GraphNode, GraphEdge } from '../lib/tauriApi';

export interface AnalyzerNode {
  id: string;
  x: number;
  y: number;
  label: string;
  type: "domain" | "ip" | "service" | "vulnerability" | "subdomain" | "pattern";
  data?: Record<string, unknown>;  // ✅ เปลี่ยนเป็น Record<string, unknown>
}

export interface AnalyzerEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

interface AnalyzerContextType {
  nodes: AnalyzerNode[];
  edges: AnalyzerEdge[];
  currentJob: Job | null;
  isLoading: boolean;
  setScanResult: (job: Job, graph: VulnGraph) => void;
  clearData: () => void;
  setLoading: (loading: boolean) => void;
  addNode: (node: AnalyzerNode) => void;
  removeNode: (id: string) => void;
}

const AnalyzerContext = createContext<AnalyzerContextType | undefined>(undefined);

export function AnalyzerProvider({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes] = useState<AnalyzerNode[]>([]);
  const [edges, setEdges] = useState<AnalyzerEdge[]>([]);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setScanResult = useCallback((job: Job, graph: VulnGraph) => {
    setCurrentJob(job);
    setIsLoading(false);

    // ✅ แปลง NodeData → Record<string, unknown>
    const newNodes: AnalyzerNode[] = graph.nodes.map((n: GraphNode) => ({
      id: n.id,
      x: n.position.x + (Math.random() - 0.5) * 50,
      y: n.position.y + (Math.random() - 0.5) * 50,
      label: n.data.label,
      type: n.type as AnalyzerNode['type'],
      data: n.data as unknown as Record<string, unknown>,  // ✅ type assertion
    }));

    const newEdges: AnalyzerEdge[] = graph.edges.map((e: GraphEdge) => ({
      id: e.id,
      from: e.source,
      to: e.target,
      label: e.label,
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, []);

  const clearData = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setCurrentJob(null);
    setIsLoading(false);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const addNode = useCallback((node: AnalyzerNode) => {
    setNodes(prev => [...prev, node]);
  }, []);

  const removeNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.from !== id && e.to !== id));
  }, []);

  return (
    <AnalyzerContext.Provider value={{
      nodes,
      edges,
      currentJob,
      isLoading,
      setScanResult,
      clearData,
      setLoading,
      addNode,
      removeNode,
    }}>
      {children}
    </AnalyzerContext.Provider>
  );
}

export function useAnalyzer() {
  const context = useContext(AnalyzerContext);
  if (context === undefined) {
    throw new Error('useAnalyzer must be used within an AnalyzerProvider');
  }
  return context;
}