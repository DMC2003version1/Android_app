<template>
  <div class="smart-camera-container">
    <!-- Header -->
    <header class="camera-header">
      <button class="back-button" @click="$emit('back')">
        ← Back
      </button>
      <h2>Smart Bill Scanner</h2>
      <button class="switch-camera" @click="switchCamera" v-if="canSwitchCamera">
        🔄
      </button>
    </header>

    <!-- Camera Preview -->
    <div class="camera-preview-container">
      <video
        ref="videoElement"
        autoplay
        playsinline
        muted
        class="camera-video"
        @loadedmetadata="onVideoLoaded"
      ></video>

      <!-- Detection Overlay -->
      <div ref="detectionOverlay" class="detection-overlay"></div>

      <!-- Detection Info Overlay -->
      <div class="detection-info">
        <div class="stats-row">
          <span class="stat-item">
            📦 {{ detectionStats.totalBoxes }}
          </span>
          <span class="stat-item" :class="{ 'highlight': detectionStats.highConfidenceBoxes >= 20 }">
            ✅ {{ detectionStats.highConfidenceBoxes }}/20
          </span>
          <span class="stat-item" :class="{ 'highlight': detectionStats.readyToCapture }">
            📸 {{ detectionStats.readyToCapture ? 'READY' : 'NOT READY' }}
          </span>
        </div>
        
        <!-- Progress Bar -->
        <div class="progress-container">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: progressPercentage + '%' }"
              :class="{ 'ready': detectionStats.readyToCapture }"
            ></div>
          </div>
          <span class="progress-text">{{ Math.round(progressPercentage) }}%</span>
        </div>
      </div>

      <!-- Instructions -->
      <div class="instructions" v-if="!detectionStats.readyToCapture">
        <p v-if="detectionStats.totalBoxes < 10">
          📋 Point camera at your bill/receipt
        </p>
        <p v-else-if="detectionStats.highConfidenceBoxes < 20">
          🎯 Hold steady for better detection
        </p>
        <p v-else>
          ⚡ Almost ready for capture...
        </p>
      </div>

      <!-- Auto Capture Countdown -->
      <div v-if="countdownActive" class="countdown-overlay">
        <div class="countdown-circle">
          <span class="countdown-number">{{ countdown }}</span>
        </div>
        <p>Auto capturing in {{ countdown }} seconds...</p>
      </div>
    </div>

    <!-- Controls -->
    <div class="camera-controls">
      <button 
        class="control-button" 
        :class="{ 'active': isDetecting }"
        @click="toggleDetection"
      >
        {{ isDetecting ? '⏸️ Pause' : '▶️ Start' }}
      </button>
      
      <button 
        class="capture-button" 
        @click="manualCapture"
        :disabled="!canCapture"
      >
        📷 Capture
      </button>
      
      <button class="control-button" @click="switchToNormalCamera">
        📱 Normal Camera
      </button>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>
  </div>
</template>

<script>
import MLService from '@/services/mlService'
import CameraService from '@/services/cameraService'

