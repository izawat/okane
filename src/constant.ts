// tslint:disable: max-classes-per-file
/**
 * 取引の種類(株式、投資信託など。。)
 */
export class TradeType {
  /** 株式 */
  public static readonly STOCK = "株式";
  /** 投資信託 */
  public static readonly INVESTMENT_TRUST = "投資信託";
  /** 未知の取引種類（システム未対応） */
  public static readonly UNKNOWN = "未知の取引種類（システム未対応）";
}

/**
 * 取引方法(現物、口数買付、金額買付など。。)
 */
export class TradeMethod {
  /** (株式)現物 */
  public static readonly SPOTTRADING_STOCK = "現物";
  /** (投資信託)口数 */
  public static readonly INVESTMENT_TRUST_ITEMS_NUMBER = "投信口数";
  /** (投資信託)金額 */
  public static readonly INVESTMENT_TRUST_PRICE = "投信金額";
  /** 未知の取引方法（システム未対応） */
  public static readonly UNKNOWN = "未知の取引方法（システム未対応）";
}

/**
 * 売買方向（売りor買い）
 */
export class TradeDirection {
  /** 売り */
  public static readonly SELL = "売";
  /** 買い */
  public static readonly BUY = "買";
  /** 未知の売買方法（システム未対応） */
  public static readonly UNKNOWN = "未知の売買方法（システム未対応）";
}
