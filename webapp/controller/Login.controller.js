sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/BusyIndicator"
], function (Controller, MessageToast, MessageBox, Filter, FilterOperator, BusyIndicator) {
    "use strict";

    return Controller.extend("com.kaar.qualityportal.controller.Login", {
        onInit: function () {
        },

        onLoginPress: function () {
            var sUsername = this.byId("username").getValue();
            var sPassword = this.byId("password").getValue();

            if (!sUsername || !sPassword) {
                MessageToast.show("Please enter both username and password.");
                return;
            }

            BusyIndicator.show(0);

            var oModel = this.getView().getModel("loginModel");
            var aFilters = [
                new Filter("username", FilterOperator.EQ, sUsername),
                new Filter("password", FilterOperator.EQ, sPassword)
            ];

            // Perform manual read to validate credentials
            oModel.read("/ZDD_SM_QP", {
                filters: aFilters,
                success: function (oData) {
                    BusyIndicator.hide();
                    // Check if any record matches
                    if (oData.results && oData.results.length > 0) {
                        var oUser = oData.results[0];
                        if (oUser.login_status === 'Success') {
                            MessageToast.show("Login Successful");
                            this.getOwnerComponent().getRouter().navTo("dashboard");
                        } else {
                            MessageBox.error("Access Denied: Login Status is not Success.");
                        }
                    } else {
                        MessageBox.error("Invalid credentials.");
                    }
                }.bind(this),
                error: function (oError) {
                    BusyIndicator.hide();
                    try {
                        var oErr = JSON.parse(oError.responseText);
                        MessageBox.error(oErr.error.message.value);
                    } catch (e) {
                        MessageBox.error("Login failed. Service unavailable or credentials incorrect.");
                    }
                }
            });
        }
    });
});
