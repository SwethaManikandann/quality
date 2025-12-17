sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "com/kaar/qualityportal/model/Formatter",
    "sap/ui/model/json/JSONModel"
], function (Controller, History, MessageToast, MessageBox, Formatter, JSONModel) {
    "use strict";

    return Controller.extend("com.kaar.qualityportal.controller.InspectionDetail", {
        formatter: Formatter,

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("inspection").attachPatternMatched(this._onObjectMatched, this);

            // Local JSON model for UI state (buttons enablement, totals)
            var oViewModel = new JSONModel({
                isEditable: false,
                totalRecorded: 0,
                qtyState: "None",
                qtyStateText: ""
            });
            this.getView().setModel(oViewModel, "viewModel");
        },

        _onObjectMatched: function (oEvent) {
            var sPath = "/" + oEvent.getParameter("arguments").inspectionPath;
            this.getView().bindElement({
                path: sPath,
                model: "inspectionModel",
                events: {
                    dataReceived: this._updateUIState.bind(this),
                    change: this._updateUIState.bind(this)
                }
            });
            // Initial UI update delay to ensure data is loaded
            setTimeout(this._updateUIState.bind(this), 500);
        },

        _updateUIState: function () {
            var oContext = this.getView().getBindingContext("inspectionModel");
            if (!oContext) return;

            var oData = oContext.getObject();
            var oViewModel = this.getView().getModel("viewModel");

            // Check if decision is already made
            // PENDING, A, R
            var bIsPending = !oData.UsageDecisionCode || oData.UsageDecisionCode === "PENDING" || oData.UsageDecisionCode === "Pending";

            oViewModel.setProperty("/isEditable", bIsPending);

            // Load Local Data if exists, otherwise use OData
            var sLotId = oData.InspectionLot; // Assuming ID is available
            var sStorageKey = "quality_portal_" + sLotId;
            var sLocalData = localStorage.getItem(sStorageKey);

            if (sLocalData) {
                var oLocal = JSON.parse(sLocalData);
                oViewModel.setProperty("/UnrestrictedQuantity", oLocal.UnrestrictedQuantity);
                oViewModel.setProperty("/BlockedQuantity", oLocal.BlockedQuantity);
                oViewModel.setProperty("/ProductionQuantity", oLocal.ProductionQuantity);
            } else {
                oViewModel.setProperty("/UnrestrictedQuantity", parseFloat(oData.UnrestrictedQuantity) || 0);
                oViewModel.setProperty("/BlockedQuantity", parseFloat(oData.BlockedQuantity) || 0);
                oViewModel.setProperty("/ProductionQuantity", parseFloat(oData.ProductionQuantity) || 0);
            }

            this.onLiveChange(); // Re-validate totals
        },

        onLiveChange: function () {
            var oContext = this.getView().getBindingContext("inspectionModel");
            if (!oContext) return;

            var oViewModel = this.getView().getModel("viewModel");

            var iUnrestricted = parseFloat(oViewModel.getProperty("/UnrestrictedQuantity")) || 0;
            var iBlocked = parseFloat(oViewModel.getProperty("/BlockedQuantity")) || 0;
            var iProduction = parseFloat(oViewModel.getProperty("/ProductionQuantity")) || 0;

            var iTotal = iUnrestricted + iBlocked + iProduction;
            var iLotQty = parseFloat(oContext.getProperty("LotQuantity")) || 0;

            oViewModel.setProperty("/totalRecorded", iTotal);

            if (iTotal === iLotQty) {
                oViewModel.setProperty("/qtyState", "Success");
                oViewModel.setProperty("/qtyStateText", "Quantity Matches");
            } else if (iTotal > iLotQty) {
                oViewModel.setProperty("/qtyState", "Error");
                oViewModel.setProperty("/qtyStateText", "Exceeds Lot Quantity");
            } else {
                oViewModel.setProperty("/qtyState", "Warning");
                oViewModel.setProperty("/qtyStateText", "Incomplete Quantity");
            }
        },

        onSave: function () {
            // Local Save Only
            var oViewModel = this.getView().getModel("viewModel");
            var oContext = this.getView().getBindingContext("inspectionModel");

            var oDataToSave = {
                UnrestrictedQuantity: oViewModel.getProperty("/UnrestrictedQuantity"),
                BlockedQuantity: oViewModel.getProperty("/BlockedQuantity"),
                ProductionQuantity: oViewModel.getProperty("/ProductionQuantity")
            };

            var sLotId = oContext.getProperty("InspectionLot");
            var sStorageKey = "quality_portal_" + sLotId;

            localStorage.setItem(sStorageKey, JSON.stringify(oDataToSave));

            MessageToast.show("Record Saved Successfully");
        },

        onApprove: function () {
            this._submitDecision("A");
        },

        onReject: function () {
            this._submitDecision("R", false);
        },

        _submitDecision: function (sDecision, bIsPartial) {
            // This method is now only for FINAL DECISION (Approve/Reject)
            // Partial Save is handled by onSave locally.

            var oViewModel = this.getView().getModel("viewModel");
            var oContext = this.getView().getBindingContext("inspectionModel");
            var iLotQty = parseFloat(oContext.getProperty("LotQuantity"));
            var iTotal = oViewModel.getProperty("/totalRecorded");

            if (iTotal !== iLotQty) {
                MessageBox.error("Cannot submit decision. Total recorded quantity must match Lot Quantity.");
                return;
            }

            var oModel = this.getView().getModel("inspectionModel");
            var sPath = oContext.getPath();

            // Prepare update payload for BACKEND call
            // We use the LOCAL values from viewModel to send to backend
            var oUpdateData = {
                UnrestrictedQuantity: oViewModel.getProperty("/UnrestrictedQuantity"),
                BlockedQuantity: oViewModel.getProperty("/BlockedQuantity"),
                ProductionQuantity: oViewModel.getProperty("/ProductionQuantity"),
                UsageDecisionCode: sDecision
            };

            oModel.update(sPath, oUpdateData, {
                success: function () {
                    MessageToast.show("Decision Saved Successfully");
                    this._updateUIState();
                    this.onNavBack();
                }.bind(this),
                error: function (oError) {
                    try {
                        var sMsg = JSON.parse(oError.responseText).error.message.value;
                        MessageBox.error("Error: " + sMsg);
                    } catch (e) {
                        MessageBox.error("Error saving data. Please check connection or backend logs.");
                    }
                }
            });
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("dashboard", {}, true);
            }
        }
    });
});
