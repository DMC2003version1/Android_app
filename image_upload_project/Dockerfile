# Sử dụng Python 3.10
FROM python:3.10-slim

# Cài đặt các công cụ cần thiết
RUN apt-get update && apt-get install -y \
    libpq-dev gcc 

RUN apt-get install -y libgl1 && apt-get install -y libglib2.0-0

# Tạo thư mục ứng dụng
WORKDIR /app

# Copy và cài đặt dependencies từ requirements.txt
RUN pip install --no-cache-dir ultralytics
RUN pip install --no-cache-dir paddlepaddle==2.6.0
RUN pip install --no-cache-dir paddleocr==2.6.0

COPY requirements.txt . 
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn vào thư mục /app trong container
COPY . .

# Thiết lập thư mục làm việc là thư mục chứa manage.py
WORKDIR /app/image_upload_project

# Chạy Django server
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
