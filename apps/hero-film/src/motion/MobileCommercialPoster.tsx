import {Img,staticFile} from 'remotion';
import {palette} from './tokens';
export function MobileCommercialPoster() {
  return <div className="mobile-commercial">
    <Img src={staticFile('movcues-logo.png')} style={{width:350,position:'absolute',left:70,top:65}}/>
    <div className="mobile-commercial-title">Turn user behavior<br/><span>into action.</span></div>
    <svg width="960" height="720" viewBox="0 0 960 720" className="shape-canvas">
      <path d="M 100 525 C 250 525 330 445 480 475 S 650 525 780 475" fill="none" stroke="#c5d0ef" strokeWidth="3"/>
      {[100,290,480].map((x,i)=><circle key={x} cx={x} cy={[525,497,475][i]} r="12" fill={palette.blue}/>)}
      <circle cx="780" cy="475" r="49" fill={palette.blue}/><path d="M 759 475 L 774 490 L 801 460" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <div className="mobile-commercial-verbs">Understand. Target. Guide. Improve.</div>
  </div>;
}
