import { expect, test } from "vitest";
import createCostAlert from "./cost-alerts/create-cost-alert";
import getCostAlert from "./cost-alerts/get-cost-alert";
import listCostAlerts from "./cost-alerts/list-cost-alerts";
import createReportNotification from "./create-report-notification";
import deleteReportNotification from "./delete-report-notification";
import getReportNotification from "./get-report-notification";
import listReportNotifications from "./list-report-notifications";
import updateReportNotification from "./update-report-notification";

test("report notification metadata targets natural-language report notification requests", () => {
  expect(listReportNotifications.name).toBe("list-report-notifications");
  expect(listReportNotifications.title).toBe("List Report Notifications");
  expect(listReportNotifications.description).toContain("List Report Notifications available in the Vantage account.");
  expect(listReportNotifications.description.toLowerCase()).toContain("scheduled report notifications");

  for (const tool of [
    createReportNotification,
    getReportNotification,
    updateReportNotification,
    deleteReportNotification,
  ]) {
    expect(tool.description.toLowerCase()).toContain("report notification");
    expect(tool.description.toLowerCase()).toContain("cost alerts");
  }
});

test("cost alert metadata remains specific to threshold-based alerts", () => {
  for (const tool of [createCostAlert, getCostAlert, listCostAlerts]) {
    expect(tool.description).toContain("threshold-based spending alert");
    expect(tool.description).not.toContain("report_notifications");
  }
});
