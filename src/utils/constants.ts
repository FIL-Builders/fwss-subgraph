import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

// Import network-specific contract addresses from generated constants
export { ContractAddresses } from "../generated/constants";

export const BIGINT_ZERO = BigInt.zero();
export const BIGINT_ONE = BigInt.fromI32(1);
export const BIGDECIMAL_ZERO = BigDecimal.fromString("0");
export const BIGDECIMAL_ONE = BigDecimal.fromString("1");

// ProductType enum: only index PDP offerings (enum value 0)
export const PDP_PRODUCT_TYPE: i32 = 0;
