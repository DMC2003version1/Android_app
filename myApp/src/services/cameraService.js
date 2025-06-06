// src/services/cameraService.js

export class CameraService {
  constructor() {
    this.stream = null;
    this.isActive = false;
  }

  async startCamera(constraints = {}) {
    const defaultConstraints = {
      video: {
        facingMode: 'environment', // Back camera
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 30, max: 30 }
      }
    };

    const finalConstraints = { ...defaultConstraints, ...constraints };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
      this.isActive = true;
      return this.stream;
    } catch (error) {
      console.error('Error accessing camera:', error);
      throw new Error('Cannot access camera. Please check permissions.');
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.isActive = false;
    }
  }

  captureFrame(videoElement) {
    if (!videoElement || !this.isActive) {
      throw new Error('Camera not active or video element not available');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    ctx.drawImage(videoElement, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  async captureHighQualityPhoto(videoElement, quality = 0.95) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0);

    return canvas.toDataURL('image/jpeg', quality);
  }

  switchCamera() {
    // Toggle between front and back camera
    const constraints = {
      video: {
        facingMode: this.currentFacingMode === 'environment' ? 'user' : 'environment'
      }
    };
    
    this.stopCamera();
    return this.startCamera(constraints);
  }

  async getSupportedConstraints() {
    return navigator.mediaDevices.getSupportedConstraints();
  }

  async getAvailableDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  }
}

export default new CameraService();