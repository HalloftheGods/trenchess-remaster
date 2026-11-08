/**
 * The Phaser UI kit. Every widget extends `Phaser.GameObjects.Container`, adds itself to the
 * scene in its constructor and positions by its top-left corner. Textures come from `paintUi`.
 */
export type { Choice } from "./widgets/common";
export { Panel, type PanelVariant } from "./widgets/Panel";
export { Button, type ButtonOptions } from "./widgets/Button";
export { Segmented } from "./widgets/Segmented";
export { Toggle } from "./widgets/Toggle";
export { Carousel } from "./widgets/Carousel";
export { MenuList, MENU_ROW, type MenuItem } from "./widgets/MenuList";
export { heading, slideIn, fadeOut, type HeadingKind, type SlideFrom } from "./widgets/motion";
