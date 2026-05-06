import { expect, test } from "vitest";
import createCostAlert from "./create-cost-alert";
import createReportNotification from "./create-report-notification";
import deleteReportNotification from "./delete-report-notification";
import getCostAlert from "./get-cost-alert";
import getReportNotification from "./get-report-notification";
import listCostAlerts from "./list-cost-alerts";
import listReportNotifications from "./list-report-notifications";
import updateReportNotification from "./update-report-notification";

test("report notification metadata targets natural-language report notification requests", () => {
  expect(listReportNotifications.name).toBe("list-report-notifications");
  expect(listReportNotifications.title).toBe("List Report Notifications");
  expect(listReportNotifications.description).toContain("report_notifications API resource");
  expect(listReportNotifications.description).toContain("get, list, show, or view report notifications");

  for (const tool of [
    createReportNotification,
    getReportNotification,
    updateReportNotification,
    deleteReportNotification,
  ]) {
    expect(tool.description).toContain("report_notifications API resource");
    expect(tool.description.toLowerCase()).toContain("report notification");
  }
});

test("cost alert metadata remains specific to threshold-based alerts", () => {
  for (const tool of [createCostAlert, getCostAlert, listCostAlerts]) {
    expect(tool.description).toContain("threshold-based spending alert");
    expect(tool.description).not.toContain("report_notifications");
  }
});
