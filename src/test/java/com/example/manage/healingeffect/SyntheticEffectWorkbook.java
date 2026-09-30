package com.example.manage.healingeffect;

import org.apache.poi.xssf.usermodel.*;
import java.nio.file.*;
import java.util.function.Consumer;
import static com.example.manage.healingeffect.HealingEffectExcelParser.*;

/** Generated data only. Never reads or copies the private workbook. */
final class SyntheticEffectWorkbook {
    static Path create(Path directory, Consumer<XSSFWorkbook> change) throws Exception {
        Path path = directory.resolve("synthetic.xlsx");
        try (var book = new XSSFWorkbook()) {
            var overall = book.createSheet(OVERALL);
            row(overall, 0, "스팟", "스팟명", STRESS_PARTICIPANTS, STRESS_SESSIONS, STRESS_RATE,
                    EMOTIONAL_PARTICIPANTS, EMOTIONAL_SESSIONS, EMOTIONAL_RATE);
            double[] stress = {19.49, 10.8, 17.3, 15.0, 5.0, 21.19};
            double[] emotional = {54.29, 29.2, 83.5, 73.3, 25.8, 200.39};
            // Reverse order proves the query layer imposes HS1..HS6 ordering.
            for (int i = 5; i >= 0; i--)
                row(overall, 6 - i, CODES.get(i), NAMES.get(i), 1, 2, stress[i], 1, 2, emotional[i]);
            var participant = book.createSheet(PARTICIPANTS);
            row(participant, 0, "참여자", "스팟", "스팟명", STRESS_SESSIONS, STRESS_RATE,
                    EMOTIONAL_SESSIONS, EMOTIONAL_RATE);
            row(participant, 1, "P004", "HS6", NAMES.get(5), 2, 21.19, 2, 200.39);
            row(participant, 2, "P004", "HS1", NAMES.get(0), 2, 0.0, 2, 54.29);
            // Unused sheets may contain errors; they must not be parsed or evaluated.
            book.createSheet("01_원자료").createRow(0).createCell(0).setCellFormula("1/0");
            book.createSheet("04_전체_최대개선케이스");
            change.accept(book);
            try (var output = Files.newOutputStream(path)) { book.write(output); }
        }
        return path;
    }

    private static void row(XSSFSheet sheet, int index, Object... values) {
        var row = sheet.createRow(index);
        for (int i = 0; i < values.length; i++) {
            var cell = row.createCell(i);
            if (values[i] instanceof Number value) cell.setCellValue(value.doubleValue());
            else cell.setCellValue((String) values[i]);
        }
    }
}
