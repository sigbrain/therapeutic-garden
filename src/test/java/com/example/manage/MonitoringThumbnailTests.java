package com.example.manage;

import com.example.manage.service.MonitoringThumbnailService;
import com.example.manage.storage.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class MonitoringThumbnailTests {
    @TempDir Path root;
    private final String key = new ImageFilePolicy().createKey(false, 1L, "image/png");

    static byte[] photo(int width, int height) throws IOException {
        var image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        var graphics = image.createGraphics();
        graphics.setColor(java.awt.Color.BLUE);
        graphics.fillRect(0, 0, width / 2, height);
        graphics.dispose();
        var output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }

    @Test void missingVariantIsGeneratedAndReusedWithoutReadingOrChangingOriginal() throws Exception {
        var storage = spy(new LocalImageStorage(root));
        byte[] original = photo(2400, 1200);
        storage.upload(key, original, "image/png");
        var service = new MonitoringThumbnailService(storage);
        assertThat(service.readUrl(key, "/thumbnail", () -> "/original")).isEqualTo("/thumbnail");
        String variant = MonitoringThumbnailService.key(key);
        byte[] bytes = storage.read(variant);
        var image = ImageIO.read(new ByteArrayInputStream(bytes));
        assertThat(image.getWidth()).isEqualTo(560);
        assertThat(image.getHeight()).isEqualTo(280);
        assertThat(image.getRGB(500, 100) & 0xffffff).isEqualTo(0xffffff);
        assertThat(Files.readAllBytes(root.resolve(key))).isEqualTo(original);
        assertThat(service.readUrl(key, "/thumbnail", () -> "/original")).isEqualTo("/thumbnail");
        verify(storage, times(1)).read(key);
        verify(storage, times(1)).upload(eq(variant), any(), eq("image/jpeg"));
        storage.delete(variant);
        service.readUrl(key, "/thumbnail", () -> "/original");
        verify(storage, times(2)).read(key);
    }

    @Test void smallImagesAreNotUpscaledAndPortraitRatioIsPreserved() throws Exception {
        for (int[] size : new int[][]{{100, 200, 100, 200}, {1200, 2400, 280, 560}}) {
            var image = ImageIO.read(new ByteArrayInputStream(MonitoringThumbnailService.render(photo(size[0], size[1]))));
            assertThat(image.getWidth()).isEqualTo(size[2]);
            assertThat(image.getHeight()).isEqualTo(size[3]);
        }
    }

    @Test void decodeReadUploadExistenceAndSigningFailuresUseOriginal() throws Exception {
        for (String failure : new String[]{"decode", "read", "upload", "exists", "sign"}) {
            ImageStorage storage = mock(ImageStorage.class);
            String variant = MonitoringThumbnailService.key(key);
            when(storage.read(key)).thenReturn(failure.equals("decode") ? new byte[]{1} : photo(900, 600));
            if (failure.equals("read")) when(storage.read(key)).thenThrow(new ImageStorageException("read"));
            if (failure.equals("exists")) when(storage.exists(variant)).thenThrow(new ImageStorageException("head"));
            if (failure.equals("upload")) doThrow(new ImageStorageException("put")).when(storage).upload(eq(variant), any(), anyString());
            if (failure.equals("sign")) when(storage.createReadUrl(variant, "/thumbnail")).thenThrow(new ImageStorageException("sign"));
            assertThat(new MonitoringThumbnailService(storage).readUrl(key, "/thumbnail", () -> "/original"))
                    .as(failure).isEqualTo("/original");
            verify(storage, never()).upload(eq(key), any(), anyString());
        }
    }

    @Test void localContentFallsBackWithOriginalMimeType() {
        var storage = new LocalImageStorage(root);
        storage.upload(key, new byte[]{1, 2, 3}, "image/webp");
        var content = new MonitoringThumbnailService(storage).content(key, "image/webp");
        assertThat(content.bytes()).containsExactly(1, 2, 3);
        assertThat(content.contentType()).isEqualTo("image/webp");
    }

    @Test void exifRotationIsAppliedToThumbnailPixels() throws Exception {
        var png = ImageIO.read(new ByteArrayInputStream(photo(100, 200)));
        var rgb = new BufferedImage(100, 200, BufferedImage.TYPE_INT_RGB);
        var g = rgb.createGraphics(); g.drawImage(png, 0, 0, null); g.dispose();
        var jpeg = new ByteArrayOutputStream(); ImageIO.write(rgb, "jpeg", jpeg);
        byte[] original = jpeg.toByteArray();
        // APP1, little-endian TIFF with a single orientation=6 entry.
        byte[] exif = { (byte)255, (byte)225, 0, 34, 69,120,105,102,0,0,
                73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0 };
        var oriented = new ByteArrayOutputStream();
        oriented.write(original, 0, 2); oriented.write(exif); oriented.write(original, 2, original.length - 2);
        var result = ImageIO.read(new ByteArrayInputStream(MonitoringThumbnailService.render(oriented.toByteArray())));
        assertThat(result.getWidth()).isEqualTo(200);
        assertThat(result.getHeight()).isEqualTo(100);
        assertThat(result.getRGB(100, 20) & 255).isGreaterThan(200);
        assertThat(result.getRGB(100, 80) & 255).isLessThan(30);
    }
}
