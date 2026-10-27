import type { CSSProperties } from 'react';

/**
 * A grey block that stands in for one line of text. It sits inside the same element
 * the real text will use, so it inherits that element's line height and nothing jumps.
 */
export function Sk({ w = '60%', style }: { w?: string | number; style?: CSSProperties }) {
  return <span className="sk" aria-hidden="true" style={{ width: w, ...style }} />;
}
