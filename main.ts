import {EditorState, Plugin, NodeSelection, TextSelection} from "prosemirror-state";
import {EditorView, EditorProps} from "prosemirror-view";
import {Schema, DOMParser, ProsemirrorNode, Fragment, Slice} from "prosemirror-model";
import * as history from "prosemirror-history";
import {keymap} from "prosemirror-keymap";
import {MenuItem, Dropdown, menuBar, blockTypeItem} from "prosemirror-menu";
import {baseKeymap, chainCommands} from "prosemirror-commands";
import {buildMenuItems} from "prosemirror-example-setup";

/// <reference types="jquery" />

declare var MathQuill: any;

namespace window {
  export var prosemirrorView;
}

const Keys = {
  isUndo: (evt) => !evt.altKey && (evt.ctrlKey || evt.metaKey) && evt.which == 90 && !evt.shiftKey,
  isRedo: (evt) => !evt.altKey && (evt.ctrlKey || evt.metaKey) && (evt.which == 89 || evt.which == 90 && evt.shiftKey),
  isSelectAll: (evt) => !evt.altKey && (evt.ctrlKey || evt.metaKey) && evt.which == 65,
  isBacktick: (evt) => !evt.altKey && !evt.ctrlKey && !evt.metaKey && !evt.shiftKey && evt.which == 192,
};

class CallbackRegistry<A, B> {
  private counter: number;
  private callbacks: { [i: number]: (a: A, b: B) => void };

  constructor() {
    this.counter = 0;
    this.callbacks = {};
  }

  add(e) {
    const idx = this.counter;
    this.callbacks[idx] = e;
    this.counter += 1;
    return () => { delete this.callbacks[idx]; };
  }

  invoke(e: A, t: B) {
    for (var n in this.callbacks) {
      this.callbacks[n](e, t);
    }
  }
}

function makeDispatcherPlugin () {
  var state = {
    init() {
      return new CallbackRegistry();
    },

    apply(tr, registry, oldState, newState) {
      registry.invoke(tr, newState);
      return registry;
    }
  };
  return new Plugin({ state: state });
}

/*function SystemKeyboardMathField(e, t) {
  t == null && (t = {});
  t = _.extend(t, {
    substituteTextarea: function() {
      return $("<textarea>")[0];
    }
  });
  return MathQuill.MathField(e, t);
}*/

//const touchtracking = require("touchtracking");

function simpleDiff (x, y) {
  let n = 0;
  let r = x.length;
  let i = y.length;
  while (n < r && x.charCodeAt(n) == y.charCodeAt(n)) {
    ++n;
  }
  // bug here?!
  while (r > n && i > n && x.charCodeAt(r - 1) == y.charCodeAt(i - 1)) {
    r--;
    i--;
  }
  return {
    from: n,
    to: r,
    text: y.slice(n, i)
  };
}

class MqNodeView {
  private node;
  private view;
  private getPos;
  private dom: HTMLElement;
  private mathquill;
  private value: string;
  private cursorPos: "start" | "end";
  private focusing: boolean;
  private updating: boolean;
  private removeToken: () => void;

