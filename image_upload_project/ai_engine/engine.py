# engine.py
from ultralytics import YOLO
from PIL import Image
import numpy as np
from paddleocr import PaddleOCR

class AIEngine:
    def __init__(self, model_path):
        """
        Khởi tạo và load model YOLOv8 từ đường dẫn.
        """
        self.model = YOLO(model_path)
        self.ocr = PaddleOCR(use_angle_cls=True, lang='en')  # Điều chỉnh lang nếu cần

    def detect(self, image):
        if isinstance(image, str):
            image = Image.open(image)
        if isinstance(image, Image.Image):
            image = np.array(image)

        results = self.model(image)
        detections = []

        for result in results:
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = [int(coord) for coord in box.xyxy[0].tolist()]
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])

                # Cắt ảnh theo bounding box
                cropped_img = image[y1:y2, x1:x2]
                if cropped_img is not None and isinstance(cropped_img, np.ndarray) and cropped_img.size > 0:
                    try:
                        ocr_result = self.ocr.ocr(cropped_img)
                    except Exception as e:
                        print("⚠️ OCR failed:", e)
                        ocr_result = [[[0, 0], [0, 0], [0, 0], [0, 0]], ('None', 0)]
                # OCR

                text = ""

                if ocr_result and isinstance(ocr_result, list) and len(ocr_result) > 0:
                    for line in ocr_result[0]:
                        try:
                            # line có dạng: [box, (text, confidence)]
                            if isinstance(line, list) and len(line) >= 2:
                                text_info = line[1]
                                # Chỉ lấy text, bỏ confidence
                                if isinstance(text_info, (tuple, list)) and len(text_info) >= 1:
                                    txt = str(text_info[0])
                                else:
                                    txt = str(text_info)
                            else:
                                txt = str(line)
                            text += " " + txt
                        except Exception as e:
                            print("⚠️ Error extracting text:", e)
                            text += " None"
                # Chỉ lấy text, loại bỏ số/confidence nếu có
                text = text.strip()
                # Nếu text có dạng "266.0 ('Website', 0.99)" thì chỉ lấy phần trong tuple
                import re
                match = re.search(r"\('([^']+)'(?:, [0-9.]+)?\)", text)
                if match:
                    text = match.group(1)

                detections.append({
                    'class': self.model.names[cls_id],
                    'confidence': round(conf, 3),
                    'box': [x1, y1, x2, y2],
                    'text': text
                })
        return detections
