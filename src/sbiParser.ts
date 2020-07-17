import { Transaction } from "./transaction";
import { TradeType, TradeMethod, TradeDirection } from "./constant";
import { DailyLog } from "./dailyLog";

/**
 * SBI証券のcsv用パーサ
 */
export class SbiParser {
  /**
   * 取引履歴をシートから取得する
   * @param sheet 取引履歴のシート
   */
  public parseTradingHistory(
    sheet: GoogleAppsScript.Spreadsheet.Sheet
  ): Transaction[] {
    const transactions: Transaction[] = [];
    const values = sheet.getRange("A:N").getValues();
    values.forEach((row) => {
      // 有効な行かチェックする(1項目目が日付(Date型)なら有効な行とみなす)
      if (typeof row[0] !== "object") {
        return;
      }
      transactions.push(this.parseTran(row));
    });
    Logger.log(transactions.length + " 件の取引履歴を取り込みました。");
    // Logger.log(transactions);
    return transactions;
  }

  /**
   * 入出金履歴をシートから取得する
   * @param sheet 入出金履歴のシート
   */
  public parseAccountStatementHistory(
    sheet: GoogleAppsScript.Spreadsheet.Sheet
  ): DailyLog[] {
    const dailyLogs: DailyLog[] = [];
    const values = sheet.getRange("A:G").getValues();
    values.forEach((row) => {
      // 有効な行かチェックする(1項目目が日付(Date型)なら有効な行とみなす)
      if (typeof row[0] !== "object") {
        return;
      }
      dailyLogs.push(this.parseDepositAndWithdrawalDetail(row));
    });
    // 日付ソート昇順
    dailyLogs.sort((a, b) => (a.date > b.date ? 1 : -1));
    // 同日に複数の日次記録ができた場合、１つの日次記録にまとめる
    const newDailyLogs: DailyLog[] = [];
    for (let i = 0; i < dailyLogs.length; i++) {
      const log = dailyLogs[i];
      const newLog = new DailyLog();
      newLog.date = log.date;
      const sameDateLogs = dailyLogs.filter(
        (elem) => String(log.date) === String(elem.date)
      );
      i += sameDateLogs.length - 1;
      sameDateLogs.forEach((sl) => {
        newLog.depositAmountYen += sl.depositAmountYen;
        newLog.withdrawalAmountYen += sl.withdrawalAmountYen;
        newLog.transferDepositAmountYen += sl.transferDepositAmountYen;
        newLog.transferWithdrawalAmountYen += sl.transferWithdrawalAmountYen;
      });
      newDailyLogs.push(newLog);
    }
    return newDailyLogs;
  }

  /**
   * SBI証券の取引履歴CSVの１行から、取引を取得する
   * @param row SBI証券の取引履歴CSVの１行
   */
  private parseTran(row: any[]): Transaction {
    const tran = new Transaction();
    tran.contractDate = row[0];
    tran.description = row[1];
    tran.code = row[2];
    tran.market = row[3];
    tran.tradeType = this.parseTradeType(row[4]);
    tran.tradeMethod = this.parseTradeMethod(row[4]);
    tran.tradeDirection = this.parseTradeDirection(row[4]);
    tran.expired = row[5];
    tran.bankAccountType = row[6];
    tran.taxType = row[7];
    tran.contractQuantity = row[8];
    tran.contractUnitPrice = row[9];
    tran.fee = row[10] === "--" ? 0 : Number(row[10]);
    tran.tax = row[11] === "--" ? 0 : Number(row[11]);
    tran.deliveryDate = row[12];
    tran.deliveryAmount = Number(row[13]);
    tran.unitPrice = tran.deliveryAmount / tran.contractQuantity;
    tran.isCalculatedPL = false;
    return tran;
  }

  /**
   * 取引(種類)を判別する
   * @param sbiTradeString SBI証券の取引履歴CSVから取得した「取引」項目の文字列
   */
  private parseTradeType(sbiTradeString: string): TradeType {
    if (sbiTradeString) {
      if (sbiTradeString.startsWith("株式現物")) {
        return TradeType.STOCK;
      } else if (sbiTradeString.startsWith("投信")) {
        return TradeType.INVESTMENT_TRUST;
      }
    }
    Logger.log("未知の取引種類が検出されました。" + sbiTradeString);
    return TradeType.UNKNOWN;
  }

  /**
   * 取引(方法)を判別する
   * @param sbiTradeString SBI証券の取引履歴CSVから取得した「取引」項目の文字列
   */
  private parseTradeMethod(sbiTradeString: string): TradeMethod {
    if (sbiTradeString) {
      if (sbiTradeString.includes("現物")) {
        return TradeMethod.SPOTTRADING_STOCK;
      } else if (sbiTradeString.includes("口数")) {
        return TradeMethod.INVESTMENT_TRUST_ITEMS_NUMBER;
      } else if (sbiTradeString.includes("金額")) {
        return TradeMethod.INVESTMENT_TRUST_PRICE;
      }
    }
    Logger.log("未知の取引方法が検出されました。:" + sbiTradeString);
    return TradeMethod.UNKNOWN;
  }

  /**
   * 取引方向を判別する
   * @param sbiTradeString SBI証券の取引履歴CSVから取得した「取引」項目の文字列
   */
  private parseTradeDirection(sbiTradeString: string): TradeDirection {
    if (sbiTradeString) {
      if (sbiTradeString.includes("買")) {
        return TradeDirection.BUY;
      } else if (
        sbiTradeString.includes("売") ||
        sbiTradeString.includes("解約")
      ) {
        return TradeDirection.SELL;
      }
    }
    Logger.log("取引方向(売か買か)が判別できませんでした。:" + sbiTradeString);
    return TradeDirection.UNKNOWN;
  }

  /**
   * SBI証券の入出金履歴CSVの１行から、日次の記録を取得する
   * @param row SBI証券の入出金履歴CSVの１行
   */
  private parseDepositAndWithdrawalDetail(row: any[]): DailyLog {
    const dailyLog = new DailyLog();
    // 入金日付
    dailyLog.date = row[0];
    // 区分
    // 摘要
    // 出金額
    dailyLog.withdrawalAmountYen = row[3] === "-" ? 0 : Number(row[3]);
    // 入金額
    dailyLog.depositAmountYen = row[4] === "-" ? 0 : Number(row[4]);
    // 振替出金額
    dailyLog.transferWithdrawalAmountYen = row[5] === "-" ? 0 : Number(row[5]);
    // 振替入金額
    dailyLog.transferDepositAmountYen = row[6] === "-" ? 0 : Number(row[6]);
    return dailyLog;
  }
}
