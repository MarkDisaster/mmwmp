import { FONT_HEIGHT, glyph, LETTER_GAP, pixelTextWidth, SPACE_WIDTH } from '../render/pixelFont';

type PixelTextProps = {
   text: string;
   className?: string;
};

export function PixelText({ text, className }: PixelTextProps) {
   const pixels: { x: number; y: number }[] = [];
   let cursor = 0;
   for (const char of text) {
      const rows = glyph(char);
      rows?.forEach((row, y) => {
         for (let x = 0; x < row.length; x++) {
            if (row[x] === '#') pixels.push({ x: cursor + x, y });
         }
      });
      cursor += (rows?.[0].length ?? SPACE_WIDTH) + LETTER_GAP;
   }

   return (
      <svg
         className={className}
         viewBox={`0 0 ${pixelTextWidth(text)} ${FONT_HEIGHT}`}
         shapeRendering="crispEdges"
         fill="currentColor"
         role="img"
         aria-label={text}
      >
         {pixels.map(({ x, y }) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
         ))}
      </svg>
   );
}
