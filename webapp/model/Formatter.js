sap.ui.define([], function () {
    "use strict";
    return {
        statusState: function (sStatus) {
            if (!sStatus) {
                return "Warning"; // Pending
            }
            sStatus = sStatus.toUpperCase();
            if (sStatus.indexOf("ACCEPT") !== -1 || sStatus === "A") {
                return "Success";
            } else if (sStatus.indexOf("REJECT") !== -1 || sStatus === "R") {
                return "Error";
            } else {
                return "Warning"; // Pending or Unknown
            }
        },
        statusText: function (sStatus) {
            if (!sStatus) return "Pending";
            return sStatus;
        },
        date: function (date) {
            if (!date) return "";
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "dd-MM-yyyy"
            });
            return oDateFormat.format(new Date(date));
        }
    };
});
