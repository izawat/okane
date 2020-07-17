import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
import { Transaction } from "./transaction";
import { PL } from "./pl";
import { SbiParser } from "./sbiParser";
import { DailyLog } from "./dailyLog";

/**
 * メイン関数
 */
function main() {
  const TRADING_HISTRY_SHEET_NAME = "sbi取引履歴csv取込み";
  const ACCOUNT_HISTRY_SHEET_NAME = "sbi入出金履歴csv取込み";
  const PL_SHEET_NAME = "取引成績";
  const LOG_SHEET_NAME = "残高推移";
  let spreadSheet: Spreadsheet;
  const parser = new SbiParser();

  // スプレッドシートを開く
  spreadSheet = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty("SPREAD_SHEET_ID")
  );
  // 取引履歴シート解析
  const transactions = parser.parseTradingHistory(
    spreadSheet.getSheetByName(TRADING_HISTRY_SHEET_NAME)
  );
  // 損益計算
  const pls = calcPL(transactions);
  // 損益シートに書き出し
  const plSheet = spreadSheet.getSheetByName(PL_SHEET_NAME);
  writePLToSheet(pls, plSheet);

  // 入金履歴シート解析
  let dailyLogs = parser.parseAccountStatementHistory(
    spreadSheet.getSheetByName(ACCOUNT_HISTRY_SHEET_NAME)
  );
  // 残高推移計算
  dailyLogs = createDailyLogs(dailyLogs, pls, transactions);
  // 残高推移シートに書き出し
  const dailyLogSheet = spreadSheet.getSheetByName(LOG_SHEET_NAME);
  writeDailyLogToSheet(dailyLogs, dailyLogSheet);
}

/**
 * 損益計算を行う
 * @param transactions 全取引履歴
 */
function calcPL(transactions: Transaction[]): PL[] {
  const pls: PL[] = [];
  // 全取引をいずれかの損益に組み込む
  for (let i = 0; i < transactions.length; i++) {
    const tran = transactions[i];
    if (!tran.isCalculatedPL) {
      // 損益に組み込まれていない取引を見つけたら、新しい損益を作る
      const pl = new PL(tran);
      tran.isCalculatedPL = true;
      // 新しく作った損益に組み込むべき取引(追加注文、決済注文)を探して、損益に追加する
      for (let j = i + 1; j < transactions.length; j++) {
        const childTran = transactions[j];
        if (!childTran.isCalculatedPL && tran.isSameDescription(childTran)) {
          pl.addTransaction(childTran);
          childTran.isCalculatedPL = true;
          if (pl.isFixed()) {
            // 損益が確定したら、もうこの損益に取引を追加しない
            break;
          }
        }
      }
      pls.push(pl);
    }
  }
  Logger.log(pls.length + " 件の損益情報を作成しました。");
  // Logger.log(pls);
  return pls;
}

/**
 * 日次記録を作成する
 * @param logs 入出金の情報だけ入った日次記録
 * @param pls 計算済みの損益
 * @param tran 取引履歴
 */
function createDailyLogs(
  logs: DailyLog[],
  pls: PL[],
  trans: Transaction[]
): DailyLog[] {
  const dailyLogs: DailyLog[] = [];
  if (dailyLogs && dailyLogs.length > 0) {
    return dailyLogs;
  }
  // 日次記録作成開始日(入手金履歴の一番古い日付)
  const startDate = logs[0].date;
  // 日次記録作成終了日(なう)
  const endDate = new Date();
  // 開始日〜終了日までの日次記録を作成
  let prevLog = new DailyLog();
  let currentDate = new Date(startDate);
  while (true) {
    let dailyLog = logs.find((l) => l.date.getTime() === currentDate.getTime());
    if (!dailyLog) {
      dailyLog = new DailyLog();
      dailyLog.date = currentDate;
    }
    dailyLog.depositAmountYen += prevLog.depositAmountYen;
    dailyLog.withdrawalAmountYen += prevLog.withdrawalAmountYen;
    dailyLog.transferDepositAmountYen += prevLog.transferDepositAmountYen;
    dailyLog.transferWithdrawalAmountYen += prevLog.transferWithdrawalAmountYen;
    dailyLog.principalAmountYen =
      dailyLog.depositAmountYen +
      dailyLog.transferDepositAmountYen -
      dailyLog.withdrawalAmountYen -
      dailyLog.transferWithdrawalAmountYen;
    dailyLog.unfixedAmountYen = getUnfixedAmountYen(pls, currentDate);
    dailyLog.revenueAmountYen = getRevenueAmountYen(pls, currentDate);
    dailyLog.cashBalanceYen =
      dailyLog.principalAmountYen +
      dailyLog.revenueAmountYen -
      dailyLog.unfixedAmountYen;
    dailyLog.totalYen = dailyLog.principalAmountYen + dailyLog.revenueAmountYen;

    dailyLogs.push(dailyLog);
    prevLog = dailyLog;
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + 1
    );
    if (currentDate.getTime() > endDate.getTime()) {
      break;
    }
  }
  return dailyLogs;
}

