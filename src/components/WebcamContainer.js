import React from 'react';

const WebcamContainer = ({ imageRef, canvasRef, isConnected }) => {
  return (
    <div className="webcam-container">
      <img 
        ref={imageRef} 
        id="esp32-cam" 
        style={{ display: isConnected ? 'block' : 'none' }} 
        crossOrigin="anonymous"
      />
      <canvas 
        ref={canvasRef} 
        id="processing-canvas" 
        style={{ display: 'none' }} 
      />
    </div>
  );
};

export default WebcamContainer;