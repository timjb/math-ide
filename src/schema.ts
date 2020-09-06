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
  | "hard_break"
  | "lambda_block"
  | "abstraction"
  | "var_ref"
  | "application"
  | "binder"
  | "lambda_char"
  | "binder_separator"
  | "open_paren"
  | "close_paren";

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

  // lambda calculus

  lambda_block: {
    content: "lambda_expression*",
    group: "block",
    parseDOM: [{ tag: "div.lambda_block" }],
    toDOM() {
      return ["div", { class: "lambda_block" }, 0];
    },
  },

  abstraction: {
    inline: true,
    group: "lambda_expression",
    content: "lambda_char binder lambda_expression",
    parseDOM: [{ tag: "span.abstraction" }],
    // isolating: true,
    toDOM() {
      return ["span", { class: "abstraction" }, 0];
    },
  },

  application: {
    inline: true,
    group: "lambda_expression",
    content: "lambda_expression open_paren lambda_expression close_paren",
    parseDOM: [{ tag: "span.application" }],
    toDOM() {
      return ["span", { class: "application" }, 0];
    },
  },

  var_ref: {
    inline: true,
    group: "lambda_expression",
    content: "text*",
    parseDom: [{ tag: "span.var_ref" }],
    toDOM() {
      return ["span", { class: "var_ref" }, 0];
    },
  },

  binder: {
    inline: true,
    content: "text* binder_separator",
    parseDom: [{ tag: "span.binder" }],
    toDOM() {
      return ["span", { class: "binder" }, 0];
    },
  },

  lambda_char: {
    inline: true,
    content: "",
    atom: true,
    selectable: false,
    parseDom: [{ tag: "span.lambda_char" }],
    toDOM() {
      return ["span", { class: "lambda_char" }, "λ"];
    },
  },

  binder_separator: {
    inline: true,
    content: "",
    atom: true,
    selectable: false,
    parseDom: [{ tag: "span.binder_separator" }],
    toDOM() {
      return ["span", { class: "binder_separator" }, ". "];
    },
  },

  open_paren: {
    inline: true,
    content: "",
    atom: true,
    selectable: false,
    parseDom: [{ tag: "span.open_paren" }],
    toDOM() {
      return ["span", { class: "open_paren" }, "("];
    },
  },

  close_paren: {
    inline: true,
    content: "",
    atom: true,
    selectable: false,
    parseDom: [{ tag: "span.close_paren" }],
    toDOM() {
      return ["span", { class: "close_paren" }, ")"];
    },
  },
};

export type MathMarkName = "link" | "em" | "strong";

const marks: { [name in MathMarkName]: MarkSpec } = {
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
