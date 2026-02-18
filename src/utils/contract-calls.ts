import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import { ServiceProviderRegistry } from "../../generated/ServiceProviderRegistry/ServiceProviderRegistry";
import { ProviderInfo } from "./types";

export function getProviderInfo(registryAddress: Address, providerId: BigInt): ProviderInfo {
  const registry = ServiceProviderRegistry.bind(registryAddress);
  const result = registry.try_getProvider(providerId);

  if (result.reverted) {
    log.warning("getProviderInfo reverted for providerId {}", [providerId.toString()]);
    return new ProviderInfo(Address.zero(), Address.zero(), "", "", false);
  }

  return new ProviderInfo(
    result.value.info.serviceProvider,
    result.value.info.payee,
    result.value.info.name,
    result.value.info.description,
    result.value.info.isActive,
  );
}
