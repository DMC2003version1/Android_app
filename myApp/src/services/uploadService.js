import axios from 'axios';

// Cấu hình base URL dựa trên platform
const getBaseURL = () => {
    // Kiểm tra nếu đang chạy trên Capacitor (mobile)
    if (window.Capacitor) {
        // Sử dụng IP thật của máy thay vì 10.0.2.2,  192.168.0.20
        return 'http://192.168.0.10:8000'
    }
    // Web development
    return 'http://localhost:8000';
};

export function uploadImage(context) {
    if (!context.selectedFile) {
        context.showNotification('Please select an image', 'error');
        return;
    }

    context.isUploading = true;
    const formData = new FormData();
    formData.append('title', 'chào');
    formData.append('image', context.selectedFile);

    const endpoint = `${getBaseURL()}/api/upload/`;

    console.log('Sending POST request to:', endpoint);
    console.log('FormData content:', formData.get('title'), formData.get('image'));
    console.log('Selected file:', context.selectedFile);

    // Log tất cả form data
    for (const [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
    }

    // Cấu hình axios với timeout và headers đầy đủ
    const config = {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 30 seconds timeout
    };

    // Thêm Authorization header nếu có token
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    axios.post(endpoint, formData, config)
        .then(response => {
            console.log('Response from backend:', response.data);
            context.showNotification(response.data.message, 'success');
            
            context.boundingBoxes = response.data.result.map(item => ({
                box: item.box,
                class: item.class
            }));
            
            context.extractedText = response.data.result.map(item => ({
                class: item.class,
                text: item.text || ''
            }));

            // Process table data
            // Chỉ show text cho các class đặc biệt và các class khác, không show score hay thông tin khác
            const specialClasses = ['PRODUCT_NAME', 'AMOUNT', 'UPRICE', 'SUB_TPRICE'];
            context.tableData = [];
            specialClasses.forEach(column => {
                const columnData = context.extractedText
                    .filter(item => item.class === column)
                    .map(item => item.text);
                columnData.forEach((text, index) => {
                    if (!context.tableData[index]) context.tableData[index] = {};
                    context.tableData[index][column] = text;
                });
            });

            // Các class khác ngoài 4 class đặc biệt
            context.otherText = context.extractedText.filter(item => !specialClasses.includes(item.class));

            console.log('Bounding Boxes:', context.boundingBoxes);
            console.log('Extracted Text:', context.extractedText);
            console.log('Table Data:', context.tableData);

            context.$nextTick(() => {
                // Chỉ vẽ box bounding, KHÔNG vẽ text, KHÔNG vẽ tên class lên ảnh
                context.drawImageOnCanvas(URL.createObjectURL(context.selectedFile), { drawText: false, drawClass: false });
            });
        })
        .catch(error => {
            console.error('Upload error:', error);
            
            if (error.response) {
                // Server responded with error status
                const errMsg = `Server Error: ${error.response.status}\n` +
                    `Data: ${JSON.stringify(error.response.data)}\n` +
                    `Headers: ${JSON.stringify(error.response.headers)}`;
                console.error(errMsg);
                context.showNotification(errMsg, 'error');
            } else if (error.request) {
                // Request was made but no response received
                console.error('Network Error:', JSON.stringify({
                    status: error.request?.status,
                    readyState: error.request?.readyState,
                    responseText: error.request?.responseText,
                    url: error.request?.responseURL || endpoint
                }, null, 2));
                context.showNotification(
                    'Network error. Please check your connection.', 
                    'error'
                );
            } else {
                // Error in request setup
                console.error('Request Setup Error:', error.message);
                context.showNotification(
                    'Request failed to setup.', 
                    'error'
                );
            }
        })
        .finally(() => {
            context.isUploading = false;
        });
}

// Alternative using native fetch for better mobile compatibility
export function uploadImageWithFetch(context) {
    if (!context.selectedFile) {
        context.showNotification('Please select an image', 'error');
        return;
    }

    context.isUploading = true;
    const formData = new FormData();
    formData.append('title', 'chào');
    formData.append('image', context.selectedFile);

    const endpoint = `${getBaseURL()}/api/upload/`;
    
    const headers = {};
    const token = localStorage.getItem('access_token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: headers,
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Response from backend:', data);
        context.showNotification(data.message, 'success');
        // ... rest of success handling
    })
    .catch(error => {
        console.error('Fetch error:', error);
        context.showNotification('Upload failed', 'error');
    })
    .finally(() => {
        context.isUploading = false;
    });
}
