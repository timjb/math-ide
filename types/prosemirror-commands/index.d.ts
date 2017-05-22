// Type definitions for prosemirror-commands 0.18
// Project: https://github.com/ProseMirror/prosemirror-commands
// Definitions by: David Hahn <https://github.com/davidka>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped


declare module "prosemirror-commands" {

  import { EditorState } from 'prosemirror-state'
  import { Transaction } from 'prosemirror-state'
  import { EditorView } from 'prosemirror-view'
  import { NodeType } from 'prosemirror-model'
  import { MarkType } from 'prosemirror-model'
  import { ProsemirrorNode } from 'prosemirror-model'

  export type Command = (editorState: EditorState, dispatch?: ((tr: Transaction) => void)) => boolean;

  export const deleteSelection: Command;
  export function joinBackward(state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView): boolean
  export function joinForward(state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView): boolean
  export const joinUp: Command
  export const joinDown: Command
  export const lift: Command
  export const newlineInCode: Command
  export const exitCode: Command
  export const createParagraphNear: Command
  export const liftEmptyBlock: Command
  export const splitBlock: Command
  export const splitBlockKeepMarks: Command
  export const selectParentNode: Command
  export function wrapIn(nodeType: NodeType, attrs?: Object): Command
  export function setBlockType(nodeType: NodeType, attrs?: Object): Command
  export function toggleMark(markType: MarkType, attrs?: Object): Command
  export function autoJoin(command: Command, isJoinable: ((before: ProsemirrorNode, after: ProsemirrorNode) => boolean) | string[]): Command
  export function chainCommands(...commands: Command[]): Command

  let baseKeymap: { [key: string]: Command };

}