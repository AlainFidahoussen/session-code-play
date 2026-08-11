import { useEffect, useRef } from "react";
import { EditorState, StateEffect } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { loadLanguage, type LangId } from "@/lib/languages";

type Props = {
  value: string;
  language: LangId;
  onChange: (value: string) => void;
};

export function CodeEditor({ value, language, onChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const baseExtensions = () => [
    basicSetup,
    keymap.of([indentWithTab]),
    oneDark,
    EditorView.updateListener.of((u) => {
      if (u.docChanged) onChangeRef.current(u.state.doc.toString());
    }),
  ];

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({ doc: value, extensions: baseExtensions() }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remote document updates (skip local echoes so the caret never jumps).
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const current = v.state.doc.toString();
    if (current === value) return;
    v.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  // Language packs load on demand and reconfigure the running editor.
  useEffect(() => {
    let cancelled = false;
    void loadLanguage(language).then((support) => {
      const v = view.current;
      if (!v || cancelled) return;
      v.dispatch({
        effects: StateEffect.reconfigure.of([
          ...baseExtensions(),
          ...(support ? [support] : []),
        ]),
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  return <div ref={host} className="h-full overflow-auto" />;
}
