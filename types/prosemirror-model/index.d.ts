// Type definitions for prosemirror-model 0.21
// Project: https://github.com/ProseMirror/prosemirror-model
// Definitions by: David Hahn <https://github.com/davidka>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

type OrderedMap<T> = T;

declare module "prosemirror-model" {
  export class ContentMatch {
    matchNode(node: ProsemirrorNode): ContentMatch | undefined | null
    matchType(type: NodeType, attrs?: Object, marks?: Mark[]): ContentMatch | undefined | null
    matchFragment(fragment: Fragment, from?: number, to?: number): ContentMatch | null | false
    matchToEnd(fragment: Fragment, start?: number, end?: number): boolean
    validEnd(): boolean
    fillBefore(after: Fragment, toEnd: boolean, startIndex?: number): Fragment | undefined | null
    allowsMark(markType: MarkType): boolean
    findWrapping(target: NodeType, targetAttrs?: Object, targetMarks?: Mark[]): { type: NodeType, attrs: Object }[] | null
    findWrappingFor(node: ProsemirrorNode): { type: NodeType, attrs: Object }[] | undefined | null

  }
  export class Fragment {
    nodesBetween(from: number, to: number, f: (node: ProsemirrorNode, start: number, parent: ProsemirrorNode, index: number) => boolean | void): void
    descendants(f: (node: ProsemirrorNode, pos: number, parent: ProsemirrorNode) => boolean | void): void
    append(other: Fragment): Fragment
    cut(from: number, to?: number): Fragment
    replaceChild(index: number, node: ProsemirrorNode): Fragment
    eq(other: Fragment): boolean
    firstChild: ProsemirrorNode | null;
    lastChild: ProsemirrorNode | null;
    childCount: number;
    child(index: number): ProsemirrorNode
    offsetAt(index: number): number
    maybeChild(index: number): ProsemirrorNode | undefined | null
    forEach(f: (node: ProsemirrorNode, offset: number, index: number) => void): void
    findDiffStart(other: Fragment): number | undefined | null
    findDiffEnd(other: ProsemirrorNode): { a: number, b: number } | undefined | null
    toString(): string
    toJSON(): Object | null
    static fromJSON(schema: Schema, value?: Object): Fragment
    static fromArray(array: ProsemirrorNode[]): Fragment
    static from(nodes?: Fragment | ProsemirrorNode | ProsemirrorNode[]): Fragment
    static empty: Fragment;

  }
  export interface CommonParseRule {
    context?: string;
    mark?: string;
    priority?: number;
    ignore?: boolean;
    skip?: boolean;
    attrs?: Object;
    getAttrs?(p: Node | string): false | null | Object;
    contentElement?: string;
    getContent?(p: Node): Fragment
    preserveWhitespace?: boolean | "full";
  }
  export interface TagParseRule extends CommonParseRule {
    tag: string;
    node?: string;
  }
  export interface StyleParseRule extends CommonParseRule {
    style: string;
  }
  type ParseRule = TagParseRule | StyleParseRule;
  export class DOMParser {
    constructor(schema: Schema, rules: ParseRule[])
    schema: Schema;
    rules: ParseRule[];
    parse(dom: Node, options?: { preserveWhitespace?: boolean | "full", findPositions?: { node: Node, offset: number }[], from?: number, to?: number, topNode?: ProsemirrorNode, topStart?: number, context?: ResolvedPos }): ProsemirrorNode
    parseSlice(dom: Node, options?: Object): Slice
    static schemaRules(schema: Schema): ParseRule[]
    static fromSchema(schema: Schema): DOMParser
  }
  export class Mark {
    type: MarkType;
    attrs: Object;
    addToSet(set: Mark[]): Mark[]
    removeFromSet(set: Mark[]): Mark[]
    isInSet(set: Mark[]): boolean
    eq(other: Mark): boolean
    toJSON(): Object
    static fromJSON(schema: Schema, json: Object): Mark
    static sameSet(a: Mark[], b: Mark[]): boolean
    static setFrom(marks?: Mark | Mark[]): Mark[]
    static none: Mark[];

  }
  export class ProsemirrorNode {
    type: NodeType;
    attrs: Object;
    content: Fragment;
    marks: Mark[];
    text?: string;
    nodeSize: number;
    childCount: number;
    child(index: number): ProsemirrorNode
    maybeChild(index: number): ProsemirrorNode | undefined | null
    forEach(f: (node: ProsemirrorNode, offset: number, index: number) => void): void
    nodesBetween(from: number | undefined | null, to: number | undefined | null, f: (node: ProsemirrorNode, pos: number, parent: ProsemirrorNode, index: number) => void): void
    descendants(f: (node: ProsemirrorNode, pos: number, parent: ProsemirrorNode) => boolean | void): void
    textContent: string;
    textBetween(from: number, to: number, blockSeparator?: string, leafText?: string): string
    firstChild: ProsemirrorNode | null | undefined;
    lastChild: ProsemirrorNode | null | undefined;
    eq(other: ProsemirrorNode): boolean
    sameMarkup(other: ProsemirrorNode): boolean
    hasMarkup(type: NodeType, attrs?: Object, marks?: Mark[]): boolean
    copy(content?: Fragment): ProsemirrorNode
    mark(marks: Mark[]): ProsemirrorNode
    cut(from: number, to?: number): ProsemirrorNode
    slice(from: number, to?: number): Slice
    replace(from: number, to: number, slice: Slice): ProsemirrorNode
    nodeAt(pos: number): ProsemirrorNode | null | undefined
    childAfter(pos: number): { node?: ProsemirrorNode, index: number, offset: number }
    childBefore(pos: number): { node?: ProsemirrorNode, index: number, offset: number }
    resolve(pos: number): ResolvedPos
    rangeHasMark(from: number | void, to: number | void, type: MarkType): boolean
    isBlock: boolean;
    isTextblock: boolean;
    inlineContent: boolean;
    isInline: boolean;
    isText: boolean;
    isLeaf: boolean;
    isAtom: boolean;
    toString(): string
    contentMatchAt(index: number): ContentMatch
    canReplace(from: number, to: number, replacement?: Fragment, start?: number, end?: number): boolean
    canReplaceWith(from: number, to: number, type: NodeType, attrs?: Mark[]): boolean
    canAppend(other: ProsemirrorNode): boolean
    check(): void
    toJSON(): Object
    static fromJSON(schema: Schema, json: Object): ProsemirrorNode

  }
  export class ReplaceError extends Error {

  }
  export class Slice {
    constructor(content: Fragment, openStart: number, openEnd: number)
    content: Fragment;
    openStart: number;
    openEnd: number;
    size: number;
    eq(other: Slice): boolean;
    toJSON(): Object | null
    static fromJSON(schema: Schema, json?: Object): Slice
    static maxOpen(fragment: Fragment): Slice
    static empty: Slice;

  }
  export class ResolvedPos {
    pos: number;
    depth: number;
    parentOffset: number;
    parent: ProsemirrorNode;
    node(depth?: number): ProsemirrorNode
    index(depth?: number): number
    indexAfter(depth?: number): number
    start(depth?: number): number
    end(depth?: number): number
    before(depth?: number): number
    after(depth?: number): number
    textOffset: number;
    nodeAfter: ProsemirrorNode | null | undefined;
    nodeBefore: ProsemirrorNode | null | undefined;
    marks(after?: boolean): Mark[]
    sharedDepth(pos: number): number
    blockRange(other?: ResolvedPos, pred?: (p: ProsemirrorNode) => boolean): NodeRange | null | undefined
    sameParent(other: ResolvedPos): boolean
    max(other: ResolvedPos): ResolvedPos
    min(other: ResolvedPos): ResolvedPos
  }
  export class NodeRange {
    $from: ResolvedPos;
    $to: ResolvedPos;
    depth: number;
    start: number;
    end: number;
    parent: ProsemirrorNode;
    startIndex: number;
    endIndex: number;

  }
  export class NodeType {
    name: string;
    schema: Schema;
    spec: NodeSpec;
    isBlock: boolean;
    isText: boolean;
    isInline: boolean;
    isTextblock: boolean;
    inlineContent: boolean;
    isLeaf: boolean;
    isAtom: boolean;
    create(attrs?: Object, content?: Fragment | ProsemirrorNode | ProsemirrorNode[], marks?: Mark[]): ProsemirrorNode
    createChecked(attrs?: Object, content?: Fragment | ProsemirrorNode | ProsemirrorNode[], marks?: Mark[]): ProsemirrorNode
    createAndFill(attrs?: Object, content?: Fragment | ProsemirrorNode | ProsemirrorNode[], marks?: Mark[]): ProsemirrorNode | null | undefined
    validContent(content: Fragment, attrs?: Object): boolean

  }
  export class MarkType {
    name: string;
    schema: Schema;
    spec: MarkSpec;
    create(attrs?: Object): Mark
    removeFromSet(set: Mark[]): Mark[]
    isInSet(set: Mark[]): Mark | null | undefined
    excludes(other: MarkType): boolean;

  }
  export interface SchemaSpec {
    nodes: { [name: string]: NodeSpec } | OrderedMap<NodeSpec>;
    marks?: { [name: string]: MarkSpec } | OrderedMap<MarkSpec>;
    topNode?: string;

  }
  export interface NodeSpec {
    content?: string;
    group?: string;
    inline?: boolean;
    atom?: boolean;
    attrs?: { [attr: string]: AttributeSpec };
    selectable?: boolean;
    draggable?: boolean;
    code?: boolean;
    defining?: boolean;
    isolating?: boolean;
    toDOM?(p: ProsemirrorNode): DOMOutputSpec
    parseDOM?: ParseRule[];

  }
  export interface MarkSpec {
    attrs?: { [attr: string]: AttributeSpec };
    inclusive?: boolean;
    excludes?: string;
    group?: string;
    toDOM?(mark: Mark): DOMOutputSpec
    parseDOM?: ParseRule[];

  }
  export interface AttributeSpec {
    default?: any;
    compute?(): any

  }
  export class Schema {
    constructor(spec: SchemaSpec)
    spec: SchemaSpec;
    nodes: { [name: string]: NodeType };
    marks: { [name: string]: MarkType };
    cached: Object;
    topNodeType: NodeType;
    node(type: string | NodeType, attrs?: Object, content?: Fragment | ProsemirrorNode | ProsemirrorNode[], marks?: Mark[]): ProsemirrorNode
    text(text: string, marks?: Mark[]): ProsemirrorNode
    mark(type: string | MarkType, attrs?: Object): Mark
    nodeFromJSON(json: Object): ProsemirrorNode
    markFromJSON(json: Object): Mark

  }
  interface DOMOutputSpecArray {
    0: string,
    1?: DOMOutputSpec | 0 | Object,
    2?: DOMOutputSpec | 0,
    3?: DOMOutputSpec | 0,
    4?: DOMOutputSpec | 0,
    5?: DOMOutputSpec | 0,
    6?: DOMOutputSpec | 0,
    7?: DOMOutputSpec | 0,
    8?: DOMOutputSpec | 0,
    9?: DOMOutputSpec | 0
  }
  type DOMOutputSpec
      = string
      | Node
      | DOMOutputSpecArray

  export class DOMSerializer {
    constructor(nodes: Object, marks: Object)
    nodes: { [name: string]: (node: ProsemirrorNode) => DOMOutputSpec };
    marks: { [name: string]: (mark: Mark) => DOMOutputSpec };
    serializeFragment(fragment: Fragment, options?: Object): DocumentFragment
    serializeNode(node: ProsemirrorNode, options?: Object): Node
    static renderSpec(doc: Document, structure: DOMOutputSpec): { dom: Node, contentDOM?: Node }
    static fromSchema(schema: Schema): DOMSerializer
    static nodesFromSchema(schema: Schema): { [name: string]: (node: ProsemirrorNode) => DOMOutputSpec }
    static marksFromSchema(schema: Schema): { [name: string]: (mark: Mark) => DOMOutputSpec }

  }

}