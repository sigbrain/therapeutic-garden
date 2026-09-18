package com.example.manage.storage;

import com.example.manage.config.ImageStorageProperties;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

public class S3ImageStorage implements ImageStorage, AutoCloseable {
    private final S3Client client;
    private final S3Presigner presigner;
    private final ImageStorageProperties properties;
    public S3ImageStorage(S3Client client, S3Presigner presigner, ImageStorageProperties properties) {
        this.client = client; this.presigner = presigner; this.properties = properties;
    }
    @Override public void upload(String key, byte[] content, String contentType) {
        ImageFilePolicy.validateKey(key);
        try {
            client.putObject(b -> b.bucket(properties.bucket()).key(key).contentType(contentType), RequestBody.fromBytes(content));
        } catch (RuntimeException e) { throw new ImageStorageException("이미지 저장소 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.", e); }
    }
    @Override public void delete(String key) {
        ImageFilePolicy.validateKey(key);
        try { client.deleteObject(b -> b.bucket(properties.bucket()).key(key)); }
        catch (RuntimeException e) { throw new ImageStorageException("이미지 저장소 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.", e); }
    }
    @Override public byte[] read(String key) {
        ImageFilePolicy.validateKey(key);
        try { return client.getObjectAsBytes(b -> b.bucket(properties.bucket()).key(key)).asByteArray(); }
        catch (RuntimeException e) { throw new ImageStorageException("이미지 저장소에서 파일을 읽을 수 없습니다.", e); }
    }
    @Override public String createReadUrl(String key, String localReadPath) {
        ImageFilePolicy.validateKey(key);
        try {
            return presigner.presignGetObject(b -> b.signatureDuration(properties.readUrlDuration())
                    .getObjectRequest(r -> r.bucket(properties.bucket()).key(key))).url().toString();
        } catch (RuntimeException e) { throw new ImageStorageException("이미지 조회 URL을 만들 수 없습니다.", e); }
    }
    @Override public void close() { client.close(); presigner.close(); }
}
