package com.example.manage.storage;

import com.example.manage.config.ImageStorageProperties;
import com.example.manage.service.MonitoringThumbnailService;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import java.net.URI;
import java.nio.file.Path;
import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class S3ReadUrlCacheTests {
    final MutableClock clock = new MutableClock();
    final S3Client client = mock(S3Client.class);
    final S3Presigner signer = mock(S3Presigner.class);
    final List<String> signedKeys = new ArrayList<>();
    final String original = new ImageFilePolicy().createKey(false, 1L, "image/jpeg");
    final String thumbnail = MonitoringThumbnailService.key(original);
    Duration lifetime = Duration.ofHours(1);
    Duration signingDelay = Duration.ZERO;

    S3ImageStorage storage(Duration duration) throws Exception {
        when(signer.presignGetObject(org.mockito.ArgumentMatchers.<Consumer<GetObjectPresignRequest.Builder>>any()))
                .thenAnswer(inv -> {
                    var builder = GetObjectPresignRequest.builder();
                    inv.<Consumer<GetObjectPresignRequest.Builder>>getArgument(0).accept(builder);
                    var request = builder.build();
                    assertThat(request.signatureDuration()).isEqualTo(duration);
                    assertThat(request.getObjectRequest().bucket()).isEqualTo("test-bucket");
                    signedKeys.add(request.getObjectRequest().key());
                    var result = mock(PresignedGetObjectRequest.class);
                    when(result.expiration()).thenReturn(clock.instant().plus(lifetime));
                    when(result.url()).thenReturn(URI.create("https://example.invalid/image/" + signedKeys.size()).toURL());
                    clock.advance(signingDelay);
                    return result;
                });
        return new S3ImageStorage(client, signer, new ImageStorageProperties("s3", "test-bucket", "", "",
                "auto", "", duration, Path.of("unused"), Path.of("unused")), clock);
    }
    String read(S3ImageStorage storage, String key) { return storage.createReadUrl(key, "/unused"); }

    @Test void repeatedReadsReuseUntilExactFiftyMinuteBoundary() throws Exception {
        var storage = storage(Duration.ofHours(1));
        String first = read(storage, original);
        for (int i = 0; i < 99; i++) assertThat(first.equals(read(storage, original))).isTrue();
        clock.advance(Duration.ofMinutes(50).minusMillis(1));
        assertThat(first.equals(read(storage, original))).isTrue();
        assertThat(signedKeys).hasSize(1);
        clock.advance(Duration.ofMillis(1));
        assertThat(first.equals(read(storage, original))).isFalse();
        assertThat(signedKeys).hasSize(2);
        clock.advance(Duration.ofHours(2));
        read(storage, original);
        assertThat(signedKeys).hasSize(3);
    }
    @Test void originalThumbnailAndOtherKeysAreIndependentAndDeleteInvalidatesOnlyTarget() throws Exception {
        var storage = storage(Duration.ofHours(1));
        String other = new ImageFilePolicy().createKey(true, 2L, "image/png");
        for (String key : List.of(original, thumbnail, other)) { read(storage, key); read(storage, key); }
        assertThat(signedKeys).containsExactly(original, thumbnail, other);
        storage.delete(original);
        read(storage, thumbnail); read(storage, other); read(storage, original);
        assertThat(signedKeys).containsExactly(original, thumbnail, other, original);
        storage.delete(thumbnail);
        read(storage, thumbnail);
        assertThat(signedKeys).hasSize(5);
    }
    @Test void failedDeleteAlsoEvictsBecauseRemoteOutcomeMayBeUnknown() throws Exception {
        var storage = storage(Duration.ofHours(1));
        read(storage, original);
        doThrow(new IllegalStateException("test failure")).when(client)
                .deleteObject(org.mockito.ArgumentMatchers.<Consumer<DeleteObjectRequest.Builder>>any());
        assertThatThrownBy(() -> storage.delete(original)).isInstanceOf(ImageStorageException.class);
        read(storage, original);
        assertThat(signedKeys).hasSize(2);
    }
    @Test void shortConfigurationScalesMarginAndUploadMetadataAndInvalidates() throws Exception {
        var storage = storage(Duration.ofMinutes(6));
        read(storage, original);
        clock.advance(Duration.ofMinutes(5));
        read(storage, original);
        assertThat(signedKeys).hasSize(2);
        verifyUpload(storage, original, "private, max-age=30");
        read(storage, original);
        assertThat(signedKeys).hasSize(3);
    }
    @Test void uploadSetsPrivateFiveMinuteFreshnessForOriginalAndThumbnail() throws Exception {
        var storage = storage(Duration.ofHours(1));
        verifyUpload(storage, original, "private, max-age=300");
        verifyUpload(storage, thumbnail, "private, max-age=300");
    }
    void verifyUpload(S3ImageStorage storage, String key, String policy) {
        doAnswer(inv -> {
            var builder = PutObjectRequest.builder();
            inv.<Consumer<PutObjectRequest.Builder>>getArgument(0).accept(builder);
            var request = builder.build();
            assertThat(request.cacheControl()).isEqualTo(policy);
            assertThat(request.key()).isEqualTo(key);
            assertThat(request.bucket()).isEqualTo("test-bucket");
            assertThat(request.contentType()).isEqualTo("image/jpeg");
            return null;
        }).when(client).putObject(org.mockito.ArgumentMatchers.<Consumer<PutObjectRequest.Builder>>any(), any(RequestBody.class));
        storage.upload(key, new byte[]{1}, "image/jpeg");
    }
    @Test void actualSignatureExpiryCanShortenReuse() throws Exception {
        lifetime = Duration.ofMinutes(20);
        var storage = storage(Duration.ofHours(1));
        read(storage, original);
        clock.advance(Duration.ofMinutes(10));
        read(storage, original);
        assertThat(signedKeys).hasSize(2);
    }
    @Test void expiredOrSlowSignaturesAreNeverReturnedOrCached() throws Exception {
        var storage = storage(Duration.ofHours(1));
        lifetime = Duration.ZERO;
        assertThatThrownBy(() -> read(storage, original)).isInstanceOf(ImageStorageException.class);
        lifetime = Duration.ofHours(1);
        signingDelay = Duration.ofHours(1);
        assertThatThrownBy(() -> read(storage, original)).isInstanceOf(ImageStorageException.class);
        signingDelay = Duration.ZERO;
        read(storage, original);
        assertThat(signedKeys).hasSize(3);
    }
    static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        void advance(Duration duration) { now = now.plus(duration); }
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return now; }
    }
}
