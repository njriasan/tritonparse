import React, { useEffect, useMemo, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import { diffLines, diffWordsWithSpace, Change } from "diff";
import { normalizeText, NormalizationRules } from "../utils/diffNormalizers";

interface SemanticDiffViewProps {
  leftContent: string;
  rightContent: string;
  language?: string;
  height?: string;
  normalizationRules: NormalizationRules;
  wordWrap?: "off" | "on";
  wordLevel?: boolean;  // Enable word-level diff
}

interface DiffDecoration {
  range: any;
  options: any;
}

const SemanticDiffView: React.FC<SemanticDiffViewProps> = ({
  leftContent,
  rightContent,
  language = "plaintext",
  height = "calc(100vh - 12rem)",
  normalizationRules,
  wordWrap = "on",
  wordLevel = false,
}) => {
  const leftEditorRef = useRef<any>(null);
  const rightEditorRef = useRef<any>(null);
  const [leftDecorations, setLeftDecorations] = useState<string[]>([]);
  const [rightDecorations, setRightDecorations] = useState<string[]>([]);

  // Compute semantic diff
  const diffResult = useMemo(() => {
    // Normalize both texts for comparison
    const normalizedLeft = normalizeText(leftContent, normalizationRules);
    const normalizedRight = normalizeText(rightContent, normalizationRules);
    
    // Compute diff on normalized text (line-level or word-level)
    const changes = wordLevel 
      ? diffWordsWithSpace(normalizedLeft, normalizedRight)
      : diffLines(normalizedLeft, normalizedRight);
    
    if (wordLevel) {
      // Word-level diff: compute character positions and convert to line/column
      let leftCharPos = 0;
      let rightCharPos = 0;
      
      const leftChanges: Array<{ line: number; startCol: number; endCol: number; type: 'removed' | 'unchanged' }> = [];
      const rightChanges: Array<{ line: number; startCol: number; endCol: number; type: 'added' | 'unchanged' }> = [];
      
      const getLineCol = (text: string, charPos: number) => {
        const lines = text.substring(0, charPos).split('\n');
        return { line: lines.length, col: lines[lines.length - 1].length + 1 };
      };
      
      changes.forEach((change: Change) => {
        const value = change.value || '';
        
        if (change.removed) {
          const start = getLineCol(leftContent, leftCharPos);
          leftCharPos += value.length;
          const end = getLineCol(leftContent, leftCharPos);
          
          if (start.line === end.line) {
            leftChanges.push({ line: start.line, startCol: start.col, endCol: end.col, type: 'removed' });
          } else {
            for (let line = start.line; line <= end.line; line++) {
              leftChanges.push({
                line,
                startCol: line === start.line ? start.col : 1,
                endCol: line === end.line ? end.col : 10000,
                type: 'removed'
              });
            }
          }
        } else if (change.added) {
          const start = getLineCol(rightContent, rightCharPos);
          rightCharPos += value.length;
          const end = getLineCol(rightContent, rightCharPos);
          
          if (start.line === end.line) {
            rightChanges.push({ line: start.line, startCol: start.col, endCol: end.col, type: 'added' });
          } else {
            for (let line = start.line; line <= end.line; line++) {
              rightChanges.push({
                line,
                startCol: line === start.line ? start.col : 1,
                endCol: line === end.line ? end.col : 10000,
                type: 'added'
              });
            }
          }
        } else {
          leftCharPos += value.length;
          rightCharPos += value.length;
        }
      });
      
      return { leftChanges, rightChanges, isWordLevel: true };
    } else {
      // Line-level diff
      let leftLineNum = 1;
      let rightLineNum = 1;
      const leftChanges: Array<{ start: number; end: number; type: 'removed' | 'unchanged' }> = [];
      const rightChanges: Array<{ start: number; end: number; type: 'added' | 'unchanged' }> = [];
      
      changes.forEach((change: Change) => {
        const lineCount = change.count || 0;
        
        if (change.removed) {
          leftChanges.push({
            start: leftLineNum,
            end: leftLineNum + lineCount - 1,
            type: 'removed',
          });
          leftLineNum += lineCount;
        } else if (change.added) {
          rightChanges.push({
            start: rightLineNum,
            end: rightLineNum + lineCount - 1,
            type: 'added',
          });
          rightLineNum += lineCount;
        } else {
          leftChanges.push({
            start: leftLineNum,
            end: leftLineNum + lineCount - 1,
            type: 'unchanged',
          });
          rightChanges.push({
            start: rightLineNum,
            end: rightLineNum + lineCount - 1,
            type: 'unchanged',
          });
          leftLineNum += lineCount;
          rightLineNum += lineCount;
        }
      });
      
      return { leftChanges, rightChanges, isWordLevel: false };
    }
  }, [leftContent, rightContent, normalizationRules, wordLevel]);

  // Apply decorations to editors
  useEffect(() => {
    if (!leftEditorRef.current || !rightEditorRef.current) return;
    
    const monaco = (window as any).monaco;
    if (!monaco) return;

    let leftDecs: DiffDecoration[] = [];
    let rightDecs: DiffDecoration[] = [];

    if (diffResult.isWordLevel) {
      // Word-level decorations
      leftDecs = (diffResult.leftChanges as any[])
        .filter(change => change.type === 'removed')
        .map(change => ({
          range: new monaco.Range(change.line, change.startCol, change.line, change.endCol),
          options: {
            inlineClassName: 'semantic-diff-removed-word',
            className: 'semantic-diff-removed-line',
          },
        }));

      rightDecs = (diffResult.rightChanges as any[])
        .filter(change => change.type === 'added')
        .map(change => ({
          range: new monaco.Range(change.line, change.startCol, change.line, change.endCol),
          options: {
            inlineClassName: 'semantic-diff-added-word',
            className: 'semantic-diff-added-line',
          },
        }));
    } else {
      // Line-level decorations
      leftDecs = (diffResult.leftChanges as any[])
        .filter(change => change.type === 'removed')
        .map(change => ({
          range: new monaco.Range(change.start, 1, change.end, 1000),
          options: {
            isWholeLine: true,
            className: 'semantic-diff-removed-line',
            marginClassName: 'semantic-diff-removed-margin',
            linesDecorationsClassName: 'semantic-diff-removed-glyph',
          },
        }));

      rightDecs = (diffResult.rightChanges as any[])
        .filter(change => change.type === 'added')
        .map(change => ({
          range: new monaco.Range(change.start, 1, change.end, 1000),
          options: {
            isWholeLine: true,
            className: 'semantic-diff-added-line',
            marginClassName: 'semantic-diff-added-margin',
            linesDecorationsClassName: 'semantic-diff-added-glyph',
          },
        }));
    }

    // Apply decorations
    const newLeftDecs = leftEditorRef.current.deltaDecorations(leftDecorations, leftDecs);
    const newRightDecs = rightEditorRef.current.deltaDecorations(rightDecorations, rightDecs);
    
    setLeftDecorations(newLeftDecs);
    setRightDecorations(newRightDecs);
  }, [diffResult]);

  // Synchronize scrolling between editors
  useEffect(() => {
    if (!leftEditorRef.current || !rightEditorRef.current) return;

    const leftEditor = leftEditorRef.current;
    const rightEditor = rightEditorRef.current;

    let isLeftScrolling = false;
    let isRightScrolling = false;

    const leftScrollListener = leftEditor.onDidScrollChange((e: any) => {
      if (isRightScrolling) return;
      isLeftScrolling = true;
      rightEditor.setScrollPosition({
        scrollTop: e.scrollTop,
        scrollLeft: e.scrollLeft,
      });
      setTimeout(() => { isLeftScrolling = false; }, 50);
    });

    const rightScrollListener = rightEditor.onDidScrollChange((e: any) => {
      if (isLeftScrolling) return;
      isRightScrolling = true;
      leftEditor.setScrollPosition({
        scrollTop: e.scrollTop,
        scrollLeft: e.scrollLeft,
      });
      setTimeout(() => { isRightScrolling = false; }, 50);
    });

    return () => {
      leftScrollListener.dispose();
      rightScrollListener.dispose();
    };
  }, []);

  const initialPxHeight = useMemo(() => {
    if (typeof height === 'string') {
      const calcRemMatch = height.match(/calc\(100vh\s*-\s*(\d+(?:\.\d+)?)rem\)/i);
      if (calcRemMatch && typeof window !== 'undefined') {
        const rem = parseFloat(calcRemMatch[1]);
        const remPx = rem * 16;
        return Math.max(240, Math.round(window.innerHeight - remPx));
      }
    }
    return 600;
  }, [height]);

  const [containerHeight] = useState<number>(initialPxHeight);

  const editorOptions = useMemo(() => {
    const horizontal = wordWrap === 'on' ? ('hidden' as const) : ('auto' as const);
    return {
      readOnly: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: wordWrap,
      wordWrapMinified: true,
      wrappingStrategy: 'advanced' as const,
      scrollbar: {
        vertical: 'auto' as const,
        horizontal: horizontal,
        horizontalScrollbarSize: wordWrap === 'on' ? 0 : 10,
      },
      renderLineHighlight: 'none' as const,
      lineNumbers: 'on' as const,
      glyphMargin: true,
    };
  }, [wordWrap]);

  return (
    <div className="w-full border border-gray-200 rounded bg-white">
      <style>{`
        .semantic-diff-removed-line {
          background-color: rgba(255, 0, 0, 0.1);
        }
        .semantic-diff-removed-margin {
          background-color: rgba(255, 0, 0, 0.3);
        }
        .semantic-diff-removed-glyph {
          background-color: rgba(255, 0, 0, 0.4);
          width: 3px !important;
          margin-left: 3px;
        }
        .semantic-diff-removed-word {
          background-color: rgba(255, 0, 0, 0.3);
        }
        .semantic-diff-added-line {
          background-color: rgba(0, 255, 0, 0.1);
        }
        .semantic-diff-added-margin {
          background-color: rgba(0, 255, 0, 0.3);
        }
        .semantic-diff-added-glyph {
          background-color: rgba(0, 255, 0, 0.4);
          width: 3px !important;
          margin-left: 3px;
        }
        .semantic-diff-added-word {
          background-color: rgba(0, 255, 0, 0.3);
        }
      `}</style>
      <div
        className="w-full resize-y overflow-hidden"
        style={{ height: `${containerHeight}px`, minHeight: 240 }}
      >
        <div className="flex w-full" style={{ height: `${containerHeight}px` }}>
          <div className="w-1/2 border-r border-gray-300" style={{ height: `${containerHeight}px` }}>
            <Editor
              height={`${containerHeight}px`}
              language={language === "python" ? "python" : "plaintext"}
              value={leftContent}
              options={editorOptions}
              theme="light"
              onMount={(editor) => {
                leftEditorRef.current = editor;
              }}
            />
          </div>
          <div className="w-1/2" style={{ height: `${containerHeight}px` }}>
            <Editor
              height={`${containerHeight}px`}
              language={language === "python" ? "python" : "plaintext"}
              value={rightContent}
              options={editorOptions}
              theme="light"
              onMount={(editor) => {
                rightEditorRef.current = editor;
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SemanticDiffView;

