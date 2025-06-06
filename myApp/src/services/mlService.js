// src/services/mlService.js
import * as tf from '@tensorflow/tfjs';

class MLService {
  constructor() {
    this.model = null;
    this.isLoaded = false;
    this.inputShape = [640, 640]; // YOLO input size
  }

  async loadModel() {
    if (this.isLoaded) return;
    
    try {
      // Load TensorFlow.js model (converted from YOLO)
      this.model = await tf.loadLayersModel('/assets/models/yolov8.json');
      this.isLoaded = true;
      console.log('YOLO model loaded successfully');
    } catch (error) {
      console.error('Error loading YOLO model:', error);
      throw error;
    }
  }

  async detectObjects(imageData) {
    if (!this.isLoaded) {
      await this.loadModel();
    }

    try {
      // Convert image to tensor
      const tensor = await this.preprocessImage(imageData);
      
      // Run inference
      const predictions = await this.model.predict(tensor);
      
      // Post-process results
      const detections = await this.postprocessPredictions(predictions);
      
      // Cleanup tensors
      tensor.dispose();
      predictions.dispose();
      
      return detections;
    } catch (error) {
      console.error('Detection error:', error);
      return [];
    }
  }

  async preprocessImage(imageData) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.inputShape[0];
        canvas.height = this.inputShape[1];
        
        // Draw and resize image
        ctx.drawImage(img, 0, 0, this.inputShape[0], this.inputShape[1]);
        
        // Convert to tensor
        const tensor = tf.browser.fromPixels(canvas)
          .expandDims(0)
          .div(255.0); // Normalize to [0, 1]
        
        resolve(tensor);
      };
      img.src = imageData;
    });
  }

  async postprocessPredictions(predictions) {
    // YOLO post-processing logic
    const boxes = [];
    const scores = [];
    const classes = [];
    
    // Extract predictions (simplified - adjust based on your YOLO format)
    const predArray = await predictions.data();
    
    // Parse YOLO output format
    for (let i = 0; i < predArray.length; i += 6) { // Assuming [x, y, w, h, conf, class]
      const confidence = predArray[i + 4];
      
      if (confidence > 0.5) { // Confidence threshold
        boxes.push({
          x: predArray[i] * window.innerWidth / this.inputShape[0],
          y: predArray[i + 1] * window.innerHeight / this.inputShape[1],
          width: predArray[i + 2] * window.innerWidth / this.inputShape[0],
          height: predArray[i + 3] * window.innerHeight / this.inputShape[1],
          confidence: confidence,
          class: Math.round(predArray[i + 5])
        });
      }
    }
    
    return boxes;
  }

  // Alternative: Use Web API for ML (if available)
  async detectWithWebML(imageData) {
    try {
      // Use browser's ML capabilities if available
      if ('ml' in navigator) {
        const detector = await navigator.ml.createObjectDetector({
          modelUrl: '/assets/models/yolov8.tflite'
        });
        
        const results = await detector.detect(imageData);
        return this.formatWebMLResults(results);
      }
    } catch (error) {
      console.log('WebML not available, fallback to TensorFlow.js');
      return this.detectObjects(imageData);
    }
  }

  formatWebMLResults(results) {
    return results.map(result => ({
      x: result.boundingBox.x,
      y: result.boundingBox.y,
      width: result.boundingBox.width,
      height: result.boundingBox.height,
      confidence: result.confidence,
      class: result.label
    }));
  }

  // Mock detection for testing
  generateMockDetections() {
    const mockResults = [];
    const numBoxes = Math.floor(Math.random() * 30) + 15;
    
    for (let i = 0; i < numBoxes; i++) {
      mockResults.push({
        x: Math.random() * (window.innerWidth - 100),
        y: Math.random() * (window.innerHeight - 100),
        width: Math.random() * 80 + 40,
        height: Math.random() * 80 + 40,
        confidence: Math.random(),
        class: 'bill_item'
      });
    }
    
    return mockResults;
  }
}

export default new MLService();