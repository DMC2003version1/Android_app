from jwt import PyJWKClient
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
import jwt

class CognitoUser:
    """
    A simple user object to represent authenticated users.
    """
    def __init__(self, decoded_token):
        self.decoded_token = decoded_token

    @property
    def is_authenticated(self):
        return True

    @property
    def username(self):
        return self.decoded_token.get("username", "Unknown")

    @property
    def email(self):
        return self.decoded_token.get("email", "Unknown")

class CognitoAccessTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise AuthenticationFailed("No Authorization header provided or invalid format")

        token = auth_header.split(' ')[1]
        try:
            jwks_url = settings.JWKS_URL
            jwk_client = PyJWKClient(jwks_url)
            signing_key = jwk_client.get_signing_key_from_jwt(token)

            decoded_token = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                options={"verify_aud": False}  # Disable audience verification
            )

            # Ensure the token is an access token
            if decoded_token.get('token_use') != 'access':
                raise AuthenticationFailed("Invalid token use, expected access token")

            # Return a CognitoUser object as the user
            return (CognitoUser(decoded_token), None)

        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token has expired")
        except jwt.InvalidTokenError as e:
            raise AuthenticationFailed(f"Invalid token: {str(e)}")
