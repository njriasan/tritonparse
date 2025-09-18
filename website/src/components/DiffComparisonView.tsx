import React, { useEffect, useMemo, useRef, useState } from "react";
import { DiffEditor } from "@monaco-editor/react";

interface DiffOptions {
  ignoreWhitespace?: boolean;
  wordLevel?: boolean; // kept for future, Monaco uses its own algorithm
  context?: number; // lines of context when hiding unchanged regions
  wordWrap?: "off" | "on";
  onlyChanged?: boolean;
}

interface DiffComparisonViewProps {
  leftContent: string;
  rightContent: string;
  language?: string;
  height?: string;
  options?: DiffOptions;
}

const DiffComparisonView: React.FC<DiffComparisonViewProps> = ({
  leftContent,
  rightContent,
  language = "plaintext",
  height = "calc(100vh - 12rem)",
  options,
}) => {
  const monacoOptions = useMemo(() => {
    const hideUnchanged = options?.onlyChanged
      ? {
          enabled: true,
          revealLineCount: Math.max(0, options?.context ?? 3),
        }
      : undefined;

    const opts = {
      readOnly: true,
      renderSideBySide: true,
      renderOverviewRuler: true,
      renderIndicators: true,
      // Enable diff-editor level word wrap (VSCode has a separate setting for this)
      diffWordWrap: "on",
      wordWrap: options?.wordWrap ?? "on",
      // Force both sides to honor wrap regardless of per-side defaults
      wordWrapOverride1: "on",
      wordWrapOverride2: "on",
      wordWrapMinified: true,
      wrappingStrategy: "advanced",
      // Ensure even original (left) honors wrapping consistently
      originalEditable: false,
      ignoreTrimWhitespace: options?.ignoreWhitespace ?? true,
      // @ts-ignore - monaco types may vary by version; it's safe to pass through
      hideUnchangedRegions: hideUnchanged,
      // @ts-ignore - prefer advanced algorithm if available
      diffAlgorithm: "advanced",
      // @ts-ignore - hide horizontal scrollbar when wrapping
      scrollbar: {
        vertical: 'auto',
        horizontal: 'hidden',
        horizontalScrollbarSize: 0,
      },
      // keep view lean
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    } as any;
    return opts;
  }, [options]);

  const editorRef = useRef<any>(null);

  // Keep both panes in sync when options change
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      const wrap = options?.wordWrap ?? "on";
      const original = editor.getOriginalEditor?.();
      const modified = editor.getModifiedEditor?.();
      const shared = { wordWrap: wrap, wordWrapMinified: true, wrappingStrategy: 'advanced', scrollbar: { horizontal: 'hidden', horizontalScrollbarSize: 0 } } as any;
      original?.updateOptions?.(shared);
      modified?.updateOptions?.(shared);
    } catch {}
  }, [options?.wordWrap]);

  // Ensure diff editor is fully disposed on unmount to avoid Monaco race conditions
  useEffect(() => {
    return () => {
      try {
        const editor: any = editorRef.current;
        if (editor) {
          try { editor.setModel?.(null); } catch {}
          try { editor.getOriginalEditor?.()?.setModel?.(null); } catch {}
          try { editor.getModifiedEditor?.()?.setModel?.(null); } catch {}
          try { editor.dispose?.(); } catch {}
        }
      } catch {}
      editorRef.current = null as any;
      try { (window as any).__DIFF = undefined; } catch {}
    };
  }, []);

  // Vertical resizable container: keep width 100%, allow drag to change height
  const initialPxHeight = useMemo(() => {
    // If a pixel value is provided, use it directly
    if (typeof height === 'string') {
      const pxMatch = height.match(/(\d+)px$/);
      if (pxMatch) {
        try { return parseInt(pxMatch[1], 10); } catch { /* ignore */ }
      }

      // Support calc(100vh - Xrem)
      const calcRemMatch = height.match(/calc\(100vh\s*-\s*(\d+(?:\.\d+)?)rem\)/i);
      if (calcRemMatch && typeof window !== 'undefined') {
        const rem = parseFloat(calcRemMatch[1]);
        const remPx = rem * 16; // assume 1rem = 16px baseline
        return Math.max(240, Math.round(window.innerHeight - remPx));
      }

      // Support plain vh values (e.g., 80vh)
      const vhMatch = height.match(/(\d+(?:\.\d+)?)vh/i);
      if (vhMatch && typeof window !== 'undefined') {
        const vh = parseFloat(vhMatch[1]);
        return Math.max(240, Math.round(window.innerHeight * (vh / 100)));
      }
    }

    // Fallback: viewport height minus 16rem (~256px) if available; otherwise 600px
    if (typeof window !== 'undefined') {
      return Math.max(240, window.innerHeight - 256);
    }
    return 600;
  }, [height]);

  const [containerHeight, setContainerHeight] = useState<number>(initialPxHeight);

  return (
    <div className="w-full border border-gray-200 rounded bg-white">
      <div
        className="w-full resize-y overflow-auto"
        style={{ height: `${containerHeight}px`, minHeight: 240 }}
        // Browser native resize-y changes element height; Monaco autoLayout observes size
        onMouseUp={() => {
          // Capture final height after drag (optional state sync)
          try {
            const node = (editorRef.current as any)?.getDomNode?.();
            if (node && (node as HTMLElement).parentElement) {
              const h = (node as HTMLElement).parentElement!.clientHeight;
              if (h > 0) setContainerHeight(h);
            }
          } catch {}
        }}
      >
      <DiffEditor
        height="100%"
        language={language === "python" ? "python" : "plaintext"}
        original={leftContent ?? ""}
        modified={rightContent ?? ""}
        options={monacoOptions}
        theme="light"
        // Ensure both panes use the same wrapping and scrollbar behavior
        onMount={(editor: any) => {
          try {
            editorRef.current = editor;

            const applyWrap = (_when: string) => {
              try {
                const wrap = options?.wordWrap ?? "on";
                const original = editor.getOriginalEditor?.();
                const modified = editor.getModifiedEditor?.();
                const shared = { wordWrap: wrap, wordWrapMinified: true, wrappingStrategy: 'advanced', wrappingIndent: 'same', scrollbar: { horizontal: 'hidden', horizontalScrollbarSize: 0 } } as any;
                original?.updateOptions?.(shared);
                modified?.updateOptions?.(shared);
                // Force layout after changing wrap
                try { original?.layout?.(); } catch {}
                try { modified?.layout?.(); } catch {}
              } catch (e) {
                // swallow errors
              }
            };

            // Apply at several timing points to avoid initialization overwrites
            applyWrap('onMount immediate');
            requestAnimationFrame(() => applyWrap('onMount rAF'));
            setTimeout(() => applyWrap('onMount t=0'), 0);
            setTimeout(() => applyWrap('onMount t=100'), 100);
            setTimeout(() => applyWrap('onMount t=300'), 300);

            // Re-apply on diff/layout/model changes
            try { editor.onDidUpdateDiff?.(() => applyWrap('onDidUpdateDiff')); } catch {}
            try { editor.getOriginalEditor?.()?.onDidLayoutChange?.(() => applyWrap('original onDidLayoutChange')); } catch {}
            try { editor.getModifiedEditor?.()?.onDidLayoutChange?.(() => applyWrap('modified onDidLayoutChange')); } catch {}
            try { editor.getOriginalEditor?.()?.onDidChangeModel?.(() => applyWrap('original onDidChangeModel')); } catch {}
            try { editor.getModifiedEditor?.()?.onDidChangeModel?.(() => applyWrap('modified onDidChangeModel')); } catch {}
          } catch (e) {
            // swallow errors
          }
        }}
        loading={<div className="p-4 text-gray-600">Loading diff viewer...</div>}
      />
      </div>
    </div>
  );
};

export default DiffComparisonView;


