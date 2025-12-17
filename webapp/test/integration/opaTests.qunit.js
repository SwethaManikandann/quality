/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["quality/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
