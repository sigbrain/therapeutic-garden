package com.example.manage.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import java.nio.file.Path;
import java.time.Duration;

@ConfigurationProperties("storage")
public record ImageStorageProperties(
        @DefaultValue("disabled") String mode,
        @DefaultValue("") String bucket,
        @DefaultValue("") String accessKeyId,
        @DefaultValue("") String secretAccessKey,
        @DefaultValue("auto") String region,
        @DefaultValue("") String endpoint,
        @DefaultValue("1h") Duration readUrlDuration,
        @DefaultValue(".local/uploads") Path localDirectory,
        @DefaultValue(".local/image-recovery") Path recoveryDirectory) {
    // Do not expose credentials through a generated record toString.
    @Override public String toString() { return "ImageStorageProperties[mode=" + mode + "]"; }
}
