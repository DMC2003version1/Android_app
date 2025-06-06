import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import CryptoJS from "crypto-js";

// Load environment variables using import.meta.env
const clientId = import.meta.env.VITE_APP_COGNITO_CLIENT_ID;
const clientSecret = import.meta.env.VITE_APP_COGNITO_CLIENT_SECRET;
const region = import.meta.env.VITE_APP_COGNITO_REGION;

console.log("Client ID:", import.meta.env.VITE_APP_COGNITO_CLIENT_ID);
console.log("Client Secret:", import.meta.env.VITE_APP_COGNITO_CLIENT_SECRET);
console.log("Region:", import.meta.env.VITE_APP_COGNITO_REGION);

console.log("Client ID:", clientId); // Debug: Kiểm tra giá trị
console.log("Client Secret:", clientSecret); // Debug: Kiểm tra giá trị
console.log("Region:", region); // Debug: Kiểm tra giá trị

const cognitoClient = new CognitoIdentityProviderClient({ region });

function generateSecretHash(username) {
    const message = username + clientId;
    const key = clientSecret;
    const hash = CryptoJS.HmacSHA256(message, key);
    return CryptoJS.enc.Base64.stringify(hash);
}

export class AuthService {
    async login(username, password) {
        const secretHash = generateSecretHash(username);

        const command = new InitiateAuthCommand({
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId: clientId,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password,
                SECRET_HASH: secretHash
            }
        });

        const response = await cognitoClient.send(command);
        return response.AuthenticationResult; // AccessToken, IdToken, RefreshToken
    }

    saveTokensToLocalStorage(tokens) {
        localStorage.setItem('access_token', tokens.AccessToken);
        localStorage.setItem('id_token', tokens.IdToken);
        localStorage.setItem('refresh_token', tokens.RefreshToken);
        console.log("Tokens saved to localStorage successfully!");
    }

    isAuthenticated() {
        return !!localStorage.getItem('access_token');
    }

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('id_token');
        localStorage.removeItem('refresh_token');
        console.log("Logged out successfully!");
    }
}

export function handleLogout(context) {
    const authService = new AuthService();
    authService.logout();
    context.showNotification('Logged out successfully!', 'success');
    context.$router.push('/login');
}
