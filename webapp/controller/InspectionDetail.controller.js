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

            this.onLiveChange(); // Re-validate totals
        },

        onLiveChange: function () {
            var oContext = this.getView().getBindingContext("inspectionModel");
            if (!oContext) return;

            // Get values (Assuming properties exist, if not they default to undefined/0 during sum if handled)
            // Note: Since these might not exist in backend metadata yet, app might fail to save, 
            // but we implement the logic as requested using standard-ish fields or custom fields the user assumes exist.
            // Using logical names: UnrestrictedQuantity, BlockedQuantity, ProductionQuantity
            // If these fail, check metadata.

            var iUnrestricted = parseFloat(oContext.getProperty("UnrestrictedQuantity")) || 0;
            var iBlocked = parseFloat(oContext.getProperty("BlockedQuantity")) || 0;
            var iProduction = parseFloat(oContext.getProperty("ProductionQuantity")) || 0;

            var iTotal = iUnrestricted + iBlocked + iProduction;
            var iLotQty = parseFloat(oContext.getProperty("LotQuantity")) || 0;

            var oViewModel = this.getView().getModel("viewModel");
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
            // Save current values without changing decision (Partial Save)
            // No quantity validation required for partial save
            this._submitDecision(null, true);
        },

        onApprove: function () {
            this._submitDecision("A", false);
        },

        onReject: function () {
            this._submitDecision("R", false);
        },

        _submitDecision: function (sDecision, bIsPartial) {
            var oViewModel = this.getView().getModel("viewModel");
            var oContext = this.getView().getBindingContext("inspectionModel");
            var iLotQty = parseFloat(oContext.getProperty("LotQuantity"));
            var iTotal = oViewModel.getProperty("/totalRecorded");

            // Validation only for Final Decision
            if (!bIsPartial && iTotal !== iLotQty) {
                MessageBox.error("Cannot submit decision. Total recorded quantity must match Lot Quantity.");
                return;
            }

            var oModel = this.getView().getModel("inspectionModel");
            var sPath = oContext.getPath();

            // Prepare update payload
            var oUpdateData = {
                UnrestrictedQuantity: oContext.getProperty("UnrestrictedQuantity"),
                BlockedQuantity: oContext.getProperty("BlockedQuantity"),
                ProductionQuantity: oContext.getProperty("ProductionQuantity"),
                // Ensure UsageDecisionCode is strictly sent. 
                // If partial, use current value (likely 'PENDING'); if final, use new decision.
                UsageDecisionCode: bIsPartial ? oContext.getProperty("UsageDecisionCode") : sDecision
            };

            oModel.update(sPath, oUpdateData, {
                success: function () {
                    MessageToast.show(bIsPartial ? "Record Saved Successfully" : "Decision Saved Successfully");
                    this._updateUIState();
                    if (!bIsPartial) {
                        this.onNavBack();
                    }
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
