import { MarkSpec, NodeSpec, Schema } from "prosemirror-model";

type NodeName =
  | "doc"
  | "paragraph"
  | "lemma"
  | "proof"
  | "horizontal_rule"
  | "heading"
  | "text"
  | "image"
  | "hard_break";
// | "mq";

const nodes: { [name in NodeName]: NodeSpec } = {
  doc: {
    content: "block+",
  },

  paragraph: {
    content: "inline*",
    group: "block",
    parseDOM: [{ tag: "p" }],
    toDOM() {
      return ["p", 0];
    },
  },

  lemma: {
    content: "inline*",
    group: "block",
    defining: true,
    parseDOM: [{ tag: "div.lemma" }],
    toDOM() {
      return ["div", { class: "lemma" }, ["p", 0]];
    },
  },

  proof: {
    content: "inline*",
    group: "block",
    defining: true,
    parseDOM: [{ tag: "div.proof" }],
    toDOM() {
      return ["div", { class: "proof" }, ["p", 0]];
    },
  },

  //blockquote: {
  //  content: "block+",
  //  group: "block",
  //  defining: true,
  //  parseDOM: [{tag: "blockquote"}],
  //  toDOM() { return ["blockquote", 0] }
  //},

  horizontal_rule: {
    group: "block",
    parseDOM: [{ tag: "hr" }],
    toDOM() {
      return ["hr"];
    },
  },

  heading: {
    attrs: { level: { default: 1 } },
    content: "inline*",
    group: "block",
    defining: true,
    parseDOM: [
      { tag: "h1", attrs: { level: 1 } },
      { tag: "h2", attrs: { level: 2 } },
      { tag: "h3", attrs: { level: 3 } },
      { tag: "h4", attrs: { level: 4 } },
      { tag: "h5", attrs: { level: 5 } },
      { tag: "h6", attrs: { level: 6 } },
    ],
    toDOM(node) {
      return ["h" + (node.attrs as { level: number }).level, 0];
    },
  },

  //code_block: {
  //  content: "text*",
  //  group: "block",
  //  code: true,
  //  defining: true,
  //  parseDOM: [{tag: "pre", preserveWhitespace: "full"}],
  //  toDOM() { return ["pre", ["code", 0]] }
  //},

  text: {
    group: "inline",
  },

  image: {
    inline: true,
    attrs: {
      src: {},
      alt: { default: null },
      title: { default: null },
    },
    group: "inline",
    draggable: true,
    parseDOM: [
      {
        tag: "img[src]",
        getAttrs(dom: Node | string) {
          return {
            src: (dom as Element).getAttribute("src"),
            title: (dom as Element).getAttribute("title"),
            alt: (dom as Element).getAttribute("alt"),
          };
        },
      },
    ],
    toDOM(node) {
      return ["img", node.attrs];
    },
  },

  hard_break: {
    inline: true,
    group: "inline",
    selectable: false,
    parseDOM: [{ tag: "br" }],
    toDOM() {
      return ["br"];
    },
  },

  // mq: {
  //   inline: true,
  //   group: "inline",
  //   content: "text*",
  //   selectable: true,
  //   toDOM(node) {
  //     return "$" + node.textContent + "$";
  //   },
  // },
};

type MarkName = "link" | "em" | "strong";

const marks: { [name in MarkName]: MarkSpec } = {
  link: {
    attrs: {
      href: {},
      title: { default: null },
    },
    inclusive: false,
    parseDOM: [
      {
        tag: "a[href]",
        getAttrs(dom) {
          return {
            href: (dom as Element).getAttribute("href"),
            title: (dom as Element).getAttribute("title"),
          };
        },
      },
    ],
    toDOM(node) {
      return ["a", node.attrs];
    },
  },

  em: {
    parseDOM: [
      { tag: "i" },
      { tag: "em" },
      { style: "font-style", getAttrs: (value) => value === "italic" && null },
    ],
    toDOM() {
      return ["em"];
    },
  },

  strong: {
    parseDOM: [
      { tag: "strong" },
      // This works around a Google Docs misbehavior where
      // pasted content will be inexplicably wrapped in `<b>`
      // tags with a font-weight normal.
      {
        tag: "b",
        getAttrs: (node) =>
          (node as HTMLElement).style.fontWeight !== "normal" && null,
      },
      {
        style: "font-weight",
        getAttrs: (value: string | Node) =>
          /^(bold(er)?|[5-9]\d{2,})$/.test(value as string) && null,
      },
    ],
    toDOM() {
      return ["strong"];
    },
  },

  //code: {
  //  parseDOM: [{tag: "code"}],
  //  toDOM() { return ["code"] }
  //}
};

export const mathSchema = new Schema({
  nodes: nodes,
  marks: marks,
});

export type MathSchema = typeof mathSchema;
