import { useEffect, useRef, useState, type CSSProperties } from "react";
import { EditorState, StateEffect } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { loadLanguage, type LangId } from "@/lib/languages";
import type { Participant } from "@/lib/collab";

type Props = {
  value: string;
  language: LangId;
  peers: Participant[];
  onChange: (value: string) => void;
  onCursor: (pos: number | null) => void;
};

export function CodeEditor({ value, language, peers, onChange, onCursor }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onCursorRef = useRef(onCursor);
  onChangeRef.current = onChange;
  onCursorRef.current = onCursor;
  const [tick, setTick] = useState(0);

  const baseExtensions = () => [
    basicSetup,
    keymap.of([indentWithTab]),
    oneDark,
    EditorView.updateListener.of((u) => {
      if (u.docChanged) onChangeRef.current(u.state.doc.toString());
      if (u.selectionSet) onCursorRef.current(u.state.selection.main.head);
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

  // Repaint the awareness overlay on a light interval (mocked presence layer).
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 400);
    return () => clearInterval(id);
  }, []);

  const v = view.current;

  return (
    <div className="relative h-full overflow-hidden">
      <div ref={host} className="h-full overflow-auto" />
      <div className="pointer-events-none absolute inset-0" aria-hidden data-tick={tick}>
        {v &&
          peers.map((p) => {
            if (p.cursor == null) return null;
            const pos = Math.min(Math.max(p.cursor, 0), v.state.doc.length);
            let coords: { left: number; top: number; bottom: number } | null = null;
            try {
              coords = v.coordsAtPos(pos);
            } catch {
              coords = null;
            }
            if (!coords) return null;
            const box = v.dom.getBoundingClientRect();
            return (
              <div
                key={p.clientId}
                className="remote-cursor absolute"
                data-name={p.name}
                style={
                  {
                    left: coords.left - box.left,
                    top: coords.top - box.top,
                    height: coords.bottom - coords.top,
                    "--cursor-color": p.color,
                  } as CSSProperties
                }
              />
            );
          })}
      </div>
    </div>
  );
}
