<template>
  <div class="image-upload-page">
    <!-- Header Section -->
    <header class="header-section">
      <h1>Image Upload & Annotation</h1>
      <button class="logout-button" @click="handleLogout">Logout</button>
    </header>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Upload Area -->
      <div class="upload-area">
        <div v-if="preview" class="preview-container">
          <canvas ref="canvas" class="preview-canvas"></canvas>
          <button class="clear-button" @click="clearImage">Clear</button>
        </div>
        <div v-else class="placeholder">
          <p>Drag and drop an image here or</p>
          <label for="image" class="file-label">click to select</label>
          <input 
            type="file" 
            id="image" 
            @change="handleFileSelect" 
            accept="image/*" 
            class="file-input"
          />
          <br />
          <!-- Updated buttons -->
          <button class="camera-button smart" @click="openSmartCamera">
            🤖 Smart AI Camera
          </button>
          <button class="camera-button" @click="openCamera">
            📷 Normal Camera
          </button>

          <!-- Hiển thị ảnh preview nếu có -->
          <img v-if="preview" :src="preview" alt="Ảnh đã chụp" style="max-width: 100%; margin-top: 10px" />

          <!-- Canvas để vẽ ảnh nếu cần -->
          <canvas ref="canvas" style="display: none"></canvas>
        </div>
      </div>

      <!-- Output Section -->
      <div class="output-section">
        <h2>Extracted Information</h2>
        <table v-if="tableData.length > 0" class="output-table">
          <thead>
            <tr>
              <th>PRODUCT_NAME</th>
              <th>AMOUNT</th>
              <th>UPRICE</th>
              <th>SUB_TPRICE</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in tableData" :key="index">
              <td>{{ row.PRODUCT_NAME || '' }}</td>
              <td>{{ row.AMOUNT || '' }}</td>
              <td>{{ row.UPRICE || '' }}</td>
              <td>{{ row.SUB_TPRICE || '' }}</td>
            </tr>
          </tbody>
        </table>
        <ul v-if="filteredOutput.length > 0" class="extracted-list">
          <li v-for="(item, index) in filteredOutput" :key="index">
            <strong>{{ item.label }}:</strong> {{ item.text }}
          </li>
        </ul>
      </div>
    </div>

    <!-- Submit Section -->
    <div class="submit-section">
      <button 
        class="upload-button" 
        :disabled="!selectedFile || isUploading" 
        @click="uploadImage"
      >
        <span v-if="isUploading">Uploading...</span>
        <span v-else>Send</span>
      </button>
    </div>

    <!-- Notification -->
    <div v-if="notification" :class="['notification', notification.type]">
      {{ notification.message }}
    </div>
  </div>
</template>

<script>
import { handleFileSelect, clearImage, drawImageOnCanvas, base64ToFile } from '@/services/fileService';
import { handleLogout } from '@/services/authService';
import { uploadImage } from '@/services/uploadService';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import SmartCamera from '@/views/SmartCamera.vue'

