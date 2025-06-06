export function handleFileSelect(event, context) {
    const file = event.target.files[0];
    if (file) {
        context.selectedFile = file;
        context.preview = URL.createObjectURL(file);

        // Wait for the canvas to render before drawing
        context.$nextTick(() => {
            drawImageOnCanvas(context.preview, context);
        });
    }
}

export function clearImage(context) {
    context.selectedFile = null;
    context.preview = null;
    context.boundingBoxes = [];
    context.extractedText = [];
    context.tableData = [];
    const canvas = context.$refs.canvas;
    if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas content
    }
}

export function drawImageOnCanvas(imageSrc, context) {
    const canvas = context.$refs.canvas;
    if (!canvas) {
        console.error("Canvas element not found");
        return;
    }

    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
        let imgWidth = img.width;
        let imgHeight = img.height;

        // Scale image if dimensions exceed 1000
        const maxDimension = 1000;
        if (imgWidth > maxDimension || imgHeight > maxDimension) {
            const scale = Math.min(maxDimension / imgWidth, maxDimension / imgHeight);
            imgWidth = Math.floor(imgWidth * scale);
            imgHeight = Math.floor(imgHeight * scale);
        }

        // Set canvas dimensions
        canvas.width = imgWidth;
        canvas.height = imgHeight;

        // Adjust canvas CSS size
        canvas.style.width = `${imgWidth}px`;
        canvas.style.height = `${imgHeight}px`;

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

        // Draw bounding boxes
        context.boundingBoxes.forEach(boxObj => {
            const [x1, y1, x2, y2] = boxObj.box;
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.strokeRect(
                x1 * (imgWidth / img.width),
                y1 * (imgHeight / img.height),
                (x2 - x1) * (imgWidth / img.width),
                (y2 - y1) * (imgHeight / img.height)
            );
        });
    };
    img.src = imageSrc;
}

export function base64ToFile(base64String, filename) {
  const arr = base64String.split(',');
  const mime = arr[0]?.match(/:(.*?);/)
    ? arr[0].match(/:(.*?);/)[1]
    : 'image/jpeg';
  const bstr = atob(arr.length > 1 ? arr[1] : arr[0]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}
