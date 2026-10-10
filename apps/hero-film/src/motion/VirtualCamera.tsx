import type {ReactNode} from 'react';
export function VirtualCamera({children,x=0,y=0,scale=1,origin='960px 540px'}:{children:ReactNode;x?:number;y?:number;scale?:number;origin?:string}) {
  return <div className="virtual-camera" style={{transform:`translate(${x}px,${y}px) scale(${scale})`,transformOrigin:origin}}>{children}</div>;
}
