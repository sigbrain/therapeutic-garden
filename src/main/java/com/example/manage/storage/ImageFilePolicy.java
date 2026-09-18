package com.example.manage.storage;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;
import java.util.UUID;

@Component
public class ImageFilePolicy {
    public static final long MAX_FILE_SIZE = 10 * 1024 * 1024;
    public static final int MAX_FILES = 10;
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg", "image/png", "png", "image/webp", "webp");

    public void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("빈 파일은 등록할 수 없습니다.");
        if (file.getSize() > MAX_FILE_SIZE) throw new IllegalArgumentException("이미지는 파일당 10MB 이하여야 합니다.");
        if (file.getContentType() == null || !EXTENSIONS.containsKey(file.getContentType()))
            throw new IllegalArgumentException("JPEG, PNG, WebP 이미지만 등록할 수 있습니다.");
    }

    public String createKey(boolean site, Long parentId, String contentType) {
        if (parentId == null || parentId <= 0 || !EXTENSIONS.containsKey(contentType))
            throw new IllegalArgumentException("올바르지 않은 이미지 정보입니다.");
        return (site ? "sites/" : "healing-spots/") + parentId + "/" + UUID.randomUUID()
                + "." + EXTENSIONS.get(contentType);
    }

    public String displayName(String original) {
        if (original == null) return "이미지";
        String clean = original.replace('\\', '/');
        clean = clean.substring(clean.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "");
        return clean.substring(0, Math.min(clean.length(), 255));
    }

    public static void validateKey(String key) {
        if (key == null || !key.matches("(?:sites|healing-spots)/[1-9][0-9]*/[a-f0-9-]{36}\\.(?:jpg|png|webp)"))
            throw new ImageStorageException("올바르지 않은 이미지 저장 경로입니다.");
    }
}