  constructor(node, view, getPos, dispatcherPlugin) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    this.dom = $('<span class="mq-node">').get(0);
    this.value = node.textContent;
    this.focusing = false;
    $(this.dom).on("focusin", () => {
      if (this.focusing) { return; }
      const selection = NodeSelection.create(this.view.state.doc, this.getPos());
      this.view.dispatch(this.view.state.tr.setSelection(selection));
    });
    this.updating = true;
    this.mathquill = MathQuill.MathField(this.dom, {
      handlers: {
        deleteOutOf: (direction, mathField) => {
          this.exitHandler(direction, mathField);
        },
        moveOutOf: (direction, mathField) => {
          this.exitHandler(direction, mathField);
        },
        reflow: () => {
          this.onChange();
        },
        enter: (mathField) => {
          this.exitHandler(1, mathField);
        }
      },
      substituteKeyboardEvents(textarea, handlers) {
        var newHandlers = {};
        for (var key in handlers) { newHandlers[key] = handlers[key]; }

        var generalKeystrokeHandler = newHandlers['keystroke'].bind(newHandlers);
        newHandlers['keystroke'] = (e, evt) => {
          if (Keys.isUndo(evt)) {
            if (history.undo(this.view.state, this.view.dispatch)) { evt.preventDefault(); }
          } else if (Keys.isRedo(evt)) {
            if (history.redo(this.view.state, this.view.dispatch)) { evt.preventDefault(); }
          } else if (Keys.isBacktick(evt)) {
            evt.preventDefault();
            this.exitHandler(1, this.mathquill);
          } else {
            generalKeystrokeHandler(e, evt);
          }
        };
        return MathQuill.saneKeyboardEvents(textarea, newHandlers);
      }
    });
    requestAnimationFrame(() => this.mathquill.reflow());
    this.mathquill.latex(node.textContent);
    this.updating = false;
    const callbackRegistry = dispatcherPlugin.getState(view.state);
    this.removeToken = callbackRegistry.add((tr, newState) => {
      this.setCursorPos(tr);
    });
  }
  
  setCursorPos(tr) {
    const pos = this.getPos();
    const nodeSize = this.node.nodeSize;
    if (!(tr.selection.from < pos + nodeSize && pos < tr.selection.to)) {
      if (pos < tr.selection.from) {
        this.cursorPos = "end";
      } else {
        this.cursorPos = "start";
      }
    }
  }

  exitHandler (direction, mathField) {
    if (mathField.latex().length == 0) {
      this.view.dispatch(this.view.state.tr.deleteSelection());
    } else if (direction == -1) {
      this.selectBefore();
    } else if (direction == 1) {
      this.selectAfter();
    }
    this.view.focus();
  }

  selectAfter () {
    const selection = TextSelection.create(this.view.state.doc, this.getPos() + this.node.nodeSize);
    this.view.dispatch(this.view.state.tr.setSelection(selection));
  }

  selectBefore () {
    const selection = TextSelection.create(this.view.state.doc, this.getPos());
    this.view.dispatch(this.view.state.tr.setSelection(selection));
  }

  onChange () {
    if (this.updating) { return; }
    var newValue = this.mathquill.latex();
    if (newValue != this.value) {
      const diff = simpleDiff(this.value, newValue);
      const pos = this.getPos() + 1;
      this.value = newValue;
      var action = this.view.state.tr.replaceWith(
        pos + diff.from,
        pos + diff.to,
        diff.text ? this.view.state.schema.text(diff.text) : null
      );
      this.view.dispatch(action);
    }
  }

  update (newNode) {
    if (newNode.type != this.node.type) { return false; }
    this.node = newNode;
    const newContent = newNode.textContent;
    if (newContent != this.value) {
      this.value = newContent;
      this.updating = true;
      this.mathquill.latex(newContent);
      this.updating = false;
    }
    return true;
  }

  selectNode () {
    if (this.cursorPos == "start") {
      this.mathquill.moveToLeftEnd();
    } else {
      this.mathquill.moveToRightEnd();
    }
    this.focusing = true;
    this.mathquill.focus();
    this.focusing = false;
  }

  stopEvent() { return true; }
  ignoreMutation() { return true; }

  destroy () {
    $(this.dom).off("focusin");
    this.removeToken();
  }
}

function makeMqAction (callback) {
  return (editorState, dispatch) => {
    const selectedText = editorState.doc.textBetween(editorState.selection.from, editorState.selection.to);
    const mqNode = editorState.schema.nodes.mq;
    const newMqNode = mqNode.create(undefined, selectedText.length > 0 ? editorState.schema.text(selectedText) : undefined);
    const newState = editorState.tr.replaceSelectionWith(newMqNode);
    const setSelection = newState.setSelection(NodeSelection.create(newState.doc, editorState.selection.from));
    if (dispatch != undefined) { dispatch(setSelection); }
    if (typeof callback == "function") { callback(); }
    return true;
  };
}

function mqBackspaceCommand (editorState, dispatch) {
  if (!editorState.selection.empty) { return false; }
  var prevNode = editorState.selection.$from.nodeBefore;
  if (prevNode && prevNode.type.name == "mq") {
    var setSelection = editorState.tr.setSelection(NodeSelection.create(editorState.doc, editorState.selection.from - prevNode.nodeSize));
    if (dispatch != undefined) { dispatch(setSelection); }
    return true;
  }
  return false;
}

