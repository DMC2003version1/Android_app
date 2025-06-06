package com.example.app;

import android.graphics.Bitmap;
import android.content.Context;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.YuvToRgbConverter;

public class ImageUtils {
    private static YuvToRgbConverter converter;

    public static Bitmap imageProxyToBitmap(Context context, ImageProxy image) {
        if (converter == null) {
            converter = new YuvToRgbConverter(context);
        }
        Bitmap bitmap = Bitmap.createBitmap(image.getWidth(), image.getHeight(), Bitmap.Config.ARGB_8888);
        converter.yuvToRgb(image, bitmap);
        return bitmap;
    }
}
