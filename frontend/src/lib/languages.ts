import type { LanguageSupport } from "@codemirror/language";

export type LangId =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "cpp"
  | "go"
  | "sql"
  | "html"
  | "markdown"
  | "plaintext";

export const LANGUAGES: { id: LangId; label: string; runnable: boolean }[] = [
  { id: "javascript", label: "JavaScript", runnable: true },
  { id: "typescript", label: "TypeScript", runnable: true },
  { id: "python", label: "Python", runnable: true },
  { id: "java", label: "Java", runnable: false },
  { id: "cpp", label: "C++", runnable: false },
  { id: "go", label: "Go", runnable: false },
  { id: "sql", label: "SQL", runnable: false },
  { id: "html", label: "HTML/CSS", runnable: false },
  { id: "markdown", label: "Markdown", runnable: false },
  { id: "plaintext", label: "Plain text", runnable: false },
];

export function isRunnable(id: string) {
  return LANGUAGES.find((l) => l.id === id)?.runnable ?? false;
}

/** Language packs are loaded on demand to keep the initial bundle small. */
export async function loadLanguage(id: LangId): Promise<LanguageSupport | null> {
  switch (id) {
    case "javascript":
      return (await import("@codemirror/lang-javascript")).javascript();
    case "typescript":
      return (await import("@codemirror/lang-javascript")).javascript({
        typescript: true,
      });
    case "python":
      return (await import("@codemirror/lang-python")).python();
    case "java":
      return (await import("@codemirror/lang-java")).java();
    case "cpp":
      return (await import("@codemirror/lang-cpp")).cpp();
    case "go":
      return (await import("@codemirror/lang-go")).go();
    case "sql":
      return (await import("@codemirror/lang-sql")).sql();
    case "html":
      return (await import("@codemirror/lang-html")).html();
    case "markdown":
      return (await import("@codemirror/lang-markdown")).markdown();
    default:
      return null;
  }
}

export const STARTERS: Record<string, string> = {
  javascript: `// Two Sum — talk through your approach as you go.
function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}

console.log(twoSum([2, 7, 11, 15], 9));
`,
  typescript: `function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need)!, i];
    seen.set(nums[i], i);
  }
  return [];
}

console.log(twoSum([2, 7, 11, 15], 9));
`,
  python: `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []

print(two_sum([2, 7, 11, 15], 9))
`,
};
