package com.example.manage;

import java.util.Locale;

/** Synthetic fixtures for isolated tests only; never use for calls or messages. */
final class SyntheticPhones {
    private SyntheticPhones() {}

    static String raw(int id) {
        if (id < 1 || id > 7) throw new IllegalArgumentException("Invalid fixture");
        return "010" + "0000" + String.format(Locale.ROOT, "%04d", id);
    }

    static String formatted(int id) {
        String digits = raw(id);
        return digits.substring(0, 3) + "-" + digits.substring(3, 7) + "-" + digits.substring(7);
    }
}
