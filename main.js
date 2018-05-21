"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var prosemirror_state_1 = require("prosemirror-state");
var prosemirror_view_1 = require("prosemirror-view");
var prosemirror_model_1 = require("prosemirror-model");
var history = require("prosemirror-history");
var prosemirror_keymap_1 = require("prosemirror-keymap");
var prosemirror_menu_1 = require("prosemirror-menu");
var prosemirror_commands_1 = require("prosemirror-commands");
var prosemirror_example_setup_1 = require("prosemirror-example-setup");
/// <reference types="jquery" />
/// <reference types="mathquill" />
var window;
(function (window) {
})(window || (window = {}));
var Keys = {
    isUndo: function (evt) { return !evt.altKey && (evt.ctrlKey || evt.metaKey) && evt.which == 90 && !evt.shiftKey; },
    isRedo: function (evt) { return !evt.altKey && (evt.ctrlKey || evt.metaKey) && (evt.which == 89 || evt.which == 90 && evt.shiftKey); },
    isSelectAll: function (evt) { return !evt.altKey && (evt.ctrlKey || evt.metaKey) && evt.which == 65; },
    isBacktick: function (evt) { return !evt.altKey && !evt.ctrlKey && !evt.metaKey && !evt.shiftKey && evt.which == 192; }
};
var CallbackRegistry = /** @class */ (function () {
    function CallbackRegistry() {
        this.counter = 0;
        this.callbacks = {};
    }
    CallbackRegistry.prototype.add = function (e) {
        var _this = this;
        var idx = this.counter;
        this.callbacks[idx] = e;
        this.counter += 1;
        return function () { delete _this.callbacks[idx]; };
    };
    CallbackRegistry.prototype.invoke = function (e, t) {
        for (var n in this.callbacks) {
            this.callbacks[n](e, t);
        }
    };
    return CallbackRegistry;
}());
function makeDispatcherPlugin() {
    var state = {
        init: function () {
            return new CallbackRegistry();
        },
        apply: function (tr, registry, oldState, newState) {
            registry.invoke(tr, newState);
            return registry;
        }
    };
    return new prosemirror_state_1.Plugin({ state: state });
}
function simpleDiff(x, y) {
    var n = 0;
    var r = x.length;
    var i = y.length;
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
function copySaneKeyboardHandlers(_a) {
    var _b = _a.container, container = _b === void 0 ? null : _b, keystroke = _a.keystroke, typedText = _a.typedText, cut = _a.cut, copy = _a.copy, paste = _a.paste;
    var o = { keystroke: keystroke, typedText: typedText, cut: cut, copy: copy, paste: paste };
    if (container != null) {
        o.container = container;
    }
    return o;
}
var MqNodeView = /** @class */ (function () {
    function MqNodeView(node, view, getPos, dispatcherPlugin) {
        var _this = this;
        this.node = node;
        this.view = view;
        this.getPos = getPos;
        this.dom = $('<span class="mq-node">').get(0);
        this.value = node.textContent;
        this.focusing = false;
        $(this.dom).on("focusin", function () {
            if (_this.focusing) {
                return;
            }
            var selection = prosemirror_state_1.NodeSelection.create(_this.view.state.doc, _this.getPos());
            _this.view.dispatch(_this.view.state.tr.setSelection(selection));
        });
        this.updating = true;
        this.mathquill = MathQuill.MathField(this.dom, {
            handlers: {
                deleteOutOf: function (direction, mathField) {
                    _this.exitHandler(direction, mathField);
                },
                moveOutOf: function (direction, mathField) {
                    _this.exitHandler(direction, mathField);
                },
                reflow: function () {
                    _this.onChange();
                },
                enter: function (mathField) {
                    _this.exitHandler(1, mathField);
                }
            },
            substituteKeyboardEvents: function (textarea, handlers) {
                var newHandlers = copySaneKeyboardHandlers(handlers);
                var generalKeystrokeHandler = newHandlers.keystroke.bind(newHandlers);
                newHandlers.keystroke = function (key, evt) {
                    if (Keys.isUndo(evt)) {
                        if (history.undo(_this.view.state, _this.view.dispatch)) {
                            evt.preventDefault();
                        }
                    }
                    else if (Keys.isRedo(evt)) {
                        if (history.redo(_this.view.state, _this.view.dispatch)) {
                            evt.preventDefault();
                        }
                    }
                    else if (Keys.isBacktick(evt)) {
                        evt.preventDefault();
                        _this.exitHandler(1, _this.mathquill);
                    }
                    else {
                        generalKeystrokeHandler(key, evt);
                    }
                };
                return MathQuill.saneKeyboardEvents(textarea, newHandlers);
            }
        });
        requestAnimationFrame(function () { return _this.mathquill.reflow(); });
        this.mathquill.latex(node.textContent);
        this.updating = false;
        var callbackRegistry = dispatcherPlugin.getState(view.state);
        this.removeToken = callbackRegistry.add(function (tr, newState) {
            _this.setCursorPos(tr);
        });
    }
    MqNodeView.prototype.setCursorPos = function (tr) {
        var pos = this.getPos();
        var nodeSize = this.node.nodeSize;
        if (!(tr.selection.from < pos + nodeSize && pos < tr.selection.to)) {
            if (pos < tr.selection.from) {
                this.cursorPos = "end";
            }
            else {
                this.cursorPos = "start";
            }
        }
    };
    MqNodeView.prototype.exitHandler = function (direction, mathField) {
        if (mathField.latex().length == 0) {
            this.view.dispatch(this.view.state.tr.deleteSelection());
        }
        else if (direction == -1) {
            this.selectBefore();
        }
        else if (direction == 1) {
            this.selectAfter();
        }
        this.view.focus();
    };
    MqNodeView.prototype.selectAfter = function () {
        var selection = prosemirror_state_1.TextSelection.create(this.view.state.doc, this.getPos() + this.node.nodeSize);
        this.view.dispatch(this.view.state.tr.setSelection(selection));
    };
    MqNodeView.prototype.selectBefore = function () {
        var selection = prosemirror_state_1.TextSelection.create(this.view.state.doc, this.getPos());
        this.view.dispatch(this.view.state.tr.setSelection(selection));
    };
    MqNodeView.prototype.onChange = function () {
        if (this.updating) {
            return;
        }
        var newValue = this.mathquill.latex();
        if (newValue != this.value) {
            var diff = simpleDiff(this.value, newValue);
            var pos = this.getPos() + 1;
            this.value = newValue;
            var action = this.view.state.tr.replaceWith(pos + diff.from, pos + diff.to, diff.text ? this.view.state.schema.text(diff.text) : []);
            this.view.dispatch(action);
        }
    };
    MqNodeView.prototype.update = function (newNode) {
        if (newNode.type != this.node.type) {
            return false;
        }
        this.node = newNode;
        var newContent = newNode.textContent;
        if (newContent != this.value) {
            this.value = newContent;
            this.updating = true;
            this.mathquill.latex(newContent);
            this.updating = false;
        }
        return true;
    };
    MqNodeView.prototype.selectNode = function () {
        if (this.cursorPos == "start") {
            this.mathquill.moveToLeftEnd();
        }
        else {
            this.mathquill.moveToRightEnd();
        }
        this.focusing = true;
        this.mathquill.focus();
        this.focusing = false;
    };
    MqNodeView.prototype.stopEvent = function () { return true; };
    MqNodeView.prototype.ignoreMutation = function () { return true; };
    MqNodeView.prototype.destroy = function () {
        $(this.dom).off("focusin");
        this.removeToken();
    };
    return MqNodeView;
}());
function makeMqAction(callback) {
    if (callback === void 0) { callback = function () { }; }
    return function (editorState, dispatch) {
        if (dispatch === void 0) { dispatch = function () { }; }
        var selectedText = editorState.doc.textBetween(editorState.selection.from, editorState.selection.to);
        var mqNode = editorState.schema.nodes.mq;
        var newMqNode = mqNode.create(undefined, selectedText.length > 0 ? editorState.schema.text(selectedText) : undefined);
        var newState = editorState.tr.replaceSelectionWith(newMqNode);
        var setSelection = newState.setSelection(prosemirror_state_1.NodeSelection.create(newState.doc, editorState.selection.from));
        dispatch(setSelection);
        callback();
        return true;
    };
}
function mqBackspaceCommand(editorState, dispatch) {
    if (dispatch === void 0) { dispatch = function () { }; }
    if (!editorState.selection.empty) {
        return false;
    }
    var prevNode = editorState.selection.$from.nodeBefore;
    if (prevNode && prevNode.type.name == "mq") {
        var setSelection = editorState.tr.setSelection(prosemirror_state_1.NodeSelection.create(editorState.doc, editorState.selection.from - prevNode.nodeSize));
        dispatch(setSelection);
        return true;
    }
    return false;
}
function mqDeleteCommand(editorState, dispatch) {
    if (dispatch === void 0) { dispatch = function () { }; }
    if (!editorState.selection.empty) {
        return false;
    }
    var nextNode = editorState.selection.$from.nodeAfter;
    if (nextNode && nextNode.type.name == "mq") {
        var setSelection = editorState.tr.setSelection(prosemirror_state_1.NodeSelection.create(editorState.doc, editorState.selection.from));
        dispatch(setSelection);
        return true;
    }
    return false;
}
function splitOnRegex(str, regex) {
    var subStrings = [];
    var pos = 0, match;
    while (match = regex.exec(str)) {
        var matchStart = match.index;
        var matchEnd = matchStart + match[0].length;
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
function makePastePlugin(regex, mkNode) {
    function transformNode(node) {
        if (node.isText) {
            return splitOnRegex(node.text, regex).map(function (section) {
                if (section.matched) {
                    return mkNode(node, section.start, section.end);
                }
                else {
                    return node.cut(section.start, section.end);
                }
            });
        }
        else {
            return [node.copy(transformFragment(node.content))];
        }
    }
    function transformFragment(fragment) {
        var transformed = [];
        fragment.forEach(function (node) {
            transformed = transformed.concat(transformNode(node));
        });
        return prosemirror_model_1.Fragment.fromArray(transformed);
    }
    function transformPasted(slice) {
        return new prosemirror_model_1.Slice(transformFragment(slice.content), slice.openStart, slice.openEnd);
    }
    var newProps = { transformPasted: transformPasted };
    return new prosemirror_state_1.Plugin({ props: newProps });
}
var MQ_REGEX = /\$[^\$]*\$/ig;
var mathPastePlugin = makePastePlugin(MQ_REGEX, function (node, start, end) {
    var mqNode = node.type.schema.nodes.mq;
    return start + 1 < end - 1 ? mqNode.create(undefined, node.cut(start + 1, end - 1)) : mqNode.create();
});
var nodes = {
    doc: {
        content: "block+"
    },
    paragraph: {
        content: "inline*",
        group: "block",
        parseDOM: [{ tag: "p" }],
        toDOM: function () { return ["p", 0]; }
    },
    lemma: {
        content: "inline*",
        group: "block",
        defining: true,
        parseDOM: [{ tag: "div.lemma" }],
        toDOM: function () { return ["div", { "class": "lemma" }, ["p", 0]]; }
    },
    proof: {
        content: "inline*",
        group: "block",
        defining: true,
        parseDOM: [{ tag: "div.proof" }],
        toDOM: function () { return ["div", { "class": "proof" }, ["p", 0]]; }
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
        toDOM: function () { return ["hr"]; }
    },
    heading: {
        attrs: { level: { default: 1 } },
        content: "inline*",
        group: "block",
        defining: true,
        parseDOM: [{ tag: "h1", attrs: { level: 1 } },
            { tag: "h2", attrs: { level: 2 } },
            { tag: "h3", attrs: { level: 3 } },
            { tag: "h4", attrs: { level: 4 } },
            { tag: "h5", attrs: { level: 5 } },
            { tag: "h6", attrs: { level: 6 } }],
        toDOM: function (node) { return ["h" + node.attrs.level, 0]; }
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
            alt: { default: null },
            title: { default: null }
        },
        group: "inline",
        draggable: true,
        parseDOM: [{ tag: "img[src]", getAttrs: function (dom) {
                    return {
                        src: dom.getAttribute("src"),
                        title: dom.getAttribute("title"),
                        alt: dom.getAttribute("alt")
                    };
                } }],
        toDOM: function (node) { return ["img", node.attrs]; }
    },
    hard_break: {
        inline: true,
        group: "inline",
        selectable: false,
        parseDOM: [{ tag: "br" }],
        toDOM: function () { return ["br"]; }
    },
    mq: {
        inline: true,
        group: "inline",
        content: "text*",
        selectable: true,
        toDOM: function (node) {
            return "$" + node.textContent + "$";
        }
    }
};
var marks = {
    link: {
        attrs: {
            href: {},
            title: { default: null }
        },
        inclusive: false,
        parseDOM: [{ tag: "a[href]", getAttrs: function (dom) {
                    return {
                        href: dom.getAttribute("href"),
                        title: dom.getAttribute("title")
                    };
                } }],
        toDOM: function (node) { return ["a", node.attrs]; }
    },
    em: {
        parseDOM: [{ tag: "i" }, { tag: "em" },
            { style: "font-style", getAttrs: function (value) { return value == "italic" && null; } }],
        toDOM: function () { return ["em"]; }
    },
    strong: {
        parseDOM: [{ tag: "strong" },
            // This works around a Google Docs misbehavior where
            // pasted content will be inexplicably wrapped in `<b>`
            // tags with a font-weight normal.
            { tag: "b", getAttrs: function (node) { return node.style.fontWeight != "normal" && null; } },
            { style: "font-weight", getAttrs: function (value) { return /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null; } }],
        toDOM: function () { return ["strong"]; }
    }
    //code: {
    //  parseDOM: [{tag: "code"}],
    //  toDOM() { return ["code"] }
    //}
};
var mathSchema = new prosemirror_model_1.Schema({
    nodes: nodes,
    marks: marks
});
var menu = prosemirror_example_setup_1.buildMenuItems(mathSchema);
var makeLemmaItem = prosemirror_menu_1.blockTypeItem(mathSchema.nodes.lemma, {
    title: "Change to lemma",
    label: "Lemma"
});
var makeProofItem = prosemirror_menu_1.blockTypeItem(mathSchema.nodes.proof, {
    title: "Change to proof",
    label: "Proof"
});
var dropdown;
(function (dropdown) {
    function getContent(d) {
        return d.content;
    }
    dropdown.getContent = getContent;
    function setContent(d, c) {
        d.content = c;
    }
    dropdown.setContent = setContent;
})(dropdown || (dropdown = {}));
dropdown.setContent(menu.typeMenu, [makeLemmaItem, makeProofItem].concat(dropdown.getContent(menu.typeMenu)));
function isNodeSelection(selection) {
    return selection.hasOwnProperty('node');
}
function initProseMirror() {
    var isMac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false;
    var mathKeymap = Object.assign({}, prosemirror_commands_1.baseKeymap, {
        "$": makeMqAction(function () {
            // WORKAROUND for ProseMirror bug: reset shiftKey
            proseMirrorView.shiftKey = false;
        }),
        Backspace: prosemirror_commands_1.chainCommands(mqBackspaceCommand, prosemirror_commands_1.baseKeymap['Backspace']),
        Delete: prosemirror_commands_1.chainCommands(mqDeleteCommand, prosemirror_commands_1.baseKeymap['Delete']),
        "Mod-z": history.undo,
        "Shift-Mod-z": history.redo
    }, isMac ? {} : { "Mod-y": history.redo });
    function querySelector(selector) {
        function throwIfNull(str, a) {
            if (a == null) {
                throw new Error(str);
            }
            return a;
        }
        return throwIfNull("no element with selector '" + selector + "' found!", document.querySelector(selector));
    }
    var dispatcherPlugin = makeDispatcherPlugin();
    var proseMirrorView = new prosemirror_view_1.EditorView(querySelector("#editor"), {
        state: prosemirror_state_1.EditorState.create({
            schema: mathSchema,
            doc: prosemirror_model_1.DOMParser.fromSchema(mathSchema).parse(querySelector("#content")),
            plugins: [
                dispatcherPlugin,
                mathPastePlugin,
                history.history(),
                prosemirror_keymap_1.keymap(mathKeymap),
                prosemirror_menu_1.menuBar({ floating: false, content: menu.fullMenu })
            ]
        }),
        nodeViews: {
            mq: function (node, view, getPos) {
                return new MqNodeView(node, view, getPos, dispatcherPlugin);
            }
        }
    });
    proseMirrorView.focus();
    dispatcherPlugin.getState(proseMirrorView.state).add(function (tr, editorState) {
        if (!proseMirrorView.hasFocus() && (isNodeSelection(editorState.selection) ? editorState.selection.node.type.name != "mq" : true)) {
            proseMirrorView.focus();
        }
    });
    window.prosemirrorView = proseMirrorView;
}
addEventListener('load', initProseMirror);
//# sourceMappingURL=main.js.map