export default {
  name: 'ImageUpload',
  components: {
    SmartCamera
  },
  data() {
    return {
      formData: {
        title: 'chào',
      },
      selectedFile: null,
      preview: null,
      isUploading: false,
      notification: null,
      boundingBoxes: [],
      extractedText: [],
      tableData: [],
      showSmartCamera: false
    };
  },
  computed: {
    filteredOutput() {
      // Đảm bảo đúng thứ tự: Tổng, Thời gian, Tiền trả lại
      const labelMap = {
        TPRICE: 'Tổng',
        DATETIME: 'Thời gian',
        FPRICE: 'Tổng sau khi giảm giá'
      };
      const order = ['TPRICE', 'DATETIME', 'FPRICE'];
      // Lọc và sắp xếp theo thứ tự mong muốn
      return order.map(cls => {
        const found = this.extractedText.find(item => item.class === cls);
        return found ? { ...found, label: labelMap[cls] } : null;
      }).filter(Boolean);
    }
  },
  methods: {
    handleFileSelect(event) {
      handleFileSelect(event, this);
    },
    openSmartCamera() {
      this.showSmartCamera = true;
    },
    switchToNormalCamera() {
      this.showSmartCamera = false;
      this.openCamera(); // Existing normal camera method
    },
    handleSmartCameraCapture(imageData) {
      // Process captured image from smart camera
      this.preview = imageData;
      
      // Convert to file for upload
      const file = this.base64ToFile(imageData, 'smart-capture.jpg');
      this.selectedFile = file;
      
      // Draw on canvas
      this.$nextTick(() => {
        this.drawImageOnCanvas(imageData);
      });
      
      // Close smart camera
      this.showSmartCamera = false;
      
      // Auto upload if needed
      // this.uploadImage();
    },
    // async openCamera() {
    //   if (window.Capacitor && window.Capacitor.isNativePlatform) {
    //     // Nếu đang chạy trong ứng dụng Capacitor (mobile app)
    //     await this.capturePhoto();
    //   } else {
    //     // Nếu là trình duyệt web (fallback)
    //     this.$refs.cameraInput.click();
    //   }
    // },

    // async capturePhoto() {
    //   try {
    //     const photo = await Camera.getPhoto({
    //       quality: 80,
    //       allowEditing: false,
    //       resultType: CameraResultType.Base64,
    //       source: CameraSource.Camera,
    //     });
    //     console.log("Photo captured:", photo); // 👈 Thêm dòng này

    //     if (photo?.base64String) {
    //       console.log("Đến bước 1"); // 👈 Thêm dòng này
    //       const mimeType = `image/${photo.format}` || 'image/jpeg';
    //       const base64Full = `data:${mimeType};base64,${photo.base64String}`;
    //       console.log("Đến bước 2"); // 👈 Thêm dòng này
    //       const file = base64ToFile(base64Full, 'captured.' + photo.format);

    //       console.log("Đến bước 3"); // 👈 Thêm dòng này
    //       this.selectedFile = file;
    //       this.preview = base64Full;

    //       this.$nextTick(() => {
    //         this.drawImageOnCanvas(this.preview);
    //       });
    //     } else {
    //       this.showNotification('Không chụp được ảnh, vui lòng thử lại.', 'error');
    //     }
    //   } catch (err) {
    //     console.error('Lỗi thực tế:', err);
    //     this.showNotification('Không thể truy cập camera hoặc thao tác bị hủy', 'error');
    //   }
    // },
    clearImage() {
      clearImage(this);
    },
    drawImageOnCanvas(imageSrc) {
      drawImageOnCanvas(imageSrc, this);
    },
    handleLogout() {
      handleLogout(this);
    },
    uploadImage() {
      uploadImage(this);
    },
    showNotification(message, type) {
      this.notification = { message, type };
      setTimeout(() => {
        this.notification = null;
      }, 3000);
    }
  }
};
</script>

<style scoped>
/* General Styles */
.image-upload-page {
  font-family: 'Arial', sans-serif;
  color: #333;
  background: linear-gradient(to bottom, #f0f4f8, #d9e2ec);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  overflow-y: auto; /* Cho phép cuộn dọc */
}

/* Header Section */
.header-section {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #4CAF50;
  color: white;
  padding: 10px 15px;
  border-radius: 8px;
  margin-bottom: 15px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-section h1 {
  margin: 0;
  font-size: 20px;
}

.logout-button {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
}

.logout-button:hover {
  background-color: #d32f2f;
}

/* Main Content */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  max-width: 400px;
}

/* Upload Area */
.upload-area {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2px dashed #ccc;
  border-radius: 8px;
  background-color: white;
  padding: 15px;
  position: relative;
  transition: background-color 0.3s;
  max-width: 100%;
  max-height: 100%;
}

.upload-area:hover {
  background-color: #f9f9f9;
}

.placeholder {
  text-align: center;
  color: #888;
  font-size: 14px;
}

.file-input {
  display: none;
}

.preview-container {
  position: relative;
  width: 100%;
  max-width: 100%;
  max-height: 50vh; /* Giới hạn chiều cao không quá nửa màn hình */
  overflow: hidden;
}

.preview-canvas {
  width: 100%;
  height: auto;
  max-width: 100%;
  max-height: 50vh; /* Giới hạn chiều cao không quá nửa màn hình */
  border-radius: 8px;
}

.clear-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 12px;
}

.clear-button:hover {
  background-color: #d32f2f;
}

/* Output Section */
.output-section {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.output-section h2 {
  margin-bottom: 10px;
  font-size: 16px;
  color: #333;
}

.output-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
}

.output-table th,
.output-table td {
  border: 1px solid #ccc;
  padding: 6px;
  text-align: left;
  font-size: 12px;
}

.output-table th {
  background-color: #f4f4f4;
  font-weight: bold;
}

.extracted-list {
  list-style: none;
  padding: 0;
}

.extracted-list li {
  margin-bottom: 6px;
  font-size: 12px;
  color: #555;
}

/* Submit Section */
.submit-section {
  margin-top: 15px;
}

.upload-button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.upload-button:hover {
  background-color: #45a049;
}

.upload-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

/* Notification */
.notification {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
  font-size: 12px;
}

.notification.success {
  background-color: #4CAF50;
  color: white;
}

.notification.error {
  background-color: #f44336;
  color: white;
}

.file-label {
  color: #4CAF50;
  cursor: pointer;
  text-decoration: underline;
  font-weight: bold;
  font-size: 14px;
}

.file-label:hover {
  color: #45a049;
}

.camera-button {
  margin-top: 10px;
  padding: 10px 20px;
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.camera-button:hover {
  background-color: #1565c0;
}
</style>