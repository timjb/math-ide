import React, {FunctionComponent, useEffect, useRef, useState} from "react";
import {EditorState, PluginKey, Plugin} from "prosemirror-state";
import {EditorView} from "prosemirror-view";
import {schema} from "prosemirror-schema-basic";
import {DOMParser} from "prosemirror-model";

const reactPropsKey = new PluginKey("reactProps");

type BasicSchema = typeof schema;

function reactProps(initialProps: EditorProps): Plugin<EditorProps, BasicSchema> {
    return new Plugin({
        key: reactPropsKey,
        state: {
            init: () => initialProps,
            apply: (tr, prev) => tr.getMeta(reactPropsKey) || prev,
        },
    });
}

interface EditorProps {}

const initialDocumentHtml = `
    <h1>Some heading</h1>
    <p>An an <i>valley</i> indeed so no wonder future nature vanity. Debating all she mistaken indulged believed provided declared. He many kept on draw lain song as same. Whether at dearest certain spirits is entered in to. Rich fine bred real use too many good. She compliment unaffected expression favourable any. Unknown <b>chiefly</b> showing to conduct no. Hung as love evil able to post at as. </p>
    `;
const initialDocumentNode = document.createElement("div");
initialDocumentNode.innerHTML = initialDocumentHtml;

export const Editor: FunctionComponent<EditorProps> = (props) => {
    const [viewHost, setViewHost] = useState<HTMLDivElement | null>(null);
    const view = useRef<EditorView<BasicSchema> | undefined>(undefined);
    const [initialProps] = useState(() => props);

    useEffect(() => { // initial render
        if (viewHost !== null) {
            const state = EditorState.create<BasicSchema>({ schema, doc: DOMParser.fromSchema(schema).parse(initialDocumentNode), plugins: [reactProps(initialProps)] });
            const editorView = new EditorView(viewHost, { state });
            view.current = editorView;
            return () => {
                editorView.destroy();
                view.current = undefined;
            };
        }
    }, [initialProps, viewHost]);

    useEffect(() => { // every render
        if (view.current !== undefined) {
            const tr = view.current.state.tr.setMeta(reactPropsKey, props);
            view.current.dispatch(tr);
        }
    });

    return <div ref={setViewHost} />;
};
