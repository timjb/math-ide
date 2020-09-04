import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Node } from "prosemirror-model";
import { MathSchema, mathSchema } from "./schema";

import "prosemirror-view/style/prosemirror.css";
import { createUseStyles } from "react-jss";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";

const reactPropsKey = new PluginKey("reactProps");

function reactProps(
  initialProps: EditorProps,
): Plugin<EditorProps, MathSchema> {
  return new Plugin({
    key: reactPropsKey,
    state: {
      init: () => initialProps,
      apply: (tr, prev) => tr.getMeta(reactPropsKey) || prev,
    },
  });
}

interface EditorProps {}

const initialDoc = Node.fromJSON<MathSchema>(mathSchema, {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Balanced Categories" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text:
            "Recall that a category is called balanced if all morphisms that are epic and monic are isomorphisms.",
        },
      ],
    },
    {
      type: "lemma",
      content: [
        { type: "text", text: "The category " },
        { type: "text", marks: [{ type: "em" }], text: "C" },
        { type: "text", text: " is balanced" },
      ],
    },
    {
      type: "proof",
      content: [
        {
          type: "text",
          text:
            "This follows from proposition 42.23. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.",
        },
      ],
    },
  ],
});

const useStyles = createUseStyles({
  container: {
    margin: "0 10px",

    "& .lemma::before": {
      float: "left",
      display: "inline-block",
      content: '"Lemma. "',
      fontWeight: "bold",
    },
    "& .proof::before": {
      float: "left",
      display: "inline-block",
      content: '"Proof. "',
      fontStyle: "italic",
    },
    "& .proof::after": {
      display: "block",
      content: '"☐"',
      margin: 0,
      padding: 0,
      position: "absolute",
      right: 0,
      bottom: "0.1em",
      width: "16px",
      height: "16px",
    },
  },
});

export const Editor: FunctionComponent<EditorProps> = (props) => {
  const classes = useStyles();
  const [viewHost, setViewHost] = useState<HTMLDivElement | null>(null);
  const view = useRef<EditorView<MathSchema> | undefined>(undefined);
  const [initialProps] = useState(() => props);

  useEffect(() => {
    // initial render
    if (viewHost !== null) {
      const state = EditorState.create<MathSchema>({
        schema: mathSchema,
        doc: initialDoc,
        plugins: [
          reactProps(initialProps),
          history(),
          keymap({ "Mod-z": undo, "Mod-y": redo }),
          keymap(baseKeymap),
        ],
      });
      const editorView = new EditorView(viewHost, { state });
      view.current = editorView;
      return () => {
        editorView.destroy();
        view.current = undefined;
      };
    }
  }, [initialProps, viewHost]);

  useEffect(() => {
    // every render
    if (view.current !== undefined) {
      const tr = view.current.state.tr.setMeta(reactPropsKey, props);
      view.current.dispatch(tr);
    }
  });

  return <div ref={setViewHost} className={classes.container} />;
};
