package com.example.manage.healingeffect;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.io.*;
import java.nio.file.Path;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class HealingEffectImportCliTests {
    @TempDir Path directory;

    @Test void requiresExplicitFileSiteAndExactlyOneMode() {
        for (String[] args : List.of(new String[]{},
                new String[]{"--file", "x.xlsx", "--site-id", "1"},
                new String[]{"--file", "x.xlsx", "--site-id", "1", "--dry-run", "--write"},
                new String[]{"--file", "x.xlsx", "--site-id", "0", "--dry-run"},
                new String[]{"--file", "x.xlsx", "--site-id", "1", "--dry-run", "--dry-run"})) {
            var output = new ByteArrayOutputStream();
            int exit = HealingEffectImportCli.run(args, Map.of(), new PrintStream(output), new PrintStream(output));
            assertThat(exit).isEqualTo(1);
            assertThat(output.toString()).doesNotContain("SHA-256", "DATABASE_FAILED");
        }
    }

    @Test void rejectsRemoteDatabaseBeforeConnectingAndDoesNotPrintCredentials() throws Exception {
        var file = SyntheticEffectWorkbook.create(directory, b -> {});
        for (String url : List.of("jdbc:mysql://remote.example/manage", "jdbc:mysql://localhost/manage?allowMultiQueries=true")) {
            var output = new ByteArrayOutputStream();
            int exit = HealingEffectImportCli.run(new String[]{"--file", file.toString(), "--site-id", "1", "--dry-run"},
                    Map.of("HEALING_IMPORT_JDBC_URL", url, "HEALING_IMPORT_DB_USER", "synthetic-user",
                            "HEALING_IMPORT_DB_PASSWORD", "synthetic-password"), new PrintStream(output), new PrintStream(output));
            assertThat(exit).isEqualTo(1);
            assertThat(output.toString()).contains("로컬 MySQL URL만 허용").doesNotContain("DATABASE_FAILED", "synthetic-password", url);
        }
    }
}
