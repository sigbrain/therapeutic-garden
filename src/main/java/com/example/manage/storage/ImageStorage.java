package com.example.manage.storage;

public interface ImageStorage {
    void upload(String objectKey, byte[] content, String contentType);
    void delete(String objectKey);
    // localReadPath is generated from DB IDs by the service; S3 returns a presigned URL instead.
    String createReadUrl(String objectKey, String localReadPath);
    // Used for authenticated local reads and deletion rollback backups.
    byte[] read(String objectKey);
}
