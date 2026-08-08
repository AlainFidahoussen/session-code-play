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

export const LANGUAGES: { id: LangId; label: string }[] = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C++" },
  { id: "go", label: "Go" },
  { id: "sql", label: "SQL" },
  { id: "html", label: "HTML/CSS" },
  { id: "markdown", label: "Markdown" },
  { id: "plaintext", label: "Plain text" },
];

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
