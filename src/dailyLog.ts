/**
 * 日次の記録
 */
export class DailyLog {
  /** 日付 */
  date: Date;
  /** 累計入金額(円) */
  depositAmountYen = 0;
  /** 累計出金額(円) */
  withdrawalAmountYen = 0;
  /** 累計振替入金額(円) */
  transferDepositAmountYen = 0;
  /** 累計振替出金額(円) */
  transferWithdrawalAmountYen = 0;
  /**
   * 元本(円)
   * @description 元本 = 累計入金額 + 累計振替入金額 - 累計出金額 - 累計振替出金額
   */
  principalAmountYen = 0;
  /**
   * 保有銘柄買付金額合計(円)
   * @description 現在保有している株式・投信の合計買付額(評価額ではない)
   */
  unfixedAmountYen = 0;
  /** 累計収益(円) */
  revenueAmountYen = 0;
  /**
   * 現金残高(円)
   * @description 現金残高 = 元本 + 累計収益 - 未決済
   */
  cashBalanceYen = 0;
  /**
   * 資産合計(円)
   * @description 資産合計 = 元本 + 累計収益
   */
  totalYen = 0;
}
