import React, { useEffect, useRef } from 'react';
import { RitualStage } from '../types';

interface Props {
  isVisible: boolean;
  currentStage: RitualStage;
  isLoaded: boolean;
  onGesture: (action: 'ASCEND' | 'PULL' | 'ASH') => void;
}

const HandController: React.FC<Props> = ({ isVisible, currentStage, isLoaded, onGesture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Logic to detect fingers from MediaPipe landmarks
  const detectFingers = (landmarks: any[]) => {
    let fingers = 0;
    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];
    
    // Check 4 fingers
    tips.forEach((t, i) => { 
      if(landmarks[t].y < landmarks[pips[i]].y) fingers++; 
    });
    
    // Check thumb
    if (Math.abs(landmarks[4].x - landmarks[2].x) > Math.abs(landmarks[3].x - landmarks[2].x) * 1.5) {
      fingers++;
    }
    return fingers;
  };

  useEffect(() => {
    if (!videoRef.current) return;
    
    // Ensure libraries are loaded
    if (!window.Hands || !window.Camera) {
      console.error("MediaPipe scripts not loaded. Check index.html");
      return;
    }

    const hands = new window.Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0, // 0 for speed, 1 for accuracy
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    hands.onResults((results: any) => {
      if (!isLoaded) return;
      
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const fingers = detectFingers(landmarks);

        // State Machine Trigger Logic
        if (currentStage === RitualStage.IDLE) {
          if (fingers >= 3) onGesture('ASCEND');
        } 
        else if (currentStage === RitualStage.HOVERING_HIGH) {
          if (fingers <= 1) onGesture('PULL');
        } 
        else if (currentStage === RitualStage.HOVERING_NEAR) {
          if (fingers > 1) onGesture('ASH');
        }
      }
    });

    const camera = new window.Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await hands.send({ image: videoRef.current });
        }
      },
      width: 320,
      height: 240
    });

    camera.start();

    return () => {
      // Cleanup if necessary, though MediaPipe doesn't have a strict stop method exposed easily
    };
  }, [currentStage, isLoaded, onGesture]); // Re-bind when stage changes so closure has correct stage

  return (
    <div 
      className={`fixed top-0 left-0 w-[200px] h-[150px] z-[999] border-2 border-[#500] bg-black transition-opacity duration-500 pointer-events-none scale-x-[-1] ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
    </div>
  );
};

export default HandController;
