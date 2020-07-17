import { Transaction } from "./transaction";
import { TradeType, TradeMethod, TradeDirection } from "./constant";

/**
 * 損益
 */
export class PL {
  /**
   * この損益に関わる買い取引
   */
  buys: Transaction[] = [];
  /**
   * この損益に関わる売り取引
   */
  sells: Transaction[] = [];
  /**
   * 銘柄
   */
  description: string;
  /**
   * 銘柄コード
   */
  code: string;
  /**
   * 取引種別
   */
  tradeType: TradeType;
  /**
   * 取引方法
   */
  tradeMethod: TradeMethod;
  /**
   * 売りから取引を始めたか？
   */
  isShortSelling = false;
  /**
   * 決済済み数量
   */
  fixedQuantity = 0.0;
  /**
   * 未決済（保持中）数量
   */
  unfixedQuantity = 0.0;
  /**
   * 買付金額合計
   */
  buyingAmountYen = 0.0;
  /**
   * 売却金額合計
   */
  sellingAmountYen = 0.0;
  /**
   * 未決済金額合計
   */
  unfixedAmountYen = 0.0;
  /**
   * 儲け金額(円)（損した場合は負の値となる）
   */
  profitYen: number | string = "";
  /**
   * 儲け率(％)（損した場合は負の値となる）
   */
  profitPercent: number | string = "";
  /**
   * 計算開始日
   */
  startDate: Date;
  /**
   * 計算終了日（未決済数量が0になる決済を行なった取引の約定日）
   */
  fixedDate: Date;

  /**
   * コンストラクタ
   * @param tran 取引
   */
  constructor(tran: Transaction) {
    if (tran.tradeDirection === TradeDirection.SELL) {
      // この損益は、売り取引からスタートして計算する
      this.isShortSelling = true;
      this.sells.push(tran);
      this.sellingAmountYen += tran.deliveryAmount;
    } else {
      // この損益は、買い取引からスタートして計算する
      this.buys.push(tran);
      this.buyingAmountYen += tran.deliveryAmount;
    }
    this.description = tran.description;
    this.code = tran.code;
    this.tradeType = tran.tradeType;
    this.tradeMethod = tran.tradeMethod;
    this.unfixedQuantity = tran.contractQuantity;
    this.unfixedAmountYen = tran.deliveryAmount;
    this.startDate = tran.contractDate;
  }

  /**
   * この損益に取引を追加し、取引内容を損益に反映する
   * @param tran 取引
   */
  public addTransaction(tran: Transaction): void {
    // 取引追加
    if (tran.tradeDirection === TradeDirection.SELL) {
      this.sells.push(tran);
      this.sellingAmountYen += tran.deliveryAmount;
    } else {
      this.buys.push(tran);
      this.buyingAmountYen += tran.deliveryAmount;
    }

    // 数量計算
    if (tran.isSettlementOrder(this)) {
      // 決済注文の取引を追加する場合、未決済数量、未決済金額を減算し、決済済み数量を加算
      this.fixedQuantity += tran.contractQuantity;
      this.unfixedQuantity -= tran.contractQuantity;
      this.unfixedAmountYen = this.calcUnfixAmountYen();
    } else {
      // 追加注文の取引を追加する場合、未決済数量、未決済金額を加算
      this.unfixedQuantity += tran.contractQuantity;
      this.unfixedAmountYen += tran.deliveryAmount;
    }

    // 確定処理
    if (this.isFixed()) {
      this.calc();
      this.fixedDate = tran.contractDate;
      this.unfixedAmountYen = 0.0;
    }
  }

  /**
   * この損益は確定したか？（未決済が残っていないか？）
   */
  public isFixed(): boolean {
    return this.unfixedQuantity === 0.0;
  }

  /**
   * 買付取引回数
   */
  public buyingCount(): number {
    return this.buys.length;
  }

  /**
   * 売却取引回数
   */
  public sellingCount(): number {
    return this.sells.length;
  }

  /**
   * この損益から、指定日時点の損益を作成して返す
   * @param targetDate 指定日
   */
  public getPLPointOfTime(targetDate: Date): PL {
    // この損益の計算開始日以前の日付を指定されたら、nullを返す
    if (this.startDate.getTime() > targetDate.getTime()) {
      return null;
    }
    let newPL: PL;
    // 指定日までの取引を抜き出す
    let trans: Transaction[] = [];
    if (this.isShortSelling) {
      newPL = new PL(this.sells[0]);
      trans = this.sells
        .filter(
          (tran, index) =>
            index > 0 && tran.contractDate.getTime() <= targetDate.getTime()
        )
        .concat(
          this.sells.filter(
            (tran) => tran.contractDate.getTime() <= targetDate.getTime()
          )
        );
    } else {
      newPL = new PL(this.buys[0]);
      trans = this.buys
        .filter(
          (tran, index) =>
            index > 0 && tran.contractDate.getTime() <= targetDate.getTime()
        )
        .concat(
          this.sells.filter(
            (tran) => tran.contractDate.getTime() <= targetDate.getTime()
          )
        );
    }
    // 約定日昇順ソート
    trans.sort((a, b) => (a.contractDate > b.contractDate ? 1 : -1));
    // 新しく作った損益に、指定日までの取引を追加していく
    trans.forEach((tran) => {
      newPL.addTransaction(tran);
    });
    return newPL;
  }

  /**
   * 損益確定処理
   */
  private calc() {
    // 損益計算(売却額-買付額)
    let profit = 0;
    this.buys.forEach((tran) => (profit -= tran.deliveryAmount));
    this.sells.forEach((tran) => (profit += tran.deliveryAmount));
    this.profitYen = profit;

    // 損益率(%)計算((1-(買付額/売却額))*100)
    this.profitPercent =
      (1 - this.buyingAmountYen / this.sellingAmountYen) * 100;
  }

  /**
   * 未決済金額(円)を計算する
   * @description 未決済金額 = 未決済数量 * 買付単価
   */
  private calcUnfixAmountYen(): number {
    let unfixAmountYen = 0;
    let calculatedCount = 0;
    this.buys.forEach((buyTran) => {
      for (let i = 0; i < buyTran.contractQuantity; i++) {
        // 未決済分に到達するまで、処理スキップ
        calculatedCount++;
        if (calculatedCount > this.fixedQuantity) {
          // 未決済分のため、未決済金額に追加
          unfixAmountYen += buyTran.unitPrice;
        }
      }
    });
    return unfixAmountYen;
  }
}
