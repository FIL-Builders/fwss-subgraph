import { log } from "@graphprotocol/graph-ts";
import {
  ProviderRegistered as ProviderRegisteredEvent,
  ProviderInfoUpdated as ProviderInfoUpdatedEvent,
  ProviderRemoved as ProviderRemovedEvent,
  ProductAdded as ProductAddedEvent,
  ProductUpdated as ProductUpdatedEvent,
  ProductRemoved as ProductRemovedEvent,
} from "../generated/ServiceProviderRegistry/ServiceProviderRegistry";
import { Provider, PDPOffering } from "../generated/schema";
import { PDP_PRODUCT_TYPE } from "./utils/constants";
import { getProviderInfo } from "./utils/contract-calls";
import { createOffering, decodeCapabilities, createProvider } from "./utils/entity";
import { ProviderStatus } from "./utils/types";

export function handleProviderRegistered(event: ProviderRegisteredEvent): void {
  const providerInfo = getProviderInfo(event.address, event.params.providerId);
  const provider = createProvider(
    event.params.providerId,
    event.params.serviceProvider,
    event.params.payee,
    event.block.timestamp,
    event.block.number,
  );
  provider.name = providerInfo.name;
  provider.description = providerInfo.description;
  provider.save();
}

export function handleProviderInfoUpdated(event: ProviderInfoUpdatedEvent): void {
  const providerInfo = getProviderInfo(event.address, event.params.providerId);
  const provider = Provider.load(providerInfo.serviceProvider);
  if (!provider) {
    log.warning("ProviderInfoUpdated: Provider {} not found", [providerInfo.serviceProvider.toHexString()]);
    return;
  }

  provider.name = providerInfo.name;
  provider.description = providerInfo.description;
  provider.lastActiveAt = event.block.timestamp;
  provider.save();
}

export function handleProviderRemoved(event: ProviderRemovedEvent): void {
  const providerInfo = getProviderInfo(event.address, event.params.providerId);
  const provider = Provider.load(providerInfo.serviceProvider);
  if (!provider) {
    log.warning("ProviderRemoved: Provider {} not found", [event.params.providerId.toString()]);
    return;
  }

  provider.status = ProviderStatus.REMOVED;
  provider.removedAt = event.block.number;
  provider.save();
}

export function handleProductAdded(event: ProductAddedEvent): void {
  createOffering(event);
}

export function handleProductUpdated(event: ProductUpdatedEvent): void {
  const productType = event.params.productType;
  if (productType != PDP_PRODUCT_TYPE) return;

  const offeringId = event.params.serviceProvider.toHex() + "-" + productType.toString();
  const offering = PDPOffering.load(offeringId);
  if (!offering) {
    log.warning("ProductUpdated: PDPOffering {} not found", [offeringId]);
    return;
  }

  decodeCapabilities(offering, event.params.capabilityKeys, event.params.capabilityValues);
  offering.isActive = true;
  offering.save();
}

export function handleProductRemoved(event: ProductRemovedEvent): void {
  const productType = event.params.productType;
  if (productType != PDP_PRODUCT_TYPE) return;

  const providerInfo = getProviderInfo(event.address, event.params.providerId);
  const offeringId = providerInfo.serviceProvider.toHex() + "-" + productType.toString();
  const offering = PDPOffering.load(offeringId);
  if (!offering) {
    log.warning("ProductRemoved: PDPOffering {} not found", [offeringId]);
    return;
  }

  offering.isActive = false;
  offering.save();
}
