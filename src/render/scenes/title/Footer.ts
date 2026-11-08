import Phaser from "phaser";
import { COLOR, FONT } from "../../ui/fonts";
import { OMEGA_KEY } from "../SplashScene";

const MARGIN = 16;
const OMEGA = 22;

const SMALL: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: FONT.body, fontSize: "12px", color: COLOR.dim };

/**
 * Title footer: the version bottom-left, "© 2006–<build year> Hall of the Gods, Inc." with the
 * small Omega bottom-right. `layout()` re-anchors it to the current screen size.
 */
export class Footer extends Phaser.GameObjects.Container {
  private readonly version: Phaser.GameObjects.Text;
  private readonly omega: Phaser.GameObjects.Image;
  private readonly copyright: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.version = scene.add.text(0, 0, `v${__APP_VERSION__}`, SMALL).setOrigin(0, 1);
    this.copyright = scene.add.text(0, 0, `© 2006–${__BUILD_YEAR__} Hall of the Gods, Inc.`, SMALL).setOrigin(1, 1);
    this.omega = scene.add.image(0, 0, OMEGA_KEY).setDisplaySize(OMEGA, OMEGA).setOrigin(1, 1).setAlpha(0.9);
    this.add([this.version, this.copyright, this.omega]);
    scene.add.existing(this);
  }

  layout(w: number, h: number): void {
    const bottom = h - MARGIN;
    this.version.setPosition(MARGIN, bottom);
    this.copyright.setPosition(w - MARGIN, bottom);
    this.omega.setPosition(w - MARGIN - this.copyright.width - 8, bottom + 2);
  }
}
