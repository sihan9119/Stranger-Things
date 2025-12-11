import React from 'react';

interface Props {
  onReset: () => void;
  onToggleCam: () => void;
  onToggleFullscreen: () => void;
  isCamVisible: boolean;
  isLoaded: boolean;
}

const Controls: React.FC<Props> = ({ onReset, onToggleCam, onToggleFullscreen, isCamVisible, isLoaded }) => {
  if (!isLoaded) return null;

  const baseBtnClass = "hell-btn absolute bottom-8 bg-black/90 text-red-900 border border-red-900 font-mono text-sm px-5 py-3 cursor-pointer z-20 shadow-[0_0_10px_#330000] transition-all duration-300 uppercase tracking-widest hover:bg-red-900 hover:text-white hover:shadow-[0_0_30px_#ff0000] hover:border-red-500 select-none";

  return (
    <>
      <button 
        onClick={onReset} 
        className={`${baseBtnClass} left-1/2 -translate-x-1/2`}
      >
        Reset Ritual
      </button>

      <button 
        onClick={onToggleCam} 
        className={`${baseBtnClass} right-[210px] hidden md:block`}
      >
        {isCamVisible ? '[ 👁 ] Hide Cam' : '[ ✖ ] Show Cam'}
      </button>

      <button 
        onClick={onToggleFullscreen} 
        className={`${baseBtnClass} right-8`}
      >
        [ ] Fullscreen
      </button>
    </>
  );
};

export default Controls;
