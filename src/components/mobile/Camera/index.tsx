import React, { useRef } from 'react';
import Webcam from 'react-webcam';
import { Button } from 'antd-mobile';
import styles from './index.less';

interface CameraProps {
  onCapture: (image: string) => void;
}

const Camera: React.FC<CameraProps> = ({ onCapture }) => {
  const webcamRef = useRef<Webcam>(null);

  const capture = React.useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
    }
  }, [onCapture]);

  return (
    <div className={styles.cameraContainer}>
      <Webcam
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          facingMode: 'environment',
        }}
      />
      <Button block color="primary" onClick={capture}>
        拍照
      </Button>
    </div>
  );
};

export default Camera; 