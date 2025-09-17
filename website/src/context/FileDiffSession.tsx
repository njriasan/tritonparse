import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import type { ProcessedKernel } from "../utils/dataLoader";

type SourceType = 'url' | 'local' | null;

interface SideState {
  sourceType: SourceType;
  url: string | null;
  kernels: ProcessedKernel[];
  selectedIdx: number;
}

interface DiffOptionsState {
  mode: 'single' | 'all';
  irType: string;
  ignoreWs: boolean;
  wordLevel: boolean;
  contextLines: number;
  wordWrap: 'off' | 'on';
  onlyChanged: boolean;
}

interface AppControls {
  setKernels?: (k: ProcessedKernel[]) => void;
  setLoadedUrl?: (u: string | null) => void;
  setActiveTab?: (t: string) => void;
  setSelectedKernel?: (i: number) => void;
  setDataLoaded?: (b: boolean) => void;
}

interface FileDiffSessionApi {
  left: SideState;
  right: SideState;
  options: DiffOptionsState;
  setLeftFromUrl: (url: string, kernels: ProcessedKernel[]) => void;
  setLeftFromLocal: (kernels: ProcessedKernel[]) => void;
  setRightFromUrl: (url: string, kernels: ProcessedKernel[]) => void;
  setRightFromLocal: (kernels: ProcessedKernel[]) => void;
  setLeftIdx: (idx: number) => void;
  setRightIdx: (idx: number) => void;
  setOptions: (partial: Partial<DiffOptionsState>) => void;
  reset: () => void;
  registerAppControls: (ctrls: AppControls) => void;
  gotoOverview: (side: 'left' | 'right') => void;
  gotoIRCode: (side: 'left' | 'right') => void;
}

const defaultSide: SideState = { sourceType: null, url: null, kernels: [], selectedIdx: 0 };

const defaultOptions: DiffOptionsState = {
  mode: 'single',
  irType: 'ttgir',
  ignoreWs: true,
  wordLevel: true,
  contextLines: 3,
  wordWrap: 'on',
  onlyChanged: false,
};

const FileDiffSessionContext = createContext<FileDiffSessionApi | null>(null);

export const FileDiffSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [left, setLeft] = useState<SideState>(defaultSide);
  const [right, setRight] = useState<SideState>(defaultSide);
  const [options, setOptionsState] = useState<DiffOptionsState>(defaultOptions);

  const appControlsRef = useRef<AppControls>({});

  const api: FileDiffSessionApi = useMemo(() => ({
    left,
    right,
    options,
    setLeftFromUrl: (url, kernels) => setLeft({ sourceType: 'url', url, kernels, selectedIdx: 0 }),
    setLeftFromLocal: (kernels) => setLeft({ sourceType: 'local', url: null, kernels, selectedIdx: 0 }),
    setRightFromUrl: (url, kernels) => setRight({ sourceType: 'url', url, kernels, selectedIdx: 0 }),
    setRightFromLocal: (kernels) => setRight({ sourceType: 'local', url: null, kernels, selectedIdx: 0 }),
    setLeftIdx: (idx) => setLeft(prev => ({ ...prev, selectedIdx: idx })),
    setRightIdx: (idx) => setRight(prev => ({ ...prev, selectedIdx: idx })),
    setOptions: (partial) => setOptionsState(prev => ({ ...prev, ...partial })),
    reset: () => { setLeft(defaultSide); setRight(defaultSide); setOptionsState(defaultOptions); },
    registerAppControls: (ctrls) => { appControlsRef.current = ctrls; },
    gotoOverview: (side) => {
      const s = side === 'left' ? left : right;
      if (!s || s.kernels.length === 0) return;
      const { setKernels, setLoadedUrl, setActiveTab, setSelectedKernel, setDataLoaded } = appControlsRef.current;
      // Ensure selectedIdx in range
      const idx = Math.min(Math.max(0, s.selectedIdx), Math.max(0, s.kernels.length - 1));
      setKernels?.(s.kernels);
      setLoadedUrl?.(s.url ?? null);
      setSelectedKernel?.(idx);
      setDataLoaded?.(true);
      setActiveTab?.('overview');
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('view');
      if (s.url) newUrl.searchParams.set('json_url', s.url); else newUrl.searchParams.delete('json_url');
      window.history.replaceState({}, '', newUrl.toString());
    },
    gotoIRCode: (side) => {
      const s = side === 'left' ? left : right;
      if (!s || s.kernels.length === 0) return;
      const { setKernels, setLoadedUrl, setActiveTab, setSelectedKernel, setDataLoaded } = appControlsRef.current;
      const idx = Math.min(Math.max(0, s.selectedIdx), Math.max(0, s.kernels.length - 1));
      setKernels?.(s.kernels);
      setLoadedUrl?.(s.url ?? null);
      setSelectedKernel?.(idx);
      setDataLoaded?.(true);
      setActiveTab?.('comparison');
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('view', 'ir_code_comparison');
      if (s.url) newUrl.searchParams.set('json_url', s.url); else newUrl.searchParams.delete('json_url');
      window.history.replaceState({}, '', newUrl.toString());
    },
  }), [left, right, options]);

  return (
    <FileDiffSessionContext.Provider value={api}>{children}</FileDiffSessionContext.Provider>
  );
};

export const useFileDiffSession = (): FileDiffSessionApi => {
  const ctx = useContext(FileDiffSessionContext);
  if (!ctx) throw new Error('useFileDiffSession must be used within FileDiffSessionProvider');
  return ctx;
};


