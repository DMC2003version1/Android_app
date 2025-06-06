import { AuthService } from '@/services/authService';

export async function handleLogin(username, password, router) {
    const authService = new AuthService();
    try {
        const loginResult = await authService.login(username, password);
        console.log('Login successful', loginResult);

        // Save tokens to localStorage
        authService.saveTokensToLocalStorage(loginResult);
        console.log("Tokens saved to localStorage successfully!");

        // Redirect to the upload page after successful login
        await router.push('/upload');
        console.log("Moved to upload page successfully!");
    } catch (error) {
        console.error('Login failed:', error);
    }
}
