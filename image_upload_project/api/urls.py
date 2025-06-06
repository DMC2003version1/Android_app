from django.urls import path
from .views import ImageUploadView
from . import views
# from .views import authenticate_user

urlpatterns = [
    path('upload/', ImageUploadView.as_view(), name='image-upload'), 
]
