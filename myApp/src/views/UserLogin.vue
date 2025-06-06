<template>
  <div class="login-page">
    <div class="login-container">
      <h1 class="login-header">Đăng nhập</h1>
      <p class="login-subheader">Vui lòng đăng nhập để tiếp tục</p>
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <ion-input 
            type="text" 
            v-model="username" 
            placeholder="Tên đăng nhập" 
            class="form-input"
            clear-input
          ></ion-input>
        </div>
        <div class="form-group">
          <ion-input 
            type="password" 
            v-model="password" 
            placeholder="Mật khẩu" 
            class="form-input"
            clear-input
          ></ion-input>
        </div>
        <ion-button expand="block" type="submit" class="login-button">
          Đăng nhập
        </ion-button>
      </form>
    </div>
  </div>
</template>

<script>
import { IonInput, IonButton } from '@ionic/vue';
import { handleLogin } from '@/services/loginService';

export default {
  name: 'UserLogin',
  components: { IonInput, IonButton },
  data() {
    return {
      username: '',
      password: ''
    };
  },
  methods: {
    async handleLogin() {
      await handleLogin(this.username, this.password, this.$router);
      this.$forceUpdate(); // Buộc Vue render lại giao diện
    },
    showNotification(message, type) {
      console.log(`[${type.toUpperCase()}] ${message}`);
      // Bạn có thể thay thế console.log bằng logic hiển thị thông báo thực tế
    }
  }
};
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(to bottom, #e3f2fd, #bbdefb);
  font-family: 'Roboto', sans-serif;
}

.login-container {
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
  width: 100%;
  max-width: 360px;
}

.login-header {
  font-size: 24px;
  font-weight: bold;
  color: #1e88e5;
  margin-bottom: 10px;
}

.login-subheader {
  font-size: 14px;
  color: #757575;
  margin-bottom: 20px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  position: relative;
}

.form-input {
  --background: #f5f5f5;
  --placeholder-color: #9e9e9e;
  --highlight-color-focused: #1e88e5;
  border-radius: 5px;
  padding: 10px;
}

.login-button {
  --background: #1e88e5;
  --background-hover: #1565c0;
  --color: white;
  font-size: 16px;
  font-weight: bold;
  border-radius: 5px;
}
</style>
