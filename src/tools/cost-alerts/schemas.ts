import z from "zod";

export const costAlertIntervals = ["day", "week", "month", "quarter"] as const;
export const costAlertUnitTypes = ["currency", "percentage"] as const;

export const costAlertTitle = z.string().min(1).max(255);
export const costAlertInterval = z.enum(costAlertIntervals);
export const costAlertThreshold = z.number().gt(0);
export const costAlertUnitType = z.enum(costAlertUnitTypes);
export const costAlertReportTokens = z.array(z.string()).min(1).max(10);
export const costAlertMinimumThreshold = z.number().min(0);
