import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import get_authorization_header
from rest_framework.exceptions import AuthenticationFailed
from ai_engine import ai_engine
from .models import UploadedImage
from django.utils.decorators import method_decorator
from image_upload_project.authentication import CognitoAccessTokenAuthentication
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class ImageUploadView(APIView):
    authentication_classes = [CognitoAccessTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Authenticate the token
        self._validate_token(request)

        # Log received data
        logger.info("Data received from request: %s", request.data)

        # Validate and process the uploaded image
        image_file, title = self._validate_request_data(request)

        # Save the uploaded image to the database
        uploaded_image = self._save_uploaded_image(title, image_file)

        # Process the image using the AI engine
        result = ai_engine.detect(uploaded_image.image.path)

        # Return the response
        return Response({
            "message": "Upload successful!",
            "id": uploaded_image.id,
            "result": result
        }, status=status.HTTP_201_CREATED)

    def _validate_token(self, request):
        """Validate the Authorization token."""
        auth_header = get_authorization_header(request).decode('utf-8')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise AuthenticationFailed("Invalid or missing token")

    def _validate_request_data(self, request):
        """Validate and extract image and title from the request."""
        image_file = request.FILES.get("image")
        title = request.data.get("title")

        if not image_file or not title:
            raise Response({"error": "Missing fields"}, status=status.HTTP_400_BAD_REQUEST)

        logger.info("Title: %s, File: %s", title, image_file)
        return image_file, title

    def _save_uploaded_image(self, title, image_file):
        """Save the uploaded image to the database."""
        return UploadedImage.objects.create(title=title, image=image_file)
