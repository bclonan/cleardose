export const MAX_CART_LINES = 100;
export const MAX_CART_UNITS_PER_LINE = 3;
export const MAX_CART_ITEM_COUNT = MAX_CART_LINES * MAX_CART_UNITS_PER_LINE;

export class CartLineLimitError extends RangeError {
  constructor(limit = MAX_CART_LINES) {
    super(`The local mock cart is limited to ${limit} distinct package lines. Remove a line before adding another package.`);
    this.name = "CartLineLimitError";
    this.code = "CART_LINE_LIMIT";
    this.retryable = true;
    this.recommendedTool = "cleardose_get_cart";
    this.details = Object.freeze({ limit });
  }
}
