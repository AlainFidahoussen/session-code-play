import { useEffect, useRef } from "react";
import { EditorState, StateEffect, StateField, RangeSetBuilder } from "@codemirror/state";
import { EditorView, keymap, Decoration, type DecorationSet } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { loadLanguage, type LangId } from "@/lib/languages";
import type { Participant } from "@/lib/collab";

const setCursors = StateEffect.define<Participant[]>();

const remoteCursors = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setCursors)) {
        const builder = new RangeSetBuilder<Decoration>();
        const len = tr.state.doc.length;
        const sorted = [...e.value]
          .filter((p) => p.cursor != null)
          .sort((a, b) => (a.cursor! - b.cursor!));
        for (const p of sorted) {
          const pos = Math.min(Math.max(p.cursor!, 0), len);
          builder.add(
            pos,
            pos,
            Decoration.widget({
              side: 1,
              widget: new (class extends (globalThis as any).Object {})() as never,
            }),
          );
        }
        deco = builder.finish();
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

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
  const langCompartment = useRef<{ current: LangId | null }>({ current: null });
  const onChangeRef = useRef(onChange);
  const onCursorRef = useRef(onCursor);
  onChangeRef.current = onChange;
  onCursorRef.current = onCursor;

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          oneDark,
          remoteCursors,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString());
            if (u.selectionSet) onCursorRef.current(u.state.selection.main.head);
          }),
        ],
      }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remote document updates (never clobber the local caret on echo).
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const current = v.state.doc.toString();
    if (current === value) return;
    v.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  // Language pack, loaded on demand and reconfigured in place.
  useEffect(() => {
    let cancelled = false;
    if (langCompartment.current.current === language) return;
    langCompartment.current.current = language;
    void loadLanguage(language).then((support) => {
      const v = view.current;
      if (!v || cancelled) return;
      v.dispatch({
        effects: StateEffect.reconfigure.of([
          basicSetup,
          keymap.of([indentWithTab]),
          oneDark,
          remoteCursors,
          ...(support ? [support] : []),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString());
            if (u.selectionSet) onCursorRef.current(u.state.selection.main.head);
          }),
        ]),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  // Peer cursors as absolutely-positioned overlays (mocked awareness layer).
  return (
    <div className="relative h-full overflow-hidden">
      <div ref={host} className="h-full overflow-auto" />
      <PeerCursorLayer view={view} peers={peers} />
    </div>
  );
}

function PeerCursorLayer({
  view,
  peers,
}: {
  view: React.RefObject<EditorView | null>;
  peers: Participant[];
}) {
  const [, force] = useTick();
  const v = view.current;
  if (!v) return null;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden data-tick={force}>
      {peers.map((p) => {
        if (p.cursor == null) return null;
        const pos = Math.min(p.cursor, v.state.doc.length);
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
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

function useTick() {
  const ref = useRef(0);
  const [, setN] = useStateSafe();
  useEffect(() => {
    const id = setInterval(() => {
      ref.current += 1;
      setN(ref.current);
    }, 400);
    return () => clearInterval(id);
  }, [setN]);
  return [ref.current, ref.current] as const;
}

function useStateSafe() {
  const [n, setN] = useReactState(0);
  return [n, setN] as const;
}

import { useState as useReactState } from "react";
