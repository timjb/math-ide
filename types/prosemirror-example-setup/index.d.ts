declare module "prosemirror-example-setup" {
  import {Schema} from "prosemirror-model"
  import {MenuElement, Dropdown} from "prosemirror-menu"

  export function buildMenuItems(schema: Schema): {
    fullMenu: MenuElement[][],
    typeMenu: Dropdown
    // TODO: more
  }
}