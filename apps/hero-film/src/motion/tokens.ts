import { Easing, interpolate } from 'remotion';

export const palette = {
  navy: '#101a31',
  paper: '#f7f8fb',
  blue: '#3156c8',
  blueLight: '#91a8ff',
  ink: '#202020',
  muted: '#65738c',
  line: '#d9e0ee',
} as const;
export const easeOut = Easing.bezier(.16, 1, .3, 1);
export const easeInOut = Easing.bezier(.76, 0, .24, 1);
export const ramp = (f: number, a: number, b: number, easing = easeOut) =>
  interpolate(f, [a, b], [0, 1], {easing, extrapolateLeft:'clamp', extrapolateRight:'clamp'});
export const mix = (a: number, b: number, p: number) => a + (b-a)*p;
export type Point = {x:number;y:number};
export function cubic(p: number, points: [Point,Point,Point,Point]): Point {
  const q=1-p;
  return {x:q*q*q*points[0].x+3*q*q*p*points[1].x+3*q*p*p*points[2].x+p*p*p*points[3].x,
    y:q*q*q*points[0].y+3*q*q*p*points[1].y+3*q*p*p*points[2].y+p*p*p*points[3].y};
}
export const fontCss = (regular:string, semibold:string) => `@font-face{font-family:GT;src:url('${regular}') format('truetype');font-weight:400;font-display:block}@font-face{font-family:GT;src:url('${semibold}') format('opentype');font-weight:600 900;font-display:block}`;
