package com.example.manage.storage;

import java.nio.file.*;
import java.io.IOException;

public class LocalImageStorage implements ImageStorage {
    private final Path root;
    public LocalImageStorage(Path directory) {
        // Resolve trusted configured root aliases (e.g. macOS /var -> /private/var).
        // Symlinks introduced below this root remain forbidden by path().
        try { root = directory.toFile().getCanonicalFile().toPath(); }
        catch (IOException e) { throw new ImageStorageException("로컬 이미지 디렉터리를 확인할 수 없습니다.", e); }
    }

    private Path path(String key) {
        ImageFilePolicy.validateKey(key);
        Path path = root.resolve(key).normalize();
        if (!path.startsWith(root)) throw new ImageStorageException("올바르지 않은 이미지 저장 경로입니다.");
        for (Path p = path; p != null; p = p.getParent()) {
            if (Files.isSymbolicLink(p)) throw new ImageStorageException("심볼릭 링크에는 이미지를 저장할 수 없습니다.");
        }
        return path;
    }

    @Override public void upload(String key, byte[] content, String contentType) {
        Path target = path(key);
        Path temporary = null;
        try {
            Files.createDirectories(target.getParent());
            temporary = Files.createTempFile(target.getParent(), ".upload-", ".tmp");
            Files.write(temporary, content);
            Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) { throw new ImageStorageException("로컬 이미지 저장에 실패했습니다.", e); }
        finally {
            if (temporary != null) try { Files.deleteIfExists(temporary); } catch (IOException ignored) { /* retry cleanup on disk */ }
        }
    }
    @Override public void delete(String key) {
        try { Files.deleteIfExists(path(key)); }
        catch (IOException e) { throw new ImageStorageException("로컬 이미지 삭제에 실패했습니다.", e); }
    }
    @Override public byte[] read(String key) {
        try { return Files.readAllBytes(path(key)); }
        catch (IOException e) { throw new ImageStorageException("로컬 이미지를 읽을 수 없습니다.", e); }
    }
    @Override public String createReadUrl(String key, String localReadPath) {
        ImageFilePolicy.validateKey(key);
        // The service supplies an authenticated parent/imageId route, never a raw key API.
        return localReadPath;
    }
}
