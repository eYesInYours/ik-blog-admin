declare module "@wangeditor/editor-for-vue" {
  import type { Component } from "vue"

  export const Editor: Component
  export const Toolbar: Component
}

declare module "@wangeditor/editor" {
  interface IDomEditor {
    destroy: () => void
  }
}
