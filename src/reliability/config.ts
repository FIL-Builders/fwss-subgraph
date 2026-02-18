import { BigInt } from "@graphprotocol/graph-ts";

export const WINDOW_SECONDS = 604800; // 7 days

const RECENT_WINDOW_BIGINT: BigInt = BigInt.fromI32(WINDOW_SECONDS);

export function getRecentWindowBigInt(): BigInt {
  return RECENT_WINDOW_BIGINT;
}
