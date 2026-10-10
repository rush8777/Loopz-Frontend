import {useCurrentFrame} from 'remotion';
import {BrandReveal} from '../motion/BrandReveal';
export function CommercialBrandScene() { return <BrandReveal frame={useCurrentFrame()}/>; }
