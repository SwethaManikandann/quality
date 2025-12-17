sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "com/kaar/qualityportal/model/Formatter"
], function (Controller, History, Formatter) {
    "use strict";

    return Controller.extend("com.kaar.qualityportal.controller.Dashboard", {
        formatter: Formatter,

        onInit: function () {
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("login", {}, true);
            }
        },

        onRefresh: function () {
            this.byId("inspectionTable").getBinding("items").refresh();
        },

        onLogout: function () {
            this.getOwnerComponent().getRouter().navTo("login");
        }
    });
});
