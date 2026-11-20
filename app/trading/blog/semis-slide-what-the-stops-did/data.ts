/**
 * Numbers behind "Heavy in semis through the NVDA slide".
 *
 * Account: the paper account's equity as published to the live journal
 * (/trading/journal) after each close. These are broker snapshots taken by
 * the nightly publish step, not an audited closing NAV.
 * Market: daily closes for ^GSPC, ^NDX, ^SOX and NVDA.
 * Exits: fill prices from the account's own trade log.
 *
 * Window: close of 2026-10-28 to close of 2026-11-20, the same for every
 * series.
 */

export const DATES = [
  "2026-10-28", "2026-10-29", "2026-10-30", "2026-11-02", "2026-11-03", "2026-11-04",
  "2026-11-05", "2026-11-06", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12",
  "2026-11-13", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"
] as const;

export const ACCOUNT = [
  100652.94, 96314.62, 94314.56, 92602.92, 93569.08, 93992.72,
  87503.09, 90590.55, 93010.24, 92768.83, 94350.92, 93099.74,
  92106.6, 91403.19, 91437.19, 91899.09, 90846.37, 89389.21
] as const;

export const SP500 = [
  7743.98, 7720.39, 7580.07, 7541.4, 7568.92, 7688.62,
  7353.73, 7376.86, 7549.94, 7520.93, 7619.38, 7592.4,
  7561.67, 7416.59, 7340.53, 7323.63, 7175.83, 6910.39
] as const;

export const NDX = [
  29813.16, 29402.51, 28384.85, 27989.82, 28180.26, 28437.17,
  26629.81, 26989.99, 27907.63, 27740.79, 28374.25, 28289.19,
  27943.74, 27197.15, 27001.78, 27116.26, 26517.05, 25028.98
] as const;

export const SOX = [
  11684.0, 11518.2, 10688.8, 10328.33, 10600.4, 10268.65,
  9011.14, 9390.25, 10033.93, 9998.33, 10564.11, 10506.67,
  10146.32, 9610.65, 9642.88, 9652.8, 9419.72, 8408.59
] as const;

export const NVDA = [
  215.38, 213.66, 204.64, 202.06, 206.69, 200.13,
  181.6, 186.64, 178.67, 168.89, 173.73, 166.19,
  162.85, 156.14, 155.46, 150.96, 145.98, 125.53
] as const;

export type Exit = {
  date: string;
  ticker: string;
  /** The strategy's stop level when the sale went through. */
  stop: number;
  /** Fill price of the sale. */
  soldAt: number;
  /** The stock's close on 2026-11-20. */
  lastClose: number;
  note?: string;
};

export const EXITS: readonly Exit[] = [
  { date: "Oct 29", ticker: "GOOGL", stop: 308, soldAt: 283.02, lastClose: 265.29, note: "gapped below the stop on earnings" },
  { date: "Oct 30", ticker: "NVDA", stop: 205, soldAt: 204.65, lastClose: 125.53 },
  { date: "Oct 30", ticker: "META", stop: 615, soldAt: 615.36, lastClose: 560.84 },
  { date: "Nov 10", ticker: "TSM", stop: 405, soldAt: 398.69, lastClose: 319.14 },
  { date: "Nov 10", ticker: "MU", stop: 905, soldAt: 738.83, lastClose: 594.51, note: "sold far below its stop; see below" },
  { date: "Nov 12", ticker: "NVDA", stop: 205, soldAt: 156.4, lastClose: 125.53, note: "the re-bought position; see below" },
  { date: "Nov 20", ticker: "AMD", stop: 485, soldAt: 458.66, lastClose: 424.39 }
];