function mqDeleteCommand (editorState, dispatch) {
  if (!editorState.selection.empty) { return false; }
  var nextNode = editorState.selection.$from.nodeAfter;
  if (nextNode && nextNode.type.name == "mq") {
    const setSelection = editorState.tr.setSelection(NodeSelection.create(editorState.doc, editorState.selection.from));
    if (dispatch != undefined) { dispatch(setSelection); }
    return true;
  }
  return false;
}

interface SubString {
  matched: boolean,
  text: string,
  start: number,
  end: number
}

function splitOnRegex (str, regex): SubString[] {
  const subStrings: SubString[] = [];
  let pos = 0, match;
  while (match = regex.exec(str)) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;
    if (matchStart > pos) {
      subStrings.push({
        matched: false,
        text: str.substr(pos, matchStart - pos),
        start: pos,
        end: matchStart
      });
    }
    subStrings.push({
      matched: true,
      text: str.substr(matchStart, matchEnd - matchStart),
      start: matchStart,
      end: matchEnd
    });
    pos = matchEnd;
  }
  if (pos < str.length) {
    subStrings.push({
      matched: false,
      text: str.substr(pos),
      start: pos,
      end: str.length
    });
  }
  return subStrings;
}

function makePastePlugin (regex, mkNode): Plugin {
  function transformNode(node: ProsemirrorNode): ProsemirrorNode[] {
    if (node.isText) {
      return splitOnRegex(node.text, regex).map((section) => {
        if (section.matched) {
          return mkNode(node, section.start, section.end);
        } else {
          return node.cut(section.start, section.end);
        }
      });
    } else {
      return [node.copy(transformFragment(node.content))];
    }
  }

  function transformFragment(fragment): Fragment {
    let transformed: ProsemirrorNode[] = [];
    fragment.forEach((node: ProsemirrorNode) => {
      transformed = transformed.concat(transformNode(node));
    });
    return Fragment.fromArray(transformed);
  }

  function transformPasted (slice) {
    return new Slice(transformFragment(slice.content), slice.openLeft, slice.openRight);
  }

  const newProps: EditorProps = { transformPasted: transformPasted } as EditorProps;
  return new Plugin({ props: newProps });
}

const MQ_REGEX = /\$[^\$]*\$/ig;
const mathPastePlugin = makePastePlugin(MQ_REGEX, (node, start, end) => {
  const mqNode = node.type.schema.nodes.mq;
  return start + 1 < end - 1 ? mqNode.create(undefined, node.cut(start + 1, end - 1)) : mqNode.create();
});

const nodes = {
  doc: {
    content: "block+"
  },

  paragraph: {
    content: "inline<_>*",
    group: "block",
    parseDOM: [{tag: "p"}],
    toDOM() { return ["p", 0] }
  },

  lemma: {
    content: "inline<_>*",
    group: "block",
    defining: true,
    parseDOM: [{tag: "div.lemma"}],
    toDOM() { return ["div", {"class": "lemma"}, ["p", 0]] }
  },

  proof: {
    content: "inline<_>*",
    group: "block",
    defining: true,
    parseDOM: [{tag: "div.proof"}],
    toDOM() { return ["div", {"class": "proof"}, ["p", 0]] }
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
    parseDOM: [{tag: "hr"}],
    toDOM() { return ["hr"] }
  },

  heading: {
    attrs: {level: {default: 1}},
    content: "inline<_>*",
    group: "block",
    defining: true,
    parseDOM: [{tag: "h1", attrs: {level: 1}},
               {tag: "h2", attrs: {level: 2}},
               {tag: "h3", attrs: {level: 3}},
               {tag: "h4", attrs: {level: 4}},
               {tag: "h5", attrs: {level: 5}},
               {tag: "h6", attrs: {level: 6}}],
    toDOM(node) { return ["h" + node.attrs.level, 0] }
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
    group: "inline"
  },

  image: {
    inline: true,
    attrs: {
      src: {},
      alt: {default: null},
      title: {default: null}
    },
    group: "inline",
    draggable: true,
    parseDOM: [{tag: "img[src]", getAttrs(dom) {
      return {
        src: dom.getAttribute("src"),
        title: dom.getAttribute("title"),
        alt: dom.getAttribute("alt")
      }
    }}],
    toDOM(node) { return ["img", node.attrs] }
  },

  hard_break: {
    inline: true,
    group: "inline",
    selectable: false,
    parseDOM: [{tag: "br"}],
    toDOM() { return ["br"] }
  },

  mq: {
    inline: true,
    group: "inline",
    content: "text*",
    selectable: true,
    toDOM(node) {
      return "$" + node.textContent + "$";
    }
  }
};

