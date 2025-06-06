package com.example.app;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.View;

import org.tensorflow.lite.task.vision.detector.Detection;

import java.util.ArrayList;
import java.util.List;

public class OverlayView extends View {
    private final Paint boxPaint = new Paint();
    private List<Detection> detections = new ArrayList<>();
    private int rotationDegrees = 0;

    public OverlayView(Context context) {
        super(context);
        init();
    }

    public OverlayView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    private void init() {
        boxPaint.setStyle(Paint.Style.STROKE);
        boxPaint.setStrokeWidth(4f);
        boxPaint.setColor(0xFFFF0000); // red
    }

    public void setResults(List<Detection> results, int rotationDegrees) {
        this.detections = results;
        this.rotationDegrees = rotationDegrees;
        invalidate();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        for (Detection detection : detections) {
            RectF box = detection.getBoundingBox();
            canvas.drawRect(box, boxPaint);
        }
    }
}
