import { TradeType, TradeMethod, TradeDirection } from "./constant";
import { PL } from "./pl";

/**
 * 取引
 */
export class Transaction {
  /** 約定日 */
  contractDate: Date;
  /** 銘柄 */
  description: string;
  /** 銘柄コード */
  code: string;
  /** 市場 */
  market: string;
  /** 取引(種類) */
  tradeType: TradeType;
  /** 取引(方法) */
  tradeMethod: TradeMethod;
  /** 売買方向 */
  tradeDirection: TradeDirection;
  /** 期限 */
  expired: string;
  /** 預り */
  bankAccountType: string;
  /** 課税 */
  taxType: string;
  /** 約定数量 */
  contractQuantity: number;
  /** 約定単価 */
  contractUnitPrice: number;
  /** 手数料/諸経費等 */
  fee: number;
  /** 税額 */
  tax: number;
  /** 受渡日 */
  deliveryDate: Date;
  /** 受渡金額/決済損益 */
  deliveryAmount: number;
  /** １数量あたりの単価（手数料や税を込みにして計算） */
  unitPrice: number;
  /** 損益計算済み */
  isCalculatedPL: boolean;

  /**
   * 同じ取引銘柄かどうかを判定する
   * @param target 比較対象の取引
   */
  public isSameDescription(target: Transaction): boolean {
    // 取引種別チェック（同じ銘柄でも、取引種別が異なれば、違う銘柄として扱う）
    if (
      this.tradeType !== target.tradeType ||
      this.tradeMethod !== target.tradeMethod
    ) {
      return false;
    }

    // 銘柄コードがある場合はコードで比較し、銘柄コードがない場合は銘柄の名前で比較する
    if (this.code !== "") {
      return this.code === target.code;
    } else {
      return this.description === target.description;
    }
  }

  /**
   * この取引が指定された損益の決済注文にあたるかを判定する
   * @param pl 損益
   */
  public isSettlementOrder(pl: PL): boolean {
    if (pl.isShortSelling) {
      // 売り注文からスタートした場合、買い注文が決済注文になる
      return this.tradeDirection === TradeDirection.BUY;
    } else {
      // 買い注文からスタートした場合、売り注文が決済注文になる
      return this.tradeDirection === TradeDirection.SELL;
    }
  }
}
