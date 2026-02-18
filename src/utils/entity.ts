import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts";
import { Provider, DataSet, PDPOffering } from "../../generated/schema";
import { ProviderStatus, DataSetStatus } from "./types";
import { BIGINT_ZERO, BIGDECIMAL_ZERO, BIGDECIMAL_ONE, PDP_PRODUCT_TYPE } from "./constants";
import { ProductAdded as ProductAddedEvent } from "../../generated/ServiceProviderRegistry/ServiceProviderRegistry";

export function createProvider(
  providerId: BigInt,
  serviceProvider: Address,
  payee: Address,
  timestamp: BigInt,
  blockNumber: BigInt,
): Provider {
  const provider = new Provider(serviceProvider);
  provider.providerId = providerId;
  provider.serviceProvider = serviceProvider;
  provider.payee = payee;
  provider.name = "";
  provider.description = "";
  provider.status = ProviderStatus.REGISTERED;
  provider.registeredAt = blockNumber;
  provider.createdAt = timestamp;
  provider.lastActiveAt = timestamp;
  provider.datasetsCreated = BIGINT_ZERO;
  provider.datasetsDeleted = BIGINT_ZERO;
  provider.activeDatasets = BIGINT_ZERO;
  provider.totalBytesStored = BIGINT_ZERO;
  provider.piecesStored = BIGINT_ZERO;
  provider.piecesDeleted = BIGINT_ZERO;
  provider.activePieces = BIGINT_ZERO;
  provider.provenPeriods = BIGINT_ZERO;
  provider.faultedPeriods = BIGINT_ZERO;
  provider.avgDataSetSize = BIGDECIMAL_ZERO;
  provider.avgPiecesPerDataset = BIGDECIMAL_ZERO;
  provider.provingReliability = BIGDECIMAL_ONE;
  provider.recentProvenPeriods = BIGINT_ZERO;
  provider.recentFaultedPeriods = BIGINT_ZERO;
  provider.recentPiecesAdded = BIGINT_ZERO;
  provider.recentPiecesDeleted = BIGINT_ZERO;
  provider.recentDatasetsCreated = BIGINT_ZERO;
  provider.recentDatasetsDeleted = BIGINT_ZERO;
  provider.windowStartBlock = blockNumber;
  provider.windowStartTime = timestamp;
  provider.recentProvingReliability = BIGDECIMAL_ONE;

  return provider;
}

export function createDataset(
  dataSetId: BigInt,
  provider: Provider,
  providerId: BigInt,
  metadataKeys: string[],
  metadataValues: string[],
  timestamp: BigInt,
  blockNumber: BigInt,
): DataSet {
  const dataSet = new DataSet(dataSetId.toString());
  dataSet.provider = provider.id;
  dataSet.providerId = providerId;
  dataSet.status = DataSetStatus.ACTIVE;
  dataSet.createdAt = timestamp;
  dataSet.createdBlock = blockNumber;
  dataSet.lastActiveAt = timestamp;
  dataSet.metadataKeys = metadataKeys;
  dataSet.metadataValues = metadataValues;
  dataSet.piecesAdded = BIGINT_ZERO;
  dataSet.piecesRemoved = BIGINT_ZERO;
  dataSet.activePieces = BIGINT_ZERO;
  dataSet.sizeInBytes = BIGINT_ZERO;
  dataSet.provenPeriods = BIGINT_ZERO;
  dataSet.faultedPeriods = BIGINT_ZERO;
  dataSet.provingReliability = BIGDECIMAL_ONE;

  return dataSet;
}

/** Converts big-endian raw bytes to BigInt (graph-ts expects little-endian). */
function bytesToBigInt(value: Bytes): BigInt {
  if (value.length == 0) return BigInt.zero();
  let len = value.length;
  let reversed = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    reversed[i] = value[len - 1 - i];
  }
  return BigInt.fromUnsignedBytes(changetype<Bytes>(reversed));
}

function bytesToBoolean(value: Bytes): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value[i] != 0) return true;
  }
  return false;
}

/** Maps on-chain capability key/value pairs to typed PDPOffering fields. */
export function decodeCapabilities(offering: PDPOffering, keys: string[], values: Bytes[]): void {
  for (let i = 0; i < keys.length; i++) {
    if (i >= values.length) break;
    let key = keys[i];
    let value = values[i];

    if (key == "serviceURL") {
      offering.serviceURL = value.toString();
    } else if (key == "minPieceSizeInBytes") {
      offering.minPieceSize = bytesToBigInt(value);
    } else if (key == "maxPieceSizeInBytes") {
      offering.maxPieceSize = bytesToBigInt(value);
    } else if (key == "storagePricePerTibPerDay") {
      offering.pricePerTibDay = bytesToBigInt(value);
    } else if (key == "minProvingPeriodInEpochs") {
      offering.minProvingPeriod = bytesToBigInt(value);
    } else if (key == "location") {
      offering.location = value.toString();
    } else if (key == "paymentTokenAddress") {
      offering.paymentToken = value;
    } else if (key == "ipniPiece") {
      offering.ipniPiece = bytesToBoolean(value);
    } else if (key == "ipniIpfs") {
      offering.ipniIpfs = bytesToBoolean(value);
    } else if (key == "IPNIPeerID") {
      offering.ipniPeerId = value;
    } else if (key == "serviceStatus" || key == "service_status") {
      offering.serviceStatus = value.toString();
    } else if (key == "capacityTib" || key == "capacity_tib") {
      offering.capacityTib = value.toString();
    }
  }
}

export function createOffering(event: ProductAddedEvent): void {
  const productType = event.params.productType;
  if (productType != PDP_PRODUCT_TYPE) return;

  const serviceProvider = event.params.serviceProvider;
  const offeringId = serviceProvider.toHex() + "-" + productType.toString();
  const offering = new PDPOffering(offeringId);

  offering.productType = BigInt.fromI32(productType);
  offering.ipniPiece = false;
  offering.ipniIpfs = false;
  offering.isActive = true;

  decodeCapabilities(offering, event.params.capabilityKeys, event.params.capabilityValues);
  offering.save();

  const provider = Provider.load(serviceProvider);
  if (provider) {
    provider.pdpOffering = offering.id;
    provider.save();
  }
}
