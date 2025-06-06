"""
AI Engine package: khởi tạo và cung cấp AIEngine cho toàn hệ thống.
"""

from .engine import AIEngine
from .config import MODEL_PATH

# Khởi tạo 1 instance dùng chung toàn app
ai_engine = AIEngine(model_path=MODEL_PATH)
