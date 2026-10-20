import z from "zod";

export const folderType = z.enum(["CostFolder", "DashboardFolder", "ProviderResourceFolder"]);
