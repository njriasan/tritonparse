/**
 * Normalization rules for semantic diff comparison.
 * These functions normalize code to ignore certain types of changes.
 */

export interface NormalizationRules {
  ignoreRegisters?: boolean;
  ignoreLabels?: boolean;
  ignoreBlockNames?: boolean;
  ignoreLineNumbers?: boolean;
}

/**
 * Normalize register names (e.g., %r0, %r1 -> %REG)
 */
export function normalizeRegisters(text: string): string {
  return text
    .replace(/%\w+\d+/g, '%REG')  // General register pattern
    .replace(/%arg\d+/g, '%ARG')  // Function arguments
    .replace(/%\d+/g, '%REG');    // Numbered registers like %0, %1
}

/**
 * Normalize basic block labels (e.g., ^bb0:, ^bb1: -> ^BB:)
 */
export function normalizeLabels(text: string): string {
  return text
    .replace(/\^bb\d+:/g, '^BB:')           // Basic block labels
    .replace(/L\d+:/g, 'LABEL:')            // Generic labels
    .replace(/<label>:\d+/g, '<label>:N');  // LLVM-style labels
}

/**
 * Normalize block names in attributes
 */
export function normalizeBlockNames(text: string): string {
  return text
    .replace(/block_\d+/g, 'BLOCK')
    .replace(/BB_\d+/g, 'BB');
}

/**
 * Normalize line number references
 */
export function normalizeLineNumbers(text: string): string {
  return text
    .replace(/line:\s*\d+/g, 'line:N')
    .replace(/:\d+:\d+/g, ':N:N');  // file:line:col references
}

/**
 * Apply normalization rules to text
 */
export function normalizeText(text: string, rules: NormalizationRules): string {
  let normalized = text;
  
  if (rules.ignoreRegisters) {
    normalized = normalizeRegisters(normalized);
  }
  
  if (rules.ignoreLabels) {
    normalized = normalizeLabels(normalized);
  }
  
  if (rules.ignoreBlockNames) {
    normalized = normalizeBlockNames(normalized);
  }
  
  if (rules.ignoreLineNumbers) {
    normalized = normalizeLineNumbers(normalized);
  }
  
  return normalized;
}

/**
 * Compare two lines with normalization rules applied
 */
export function areLinesSemanticallyEqual(
  line1: string,
  line2: string,
  rules: NormalizationRules
): boolean {
  const normalized1 = normalizeText(line1, rules);
  const normalized2 = normalizeText(line2, rules);
  return normalized1 === normalized2;
}

