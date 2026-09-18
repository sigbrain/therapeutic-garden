package com.example.manage.config;

import com.example.manage.storage.*;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import java.net.URI;
import java.time.Duration;

@Configuration
@EnableConfigurationProperties(ImageStorageProperties.class)
public class ImageStorageConfig {
    @Bean
    public ImageStorage imageStorage(ImageStorageProperties p) {
        if ("local".equals(p.mode())) return new LocalImageStorage(p.localDirectory());
        if (!"s3".equals(p.mode()) || p.bucket().isBlank() || p.accessKeyId().isBlank()
                || p.secretAccessKey().isBlank() || p.endpoint().isBlank()) return new DisabledImageStorage();
        URI endpoint = URI.create(p.endpoint());
        if (!"https".equals(endpoint.getScheme()) || endpoint.getHost() == null
                || endpoint.getUserInfo() != null || endpoint.getQuery() != null)
            throw new IllegalArgumentException("storage.endpoint는 Credentials 탭의 HTTPS 기본 endpoint여야 합니다.");
        if (p.readUrlDuration().isNegative() || p.readUrlDuration().isZero()
                || p.readUrlDuration().compareTo(Duration.ofHours(1)) > 0)
            throw new IllegalArgumentException("이미지 URL 유효시간은 0초 초과, 1시간 이하여야 합니다.");
        var credentials = StaticCredentialsProvider.create(AwsBasicCredentials.create(p.accessKeyId(), p.secretAccessKey()));
        var configuration = S3Configuration.builder().pathStyleAccessEnabled(false).build();
        var client = S3Client.builder().endpointOverride(endpoint).region(Region.of(p.region()))
                .credentialsProvider(credentials).serviceConfiguration(configuration)
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
                .overrideConfiguration(b -> b.apiCallTimeout(Duration.ofSeconds(60))
                        .apiCallAttemptTimeout(Duration.ofSeconds(20))).build();
        var presigner = S3Presigner.builder().endpointOverride(endpoint).region(Region.of(p.region()))
                .credentialsProvider(credentials).serviceConfiguration(configuration).build();
        return new S3ImageStorage(client, presigner, p);
    }
}
