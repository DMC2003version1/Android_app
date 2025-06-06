package com.example.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.util.Size;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.example.app.ImageUtils;

import com.google.common.util.concurrent.ListenableFuture;

import org.tensorflow.lite.task.vision.detector.Detection;
import org.tensorflow.lite.task.vision.detector.ObjectDetector;
import org.tensorflow.lite.task.vision.detector.ObjectDetector.ObjectDetectorOptions;

import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class YoloCameraActivity extends AppCompatActivity {
    private final int REQUEST_CAMERA_PERMISSION = 1001;
    private Preview preview;
    private ImageCapture imageCapture;
    private ObjectDetector objectDetector;
    private OverlayView overlayView;
    private ExecutorService analysisExecutor;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        overlayView = new OverlayView(this);
        setContentView(overlayView, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        if (allPermissionsGranted()) {
            startCamera();
        } else {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, REQUEST_CAMERA_PERMISSION);
        }
    }

    private boolean allPermissionsGranted() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> cameraProviderFuture = ProcessCameraProvider.getInstance(this);
        cameraProviderFuture.addListener(() -> {
            try {
                ProcessCameraProvider cameraProvider = cameraProviderFuture.get();
                bindPreview(cameraProvider);
            } catch (ExecutionException | InterruptedException e) {
                e.printStackTrace();
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void bindPreview(@NonNull ProcessCameraProvider cameraProvider) {
        preview = new Preview.Builder().build();
        imageCapture = new ImageCapture.Builder().build();

        ImageAnalysis analysis = new ImageAnalysis.Builder()
                .setTargetResolution(new Size(640, 640))
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build();

        analysisExecutor = Executors.newSingleThreadExecutor();
        analysis.setAnalyzer(analysisExecutor, this::analyzeImage);

        CameraSelector cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA;

        preview.setSurfaceProvider(null);
        cameraProvider.unbindAll();
        cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture, analysis);

        setupObjectDetector();
    }

    private void setupObjectDetector() {
        ObjectDetectorOptions options = ObjectDetectorOptions.builder()
                .setScoreThreshold(0.5f)
                .setMaxResults(20)
                .build();
        try {
            objectDetector = ObjectDetector.createFromFileAndOptions(this, "yolov8.tflite", options);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void analyzeImage(@NonNull ImageProxy image) {
        if (objectDetector == null) {
            image.close();
            return;
        }
        Bitmap bitmap = ImageUtils.imageProxyToBitmap(this, image);
        List<Detection> results = objectDetector.detect(bitmap);
        overlayView.post(() -> overlayView.setResults(results, image.getImageInfo().getRotationDegrees()));
        int highScoreCount = 0;
        for (Detection d : results) {
            if (!d.getCategories().isEmpty() && d.getCategories().get(0).getScore() >= 0.7f) {
                highScoreCount++;
            }
        }
        if (highScoreCount >= 10) {
            capturePhoto();
        }
        image.close();
    }

    private void capturePhoto() {
        if (imageCapture == null) return;
        imageCapture.takePicture(ContextCompat.getMainExecutor(this), new ImageCapture.OnImageCapturedCallback() {
            @Override
            public void onCaptureSuccess(@NonNull ImageProxy image) {
                // TODO: handle captured image
                image.close();
            }

            @Override
            public void onError(@NonNull ImageCaptureException exception) {
                exception.printStackTrace();
            }
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (analysisExecutor != null) {
            analysisExecutor.shutdown();
        }
    }
}
