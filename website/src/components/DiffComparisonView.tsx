import React, { useEffect, useMemo, useRef } from "react";
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
  height = "calc(100vh - 16rem)",
  options,
}) => {
  const monacoOptions = useMemo(() => {
    const hideUnchanged = options?.onlyChanged
      ? {
          enabled: true,
          revealLineCount: Math.max(0, options?.context ?? 3),
        }
      : undefined;

    return {
      readOnly: true,
      renderSideBySide: true,
      renderOverviewRuler: true,
      renderIndicators: true,
      wordWrap: options?.wordWrap ?? "on",
      wordWrapMinified: true,
      wrappingStrategy: "advanced",
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

  return (
    <div className="h-full w-full border border-gray-200 rounded overflow-hidden bg-white">
      <DiffEditor
        height={height}
        language={language === "python" ? "python" : "plaintext"}
        original={leftContent ?? ""}
        modified={rightContent ?? ""}
        options={monacoOptions}
        theme="light"
        // Ensure both panes use the same wrapping and scrollbar behavior
        onMount={(editor: any) => {
          try {
            const wrap = options?.wordWrap ?? "on";
            const original = editor.getOriginalEditor?.();
            const modified = editor.getModifiedEditor?.();
            const shared = { wordWrap: wrap, wordWrapMinified: true, wrappingStrategy: 'advanced', scrollbar: { horizontal: 'hidden', horizontalScrollbarSize: 0 } } as any;
            original?.updateOptions?.(shared);
            modified?.updateOptions?.(shared);
            editorRef.current = editor;
          } catch {}
        }}
        loading={<div className="p-4 text-gray-600">Loading diff viewer...</div>}
      />
    </div>
  );
};

export default DiffComparisonView;


