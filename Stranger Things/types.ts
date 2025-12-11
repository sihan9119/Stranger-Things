import { MutableRefObject } from 'react';

export enum RitualStage {
  IDLE = 'IDLE',
  RISING = 'RISING',
  HOVERING_HIGH = 'HOVERING_HIGH',
  MOVING_DOWN = 'MOVING_DOWN',
  HOVERING_NEAR = 'HOVERING_NEAR',
  DISSOLVING = 'DISSOLVING'
}

export interface DemonSceneRef {
  resetRitual: () => void;
  triggerAscend: () => void;
  triggerPullDown: () => void;
  triggerAsh: () => void;
  isLoaded: () => boolean;
}

// MediaPipe types since we are loading via CDN
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}