export default {
  name: 'SmartCamera',
  emits: ['photo-captured', 'back', 'switch-to-normal'],
  
  data() {
    return {
      isDetecting: false,
      isLoading: false,
      loadingMessage: 'Initializing camera...',
      canSwitchCamera: false,
      canCapture: false,
      
      detectionStats: {
        totalBoxes: 0,
        highConfidenceBoxes: 0,
        readyToCapture: false
      },
      
      countdown: 0,
      countdownActive: false,
      countdownTimer: null,
      
      detectionInterval: null,
      frameCount: 0
    }
  },

  computed: {
    progressPercentage() {
      const highConfidenceRatio = Math.min(this.detectionStats.highConfidenceBoxes / 20, 1);
      const totalBoxesRatio = Math.min(this.detectionStats.totalBoxes / 30, 1);
      return (highConfidenceRatio * 0.7 + totalBoxesRatio * 0.3) * 100;
    }
  },

  async mounted() {
    await this.initializeCamera();
  },

  beforeUnmount() {
    this.cleanup();
  },

  methods: {
    async initializeCamera() {
      try {
        this.isLoading = true;
        this.loadingMessage = 'Accessing camera...';

        const stream = await CameraService.startCamera();
        this.$refs.videoElement.srcObject = stream;

        this.loadingMessage = 'Loading AI model...';
        await MLService.loadModel();

        this.canSwitchCamera = await this.checkMultipleCameras();
        this.isLoading = false;

      } catch (error) {
        console.error('Camera initialization error:', error);
        this.isLoading = false;
        alert('Cannot access camera: ' + error.message);
      }
    },

    async checkMultipleCameras() {
      const devices = await CameraService.getAvailableDevices();
      return devices.length > 1;
    },

    onVideoLoaded() {
      this.canCapture = true;
      // Auto start detection
      this.startDetection();
    },

    startDetection() {
      if (this.isDetecting) return;
      
      this.isDetecting = true;
      this.runContinuousDetection();
    },

    stopDetection() {
      this.isDetecting = false;
      if (this.detectionInterval) {
        clearInterval(this.detectionInterval);
        this.detectionInterval = null;
      }
    },

    toggleDetection() {
      if (this.isDetecting) {
        this.stopDetection();
      } else {
        this.startDetection();
      }
    },

    runContinuousDetection() {
      const detectFrame = async () => {
        if (!this.isDetecting) return;

        try {
          const imageData = CameraService.captureFrame(this.$refs.videoElement);
          
          // Use mock data for now - replace with actual ML inference
          const detections = MLService.generateMockDetections();
          // const detections = await MLService.detectObjects(imageData);
          
          this.updateDetectionStats(detections);
          this.drawBoundingBoxes(detections);
          
          // Check auto capture condition
          if (this.shouldAutoCapture(detections)) {
            await this.startAutoCapture();
            return;
          }

        } catch (error) {
          console.error('Detection error:', error);
        }

        // Continue detection
        setTimeout(detectFrame, 100); // 10 FPS
      };

      detectFrame();
    },

    shouldAutoCapture(detections) {
      const validBoxes = detections.filter(box => box.confidence > 0.8);
      if (validBoxes.length < 20) return false;

      const highScoreBoxes = detections.filter(box => box.confidence > 0.7);
      const percentage = highScoreBoxes.length / detections.length;

      return percentage > 0.7;
    },

    updateDetectionStats(detections) {
      this.detectionStats = {
        totalBoxes: detections.length,
        highConfidenceBoxes: detections.filter(d => d.confidence > 0.8).length,
        readyToCapture: this.shouldAutoCapture(detections)
      };
    },

    drawBoundingBoxes(detections) {
      const overlay = this.$refs.detectionOverlay;
      overlay.innerHTML = '';

      detections.forEach(detection => {
        const box = document.createElement('div');
        box.className = `bounding-box ${detection.confidence > 0.8 ? 'high-confidence' : 'low-confidence'}`;
        
        box.style.cssText = `
          position: absolute;
          left: ${detection.x}px;
          top: ${detection.y}px;
          width: ${detection.width}px;
          height: ${detection.height}px;
          border: 2px solid ${detection.confidence > 0.8 ? '#00ff00' : '#ff6600'};
          border-radius: 4px;
          pointer-events: none;
        `;

        // Add confidence label
        const label = document.createElement('span');
        label.textContent = `${(detection.confidence * 100).toFixed(0)}%`;
        label.style.cssText = `
          position: absolute;
          top: -20px;
          left: 0;
          background: ${detection.confidence > 0.8 ? '#00ff00' : '#ff6600'};
          color: white;
          padding: 2px 4px;
          font-size: 10px;
          border-radius: 2px;
          font-weight: bold;
        `;
        
        box.appendChild(label);
        overlay.appendChild(box);
      });
    },

    async startAutoCapture() {
      if (this.countdownActive) return;

      this.countdownActive = true;
      this.countdown = 3;
      
      this.countdownTimer = setInterval(() => {
        this.countdown--;
        if (this.countdown <= 0) {
          clearInterval(this.countdownTimer);
          this.capturePhoto();
        }
      }, 1000);
    },

    async manualCapture() {
      if (this.countdownActive) {
        this.cancelAutoCapture();
      }
      await this.capturePhoto();
    },

    cancelAutoCapture() {
      this.countdownActive = false;
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
    },

    async capturePhoto() {
      try {
        this.stopDetection();
        
        const imageData = await CameraService.captureHighQualityPhoto(
          this.$refs.videoElement, 
          0.95
        );

        this.$emit('photo-captured', imageData);
        
      } catch (error) {
        console.error('Capture error:', error);
        alert('Error capturing photo: ' + error.message);
      } finally {
        this.countdownActive = false;
      }
    },

    async switchCamera() {
      try {
        this.stopDetection();
        await CameraService.switchCamera();
        this.startDetection();
      } catch (error) {
        console.error('Switch camera error:', error);
      }
    },

    switchToNormalCamera() {
      this.$emit('switch-to-normal');
    },

    cleanup() {
      this.stopDetection();
      this.cancelAutoCapture();
      CameraService.stopCamera();
    }
  }
}
</script>

<style scoped>
.smart-camera-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: black;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.camera-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: rgba(0,0,0,0.7);
  color: white;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.back-button, .switch-camera {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.camera-preview-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.detection-info {
  position: absolute;
  top: 60px;
  left: 15px;
  right: 15px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 10px;
  border-radius: 8px;
  z-index: 5;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.stat-item {
  font-size: 12px;
  padding: 4px 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
}

.stat-item.highlight {
  background: #4CAF50;
  font-weight: bold;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #ff6600;
  transition: width 0.3s ease;
  border-radius: 3px;
}

.progress-fill.ready {
  background: #4CAF50;
}

.progress-text {
  font-size: 12px;
  font-weight: bold;
}

.instructions {
  position: absolute;
  bottom: 120px;
  left: 15px;
  right: 15px;
  text-align: center;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 10px;
  border-radius: 8px;
}

.countdown-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  z-index: 20;
}

.countdown-circle {
  width: 80px;
  height: 80px;
  border: 4px solid #4CAF50;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
  background: rgba(0,0,0,0.5);
}

.countdown-number {
  font-size: 32px;
  font-weight: bold;
}

.camera-controls {
  position: absolute;
  bottom: 20px;
  left: 15px;
  right: 15px;
  display: flex;
  justify-content: space-around;
  gap: 10px;
}

.control-button, .capture-button {
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.control-button {
  background: rgba(255,255,255,0.2);
  color: white;
  flex: 1;
}

.control-button.active {
  background: #ff6600;
}

.capture-button {
  background: #4CAF50;
  color: white;
  flex: 2;
  font-weight: bold;
}

.capture-button:disabled {
  background: #666;
  cursor: not-allowed;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  z-index: 30;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.bounding-box {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 0.8; }
  50% { opacity: 1; }
  100% { opacity: 0.8; }
}
</style>