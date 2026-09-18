package com.example.manage;

import com.example.manage.config.ImageStorageProperties;
import com.example.manage.service.ImageStorageTransactions;
import com.example.manage.storage.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.transaction.support.*;
import java.nio.file.*;
import java.time.Duration;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ImageStorageCompensationTests {
    @TempDir Path recovery;
    ImageStorage storage;
    ImageStorageTransactions work;
    String key = "sites/1/00000000-0000-0000-0000-000000000001.jpg";

    @BeforeEach void setup() {
        storage = mock(ImageStorage.class);
        work = new ImageStorageTransactions(storage, new ImageStorageProperties("disabled", "", "", "", "auto", "",
                Duration.ofHours(1), recovery, recovery));
        TransactionSynchronizationManager.initSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(true);
    }
    @AfterEach void cleanup() { TransactionSynchronizationManager.clear(); }
    private void complete(int status) {
        TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCompletion(status));
    }
    @Test void failedRollbackRestorationRetainsBytesAndKeyMetadata() throws Exception {
        when(storage.read(key)).thenReturn(new byte[]{1, 2, 3});
        work.delete(key, "image/jpeg");
        doThrow(new ImageStorageException("test unavailable")).when(storage).upload(eq(key), any(byte[].class), eq("image/jpeg"));
        complete(TransactionSynchronization.STATUS_ROLLED_BACK);
        try (var files = Files.list(recovery)) {
            var paths = files.toList();
            assertThat(paths).hasSize(2);
            Path backup = paths.stream().filter(p -> p.toString().endsWith(".backup")).findFirst().orElseThrow();
            Path metadata = paths.stream().filter(p -> p.toString().endsWith(".metadata")).findFirst().orElseThrow();
            assertThat(Files.readAllBytes(backup)).containsExactly(1, 2, 3);
            assertThat(Files.readString(metadata)).isEqualTo(key + "\nimage/jpeg\n");
        }
    }
    @Test void committedDeletionRemovesBackupAndDoesNotRestore() throws Exception {
        when(storage.read(key)).thenReturn(new byte[]{1});
        work.delete(key, "image/jpeg"); complete(TransactionSynchronization.STATUS_COMMITTED);
        try (var files = Files.list(recovery)) { assertThat(files).isEmpty(); }
        verify(storage, never()).upload(anyString(), any(byte[].class), anyString());
    }
    @Test void unknownCommitOutcomePreservesDeletionBackup() throws Exception {
        when(storage.read(key)).thenReturn(new byte[]{1});
        work.delete(key, "image/jpeg"); complete(TransactionSynchronization.STATUS_UNKNOWN);
        try (var files = Files.list(recovery)) { assertThat(files).hasSize(2); }
        verify(storage, never()).upload(anyString(), any(byte[].class), anyString());
    }
    @Test void backupReadFailureDoesNotDeleteObject() throws Exception {
        when(storage.read(key)).thenThrow(new ImageStorageException("test read failure"));
        assertThatThrownBy(() -> work.delete(key, "image/jpeg")).isInstanceOf(ImageStorageException.class);
        verify(storage, never()).delete(anyString());
        try (var files = Files.list(recovery)) { assertThat(files).isEmpty(); }
    }
    @Test void uploadsCannotRunWithoutAnActiveTransaction() {
        TransactionSynchronizationManager.setActualTransactionActive(false);
        assertThatThrownBy(() -> work.upload(key, new byte[]{1}, "image/jpeg")).isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(storage);
    }
}