const marks = {
  link: {
    attrs: {
      href: {},
      title: {default: null}
    },
    inclusive: false,
    parseDOM: [{tag: "a[href]", getAttrs(dom) {
      return {href: dom.getAttribute("href"), title: dom.getAttribute("title")}
    }}],
    toDOM(node) { return ["a", node.attrs] }
  },

  em: {
    parseDOM: [{tag: "i"}, {tag: "em"},
               {style: "font-style", getAttrs: value => value == "italic" && null}],
    toDOM() { return ["em"] }
  },

  strong: {
    parseDOM: [{tag: "strong"},
               // This works around a Google Docs misbehavior where
               // pasted content will be inexplicably wrapped in `<b>`
               // tags with a font-weight normal.
               {tag: "b", getAttrs: node => node.style.fontWeight != "normal" && null},
               {style: "font-weight", getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null}],
    toDOM() { return ["strong"] }
  }

  //code: {
  //  parseDOM: [{tag: "code"}],
  //  toDOM() { return ["code"] }
  //}
};

const mathSchema = new Schema({
  nodes: nodes,
  marks: marks
});

const menu = buildMenuItems(mathSchema);
const makeLemmaItem = blockTypeItem(mathSchema.nodes['lemma'], {
  title: "Change to lemma",
  label: "Lemma"
});
const makeProofItem = blockTypeItem(mathSchema.nodes['proof'], {
  title: "Change to proof",
  label: "Proof"
});

namespace dropdown {
  export function getContent(d: Dropdown): MenuItem[] { return d['content']; }
  export function setContent(d: Dropdown, c: MenuItem[]) { d['content'] = c; }
}

dropdown.setContent(menu.typeMenu, [makeLemmaItem,makeProofItem].concat(dropdown.getContent(menu.typeMenu)));

function initProseMirror () {
    var isMac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false;
    const mathKeymap = Object.assign(
      {},
      baseKeymap,
      {
        "$": makeMqAction(() => {
          // WORKAROUND for ProseMirror bug: reset shiftKey
          proseMirrorView['shiftKey'] = false;
        }),
        Backspace: chainCommands(mqBackspaceCommand, baseKeymap['Backspace']),
        Delete: chainCommands(mqDeleteCommand, baseKeymap['Delete']),
        "Mod-z": history.undo,
        "Shift-Mod-z": history.redo
      },
      isMac ? {} : { "Mod-y": history.redo }
    );

  function querySelector(selector: string): Element {
    function throwIfNull<A>(str: string, a: A | null) {
      if (a == null) { throw new Error(str); }
      return a;
    }
    return throwIfNull("no element with selector '"+selector+"' found!", document.querySelector(selector));
  }

  const dispatcherPlugin = makeDispatcherPlugin();
  const proseMirrorView = new EditorView(querySelector("#editor"), {
    state: EditorState.create({
      schema: mathSchema,
      doc: DOMParser.fromSchema(mathSchema).parse(querySelector("#content")),
      plugins: [
        dispatcherPlugin,
        mathPastePlugin,
        history.history(),
        keymap(mathKeymap),
        menuBar({ floating: false, content: menu.fullMenu })
      ]
    }),
    nodeViews: {
      mq(node, view, getPos) {
        return new MqNodeView(node, view, getPos, dispatcherPlugin);
      }
    }
  });
  proseMirrorView.focus();
  dispatcherPlugin.getState(proseMirrorView.state).add((tr, editorState) => {
    if (!proseMirrorView.hasFocus() && (editorState.selection.node == undefined || editorState.selection.node.type.name != "mq")) {
      proseMirrorView.focus();
    }
  });
  window.prosemirrorView = proseMirrorView;
}

addEventListener('load', initProseMirror);