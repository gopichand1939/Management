const assert = require("assert");

// Date Validation Utility
const getBusinessDateString = (timezone = "Asia/Kolkata") => {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());
};

const validateDates = (purchaseDate, invoiceDate, mfgDate) => {
    const todayStr = getBusinessDateString("Asia/Kolkata");

    if (!purchaseDate) {
        throw new Error("Purchase date is required");
    }

    if (purchaseDate > todayStr) {
        throw new Error("Purchase date cannot exceed today");
    }

    if (invoiceDate && invoiceDate > purchaseDate) {
        throw new Error("Invoice date cannot exceed purchase date");
    }

    if (mfgDate && mfgDate > todayStr) {
        throw new Error("Manufacturing date cannot exceed today");
    }

    return true;
};

// Date Mock Helper
const OriginalDate = global.Date;

const setMockDate = (isoString) => {
    global.Date = class extends OriginalDate {
        constructor(...args) {
            if (args.length === 0) {
                return new OriginalDate(isoString);
            }
            return new OriginalDate(...args);
        }
        static now() {
            return new OriginalDate(isoString).getTime();
        }
    };
};

const restoreDate = () => {
    global.Date = OriginalDate;
};

const runTests = () => {
    console.log("Running timezone-safe purchase date validation tests...");

    // Test Case 1: Midnight Edge Case (Asia/Kolkata is ahead of UTC)
    // UTC: 2026-07-14T19:00:00Z -> IST: 2026-07-15T00:30:00+05:30 (Today is July 15)
    setMockDate("2026-07-14T19:00:00.000Z");
    try {
        console.log(`Mock time: 2026-07-14T19:00:00Z (IST is 2026-07-15 00:30)`);
        console.log(`Current business date in Asia/Kolkata: ${getBusinessDateString()}`);
        assert.strictEqual(getBusinessDateString(), "2026-07-15");

        // Yesterday (2026-07-14) should be accepted
        assert.ok(validateDates("2026-07-14", "2026-07-14", null));
        // Today (2026-07-15) should be accepted
        assert.ok(validateDates("2026-07-15", "2026-07-14", null));
        // Tomorrow (2026-07-16) should be rejected
        assert.throws(() => validateDates("2026-07-16", null, null), /Purchase date cannot exceed today/);

        console.log("✔ Test Case 1 Passed!");
    } finally {
        restoreDate();
    }

    // Test Case 2: Standard Day Case
    // UTC: 2026-07-15T12:00:00Z -> IST: 2026-07-15T17:30:00+05:30 (Today is July 15)
    setMockDate("2026-07-15T12:00:00.000Z");
    try {
        console.log(`Mock time: 2026-07-15T12:00:00Z (IST is 2026-07-15 17:30)`);
        assert.strictEqual(getBusinessDateString(), "2026-07-15");

        // Today (2026-07-15) should be accepted
        assert.ok(validateDates("2026-07-15", "2026-07-15", null));
        // Tomorrow (2026-07-16) should be rejected
        assert.throws(() => validateDates("2026-07-16", null, null), /Purchase date cannot exceed today/);

        console.log("✔ Test Case 2 Passed!");
    } finally {
        restoreDate();
    }

    // Test Case 3: Prior to midnight in IST (almost next day in UTC but not in IST)
    // UTC: 2026-07-14T18:15:00Z -> IST: 2026-07-14T23:45:00+05:30 (Today is July 14)
    setMockDate("2026-07-14T18:15:00.000Z");
    try {
        console.log(`Mock time: 2026-07-14T18:15:00Z (IST is 2026-07-14 23:45)`);
        assert.strictEqual(getBusinessDateString(), "2026-07-14");

        // Today (2026-07-14) should be accepted
        assert.ok(validateDates("2026-07-14", null, null));
        // Tomorrow (2026-07-15) should be rejected
        assert.throws(() => validateDates("2026-07-15", null, null), /Purchase date cannot exceed today/);

        console.log("✔ Test Case 3 Passed!");
    } finally {
        restoreDate();
    }

    console.log("All unit tests for timezone-safe date validations completed successfully!");
};

runTests();
