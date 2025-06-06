import { createRouter, createWebHistory } from '@ionic/vue-router';
import { nextTick } from 'vue';

import Login from '@/views/UserLogin.vue'; // Import file Login.vue
import Upload from '@/views/ImageUpload.vue'; // Giả sử có trang Upload.vue
import { AuthService } from '@/services/authService'; // Import AuthService

const authService = new AuthService();

// Kiểm tra xem người dùng đã đăng nhập chưa
function isAuthenticated() {
  return !!authService.isAuthenticated(); // Đảm bảo trả về boolean chính xác
}

const routes = [
  {
    path: '/',
    redirect: '/login', // Chuyển hướng đến màn hình Login khi truy cập root
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/upload',
    name: 'Upload',
    component: Upload,
    beforeEnter: (to, from, next) => {
      // Kiểm tra trạng thái đăng nhập trước khi vào trang Upload
      if (isAuthenticated()) {
        console.log("User is authenticated, accessing upload page.");
        next(); // Gọi trực tiếp next() mà không cần nextTick
      } else {
        console.log("User is not authenticated, redirecting to login.");
        next('/login'); // Nếu chưa đăng nhập, chuyển hướng tới trang login
      }
    },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
