import java.io.Console;
import java.nio.CharBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.AclEntry;
import java.nio.file.attribute.AclEntryFlag;
import java.nio.file.attribute.AclEntryPermission;
import java.nio.file.attribute.AclEntryType;
import java.nio.file.attribute.AclFileAttributeView;
import java.nio.file.attribute.PosixFileAttributeView;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

// Run via generate-accounts. No database connection is made here.
class GenerateAccounts {
    static final String[] TABLES = {"admin", "member", "site", "healing_course", "healing_spot", "site_image", "healing_spot_image", "site_image_spot_position", "schedule", "schedule_spot", "healing_spot_effect_summary", "member_healing_spot_effect_summary", "healing_effect_import_batch", "healing_measurement_import_batch", "healing_measurement_session", "healing_spot_measurement", "personal_eeg_analysis_batch", "personal_eeg_analysis_session", "personal_eeg_spot_result", "personal_eeg_active_version"};
    public static void main(String[] args) throws Exception {
        Console console = System.console();
        if (console == null) throw new IllegalStateException("Interactive terminal required");
        Path dir = Path.of(".local", "setup");
        Path out = dir.resolve("accounts.sql");
        Files.createDirectories(dir);
        protectDirectory(dir);
        if (Files.exists(out)) throw new IllegalStateException("Output already exists: " + out);
        var encoder = new BCryptPasswordEncoder();
        var hashes = new ArrayList<String>();
        for (int i = 0; i < 13; i++) {
            String id = i == 0 ? "admin" : i == 12 ? "test004" : "p%03d".formatted(i);
            char[] a = console.readPassword("%s password: ", id);
            char[] b = console.readPassword("%s password again: ", id);
            try {
                if (a == null || b == null || a.length == 0 || !Arrays.equals(a,b)) throw new IllegalArgumentException("Empty or mismatched password for " + id);
                if (StandardCharsets.UTF_8.encode(CharBuffer.wrap(a)).remaining() > 72) throw new IllegalArgumentException("BCrypt password exceeds 72 UTF-8 bytes: " + id);
                hashes.add(encoder.encode(CharBuffer.wrap(a)));
            } finally {
                if (a != null) Arrays.fill(a, '\0');
                if (b != null) Arrays.fill(b, '\0');
            }
        }
        StringBuilder sql = new StringBuilder("-- Secrets: local use only. Run only after schema.sql on a new empty DB.\nSTART TRANSACTION;\nSET @accounts_empty = ");
        for (int i=0; i<TABLES.length; i++) {
            if (i>0) sql.append(" AND ");
            sql.append("NOT EXISTS (SELECT 1 FROM ").append(TABLES[i]).append(")");
        }
        sql.append(";\nINSERT INTO admin (admin_id, login_id, password) SELECT 1, 'admin', '").append(hashes.get(0)).append("' WHERE @accounts_empty;\n");
        for (int i=1; i<=12; i++) {
            String id = i==12 ? "test004" : "p%03d".formatted(i);
            int no = i==12 ? 900004 : i;
            sql.append("INSERT INTO member (member_id, participant_no, group_no, login_id, password, name, phone, test_account, analysis_reference_member_id) SELECT ")
                .append(no).append(", ").append(no).append(", ").append(i==12?0:1).append(", '").append(id).append("', '").append(hashes.get(i)).append("', '")
                .append(i==12?"Synthetic test participant":"Synthetic participant %03d".formatted(i)).append("', NULL, ").append(i==12?"b'1', 4":"b'0', NULL").append(" WHERE @accounts_empty;\n");
        }
        sql.append("COMMIT;\nSELECT IF(@accounts_empty, 'Accounts inserted', 'No changes: database was not empty') AS result;\n");
        createPrivateFile(out);
        Files.writeString(out, sql, StandardCharsets.UTF_8, StandardOpenOption.WRITE);
        System.out.println("Created " + out + " (sensitive BCrypt hashes; do not share or commit). ");
    }

    private static void protectDirectory(Path dir) throws Exception {
        if (Files.getFileAttributeView(dir, PosixFileAttributeView.class) != null) {
            Files.setPosixFilePermissions(dir, PosixFilePermissions.fromString("rwx------"));
        } else {
            setOwnerOnlyAcl(dir, true);
        }
    }

    private static void createPrivateFile(Path file) throws Exception {
        if (Files.getFileAttributeView(file.getParent(), PosixFileAttributeView.class) != null) {
            Files.createFile(file, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
        } else {
            Files.createFile(file);
            setOwnerOnlyAcl(file, false);
        }
    }

    private static void setOwnerOnlyAcl(Path path, boolean directory) throws Exception {
        AclFileAttributeView view = Files.getFileAttributeView(path, AclFileAttributeView.class);
        if (view == null) throw new IllegalStateException("Cannot restrict permissions on " + path);
        var entry = AclEntry.newBuilder()
                .setType(AclEntryType.ALLOW)
                .setPrincipal(Files.getOwner(path))
                .setPermissions(EnumSet.allOf(AclEntryPermission.class));
        if (directory) entry.setFlags(AclEntryFlag.FILE_INHERIT, AclEntryFlag.DIRECTORY_INHERIT);
        view.setAcl(List.of(entry.build()));
    }
}
