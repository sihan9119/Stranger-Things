import React, { useState, useRef, useCallback } from 'react';
import DemonScene from './components/DemonScene';
import HandController from './components/HandController';
import Controls from './components/Controls';
import { RitualStage, DemonSceneRef } from './types';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentStage, setCurrentStage] = useState<RitualStage>(RitualStage.IDLE);
  const [isCamVisible, setIsCamVisible] = useState(true);
  
  const demonSceneRef = useRef<DemonSceneRef>(null);

  const handleGesture = useCallback((action: 'ASCEND' | 'PULL' | 'ASH') => {
    if (!demonSceneRef.current) return;

    switch (action) {
      case 'ASCEND':
        demonSceneRef.current.triggerAscend();
        break;
      case 'PULL':
        demonSceneRef.current.triggerPullDown();
        break;
      case 'ASH':
        demonSceneRef.current.triggerAsh();
        break;
    }
  }, []);

  const handleReset = () => {
    demonSceneRef.current?.resetRitual();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.log(err));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-mono text-red-600">
      
      {/* Loading Screen */}
      {!isLoaded && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-xl font-bold tracking-widest text-shadow-red animate-pulse">
          OPENING GATES OF HELL...
          <style>{`.text-shadow-red { text-shadow: 0 0 10px red; }`}</style>
        </div>
      )}

      {/* 3D Scene */}
      <DemonScene 
        ref={demonSceneRef}
        onLoadComplete={() => setIsLoaded(true)}
        onStageChange={setCurrentStage}
      />

      {/* Inputs & Controls */}
      <HandController 
        isVisible={isCamVisible}
        currentStage={currentStage}
        isLoaded={isLoaded}
        onGesture={handleGesture}
      />

      <Controls 
        onReset={handleReset}
        onToggleCam={() => setIsCamVisible(!isCamVisible)}
        onToggleFullscreen={toggleFullscreen}
        isCamVisible={isCamVisible}
        isLoaded={isLoaded}
      />
    </div>
  );
};

export default App;
