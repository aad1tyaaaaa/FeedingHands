import React, { useState } from 'react';

const CameraConnectionUI = ({ setImageCapture, setIsConnected, imageRef, handleImageUpload }) => {
  const [cameraIP, setCameraIP] = useState("http://192.168.163.130");
  const [streamPath, setStreamPath] = useState("/capture");

  const connectToCamera = () => {
    const url = `${cameraIP}${streamPath}`;
    imageRef.current.src = url;
    imageRef.current.onload = () => {
      setIsConnected(true);
      setImageCapture(imageRef.current);
    };
    imageRef.current.onerror = () => {
      setIsConnected(false);
      alert("Failed to connect to camera. Please check the IP and path.");
    };
  };

  const triggerImageUpload = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = handleImageUpload;
    fileInput.click();
  };

  return (
    <div className="camera-connection-ui">
      <h3>Connect to ESP32 Camera</h3>
      <div className="input-group">
        <label>Camera IP Address:</label>
        <input 
          type="text" 
          value={cameraIP} 
          onChange={(e) => setCameraIP(e.target.value)} 
        />
      </div>
      <div className="input-group">
        <label>Stream Path:</label>
        <input 
          type="text" 
          value={streamPath} 
          onChange={(e) => setStreamPath(e.target.value)} 
        />
      </div>
      <div className="button-group">
        <button onClick={connectToCamera}>Connect</button>
        <button onClick={triggerImageUpload}>Upload Image</button>
      </div>
    </div>
  );
};

export default CameraConnectionUI;