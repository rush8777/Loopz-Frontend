import type {CSSProperties} from 'react';
import {ramp} from './tokens';

/** A word is the reveal unit; characters settle with a restrained subframe stagger. */
export function KineticLine({text,frame,start=0,size=148,color='currentColor',style={},characterStagger=.35}: {
  text:string;frame:number;start?:number;size?:number;color?:string;style?:CSSProperties;characterStagger?:number;
}) {
  let index=0;
  return <div className="kinetic-line" style={{fontSize:size,color,...style}}>
    {text.split(' ').map((word,wi)=> {
      const at=start+wi*2.8;
      return <span key={wi} className="type-word-mask">
        {[...word].map((char,ci)=> {
          const p=ramp(frame,at+ci*characterStagger,at+ci*characterStagger+17);
          const key=index++;
          return <span key={key} className="type-character" style={{transform:`translateY(${(1-p)*1.1}em) rotate(${(1-p)*5}deg)`,filter:p<.96?`blur(${(1-p)*2.6}px)`:undefined}}>{char}</span>;
        })}
      </span>;
    })}
  </div>;
}
