import {
   HEADROOM,
   MOBILE_BREAKPOINT_PX,
   SCALE_DESKTOP,
   SCALE_MOBILE,
   WORLD_HEIGHT,
} from '../engine/constants';

export type BoxSize = { inline: number; block: number };

export type CanvasSize = {
   scale: number;
   headroom: number;
   cssHeight: number;
   width: number;
   height: number;
};

export function canvasSize(
   css: BoxSize,
   device: BoxSize | undefined,
   dpr: number,
   windowWidth: number,
): CanvasSize {
   const scale = windowWidth < MOBILE_BREAKPOINT_PX ? SCALE_MOBILE : SCALE_DESKTOP;
   const headroom = HEADROOM * scale;
   const cssHeight = WORLD_HEIGHT * scale + headroom;
   const exactHeight = device && css.block === cssHeight ? device.block : undefined;
   return {
      scale,
      headroom,
      cssHeight,
      width: device?.inline ?? Math.round(css.inline * dpr),
      height: exactHeight ?? Math.round(cssHeight * dpr),
   };
}

export class Viewport {
   scale = SCALE_DESKTOP;
   cssWidth = 0;
   private css: BoxSize = { inline: 0, block: 0 };
   private appliedDpr = 0;
   private ratioQuery: MediaQueryList | null = null;
   private readonly sizeObserver = new ResizeObserver(([entry]) => this.onResized(entry));

   constructor(
      private readonly canvas: HTMLCanvasElement,
      private readonly ctx: CanvasRenderingContext2D,
      private readonly onResize: (width: number, mobile: boolean) => void,
   ) {
      const rect = canvas.getBoundingClientRect();
      this.resize({ inline: rect.width, block: rect.height }, undefined);
      try {
         this.sizeObserver.observe(canvas, { box: 'device-pixel-content-box' });
      } catch {
         this.sizeObserver.observe(canvas);
         this.watchRatio();
      }
   }

   get dpr(): number {
      return window.devicePixelRatio || 1;
   }

   get mobile(): boolean {
      return this.scale === SCALE_MOBILE;
   }

   private onResized(entry: ResizeObserverEntry | undefined): void {
      const box = entry?.contentBoxSize?.[0];
      if (!entry || !box) return;
      const device = entry.devicePixelContentBoxSize?.[0];
      this.resize(
         { inline: box.inlineSize, block: box.blockSize },
         device && { inline: device.inlineSize, block: device.blockSize },
      );
   }

   private resize(css: BoxSize, device: BoxSize | undefined): void {
      const { canvas, ctx, dpr } = this;
      const size = canvasSize(css, device, dpr, window.innerWidth);
      this.css = css;
      const unchanged =
         canvas.width === size.width &&
         canvas.height === size.height &&
         this.cssWidth === css.inline &&
         this.scale === size.scale &&
         this.appliedDpr === dpr;
      if (unchanged) return;
      this.cssWidth = css.inline;
      this.scale = size.scale;
      this.appliedDpr = dpr;
      canvas.width = size.width;
      canvas.height = size.height;
      canvas.style.height = `${size.cssHeight}px`;
      canvas.style.marginTop = `${-size.headroom}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, size.headroom * dpr);
      ctx.imageSmoothingEnabled = false;
      this.onResize(this.cssWidth / this.scale, this.mobile);
   }

   private readonly watchRatio = () => {
      this.ratioQuery?.removeEventListener('change', this.onRatioChange);
      this.ratioQuery = window.matchMedia(`(resolution: ${this.dpr}dppx)`);
      this.ratioQuery.addEventListener('change', this.onRatioChange);
   };

   private readonly onRatioChange = () => {
      this.resize(this.css, undefined);
      this.watchRatio();
   };

   dispose(): void {
      this.sizeObserver.disconnect();
      this.ratioQuery?.removeEventListener('change', this.onRatioChange);
   }
}
