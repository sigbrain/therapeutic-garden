package com.example.manage.healingeffect;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.HexFormat;
import static com.example.manage.healingeffect.HealingEffectExcelParser.*;
import static org.assertj.core.api.Assertions.*;

class HealingEffectExcelParserTests {
    @TempDir Path directory;
    HealingEffectExcelParser parser = new HealingEffectExcelParser();

    @Test void readsOnlySummariesPreservingPrecisionAndSourceBytes() throws Exception {
        Path path = SyntheticEffectWorkbook.create(directory, book ->
                book.getSheet(OVERALL).getRow(1).getCell(7).getCTCell().setV("200.39999999999999"));
        byte[] before = Files.readAllBytes(path);
        var source = parser.parse(path);
        assertThat(source.sha256()).isEqualTo(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(before)));
        assertThat(source.overall()).hasSize(6);
        assertThat(source.participants()).hasSize(2).allSatisfy(p -> assertThat(p.participantNo()).isEqualTo(4));
        assertThat(source.overall().getFirst().emotionalRate()).isEqualByComparingTo("200.39999999999999");
        assertThat(Files.readAllBytes(path)).isEqualTo(before);
    }

    @ParameterizedTest @ValueSource(strings = {"p004", "P04", "P0004", "P004 ", "PABC", "P００４"})
    void rejectsInvalidParticipant(String code) throws Exception {
        Path path = SyntheticEffectWorkbook.create(directory, b -> b.getSheet(PARTICIPANTS).getRow(1).getCell(0).setCellValue(code));
        assertThatThrownBy(() -> parser.parse(path)).isInstanceOf(EffectImportValidationException.class).hasMessageContaining("Participant");
    }

    @ParameterizedTest @ValueSource(strings = {"P001", "P002", "P003", "P004", "P005", "P006", "P007", "P008", "P009", "P010", "P011"})
    void acceptsCohortCodes(String code) throws Exception {
        var path = SyntheticEffectWorkbook.create(directory, b -> b.getSheet(PARTICIPANTS).getRow(1).getCell(0).setCellValue(code));
        assertThat(parser.parse(path).participants().getFirst().participantNo()).isEqualTo(Integer.parseInt(code.substring(1)));
    }

    @ParameterizedTest @ValueSource(strings = {"sheet", "header", "duplicateHeader", "numeric", "blank", "formula", "fractionCount", "negativeCount", "overflow", "scale", "spot", "name", "duplicateSpot", "duplicatePair"})
    void rejectsMalformedWorkbook(String kind) throws Exception {
        var path = SyntheticEffectWorkbook.create(directory, b -> {
            var sheet = b.getSheet(PARTICIPANTS);
            var cell = sheet.getRow(1).getCell(4);
            switch (kind) {
                case "sheet" -> b.removeSheetAt(b.getSheetIndex(OVERALL));
                case "header" -> sheet.getRow(0).getCell(4).setCellValue("wrong header");
                case "duplicateHeader" -> sheet.getRow(0).createCell(8).setCellValue(STRESS_RATE);
                case "numeric" -> cell.setCellValue("19.5%");
                case "blank" -> cell.setBlank();
                case "formula" -> cell.setCellFormula("1+1");
                case "fractionCount" -> sheet.getRow(1).getCell(3).setCellValue(1.5);
                case "negativeCount" -> sheet.getRow(1).getCell(3).setCellValue(-1);
                case "overflow" -> cell.getCTCell().setV("1e30");
                case "scale" -> cell.getCTCell().setV("0.0000000000000000001");
                case "spot" -> sheet.getRow(1).getCell(1).setCellValue("HS7");
                case "name" -> sheet.getRow(1).getCell(2).setCellValue("잘못된 이름");
                case "duplicateSpot" -> {
                    var row = b.getSheet(OVERALL).getRow(2);
                    row.getCell(0).setCellValue("HS6"); row.getCell(1).setCellValue(NAMES.get(5));
                }
                case "duplicatePair" -> {
                    sheet.getRow(2).getCell(1).setCellValue("HS6"); sheet.getRow(2).getCell(2).setCellValue(NAMES.get(5));
                }
            }
        });
        assertThatThrownBy(() -> parser.parse(path)).isInstanceOf(EffectImportValidationException.class);
    }
}