/**
 * 損益シートに損益を書き込む
 * @param pls 損益の配列
 * @param sheet 損益シート
 */
function writePLToSheet(pls: PL[], sheet: GoogleAppsScript.Spreadsheet.Sheet) {
  const values: any[][] = [];
  const header = [
    "取引種別",
    "取引方法",
    "銘柄",
    "銘柄コード",
    "未決済数量",
    "決済済み数量",
    "買付金額(円)",
    "売却金額(円)",
    "未決済金額(円)",
    "損益金額(円)",
    "損益率(%)",
    "買付取引回数",
    "売却取引回数",
    "取引開始日",
    "決済日",
  ];
  values[0] = header;
  pls.forEach((pl) => {
    const row: string[] = [
      String(pl.tradeType),
      String(pl.tradeMethod),
      pl.description,
      pl.code,
      String(pl.unfixedQuantity),
      String(pl.fixedQuantity),
      String(pl.buyingAmountYen),
      String(pl.sellingAmountYen),
      String(pl.unfixedAmountYen),
      String(pl.profitYen),
      String(pl.profitPercent),
      String(pl.buyingCount()),
      String(pl.sellingCount()),
      pl.startDate.getFullYear() +
        "/" +
        (pl.startDate.getMonth() + 1) +
        "/" +
        pl.startDate.getDate(),
      pl.fixedDate === undefined
        ? ""
        : pl.fixedDate.getFullYear() +
          "/" +
          (pl.fixedDate.getMonth() + 1) +
          "/" +
          pl.fixedDate.getDate(),
    ];
    values.push(row);
  });
  sheet.clearContents();
  sheet.getRange("A1:O" + values.length).setValues(values);
}

/**
 * 推移シートに損益を書き込む
 * @param logs 日次記録の配列
 * @param sheet 損益シート
 */
function writeDailyLogToSheet(
  logs: DailyLog[],
  sheet: GoogleAppsScript.Spreadsheet.Sheet
) {
  const values: any[][] = [];
  const header = [
    "日付",
    "累計入金額(円)",
    "累計出金額(円)",
    "累計振替入金額(円)",
    "累計振替出金額(円)",
    "元本(円)",
    "保有中銘柄買付額合計(円)",
    "累計収益(円)",
    "現金残高(円)",
    "資産合計(円)",
  ];
  values[0] = header;
  logs.forEach((log) => {
    const row: string[] = [
      log.date.getFullYear() +
        "/" +
        (log.date.getMonth() + 1) +
        "/" +
        log.date.getDate(),
      String(log.depositAmountYen),
      String(log.withdrawalAmountYen),
      String(log.transferDepositAmountYen),
      String(log.transferWithdrawalAmountYen),
      String(log.principalAmountYen),
      String(log.unfixedAmountYen),
      String(log.revenueAmountYen),
      String(log.cashBalanceYen),
      String(log.totalYen),
    ];
    values.push(row);
  });
  sheet.clearContents();
  sheet.getRange("A1:J" + values.length).setValues(values);
}

/**
 * 指定日時点で未決済の損益の買付金額合計を取得
 * @param pls 計算済みの損益配列
 * @param targetDate 指定日
 */
function getUnfixedAmountYen(pls: PL[], targetDate: Date): number {
  let unfixedAmountYen = 0;
  const unfixedPLs = pls.filter(
    (pl) =>
      (!pl.isFixed() && pl.startDate.getTime() <= targetDate.getTime()) ||
      (pl.isFixed() &&
        pl.startDate.getTime() <= targetDate.getTime() &&
        pl.fixedDate.getTime() > targetDate.getTime())
  );
  if (unfixedPLs && unfixedPLs.length > 0) {
    unfixedPLs.forEach((pl) => {
      // 指定日時点の損益を取得し、未決済額を取得する。（重いかも）
      unfixedAmountYen += pl.getPLPointOfTime(targetDate).unfixedAmountYen;
    });
  }
  return unfixedAmountYen;
}

/**
 * 指定日時点での累計収益を取得
 * @param pls 計算済みの損益配列
 * @param targetDate 指定日
 */
function getRevenueAmountYen(pls: PL[], targetDate: Date): number {
  let revenueAmountYen = 0;
  const targetPLs = pls.filter(
    (pl) => pl.isFixed() && pl.fixedDate.getTime() <= targetDate.getTime()
  );
  if (targetPLs && targetPLs.length > 0) {
    targetPLs.forEach((pl) => {
      revenueAmountYen += Number(pl.profitYen);
    });
  }
  return revenueAmountYen;
}
