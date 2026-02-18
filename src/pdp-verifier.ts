import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  PossessionProven as PossessionProvenEvent,
  PiecesAdded as PiecesAddedEvent,
  PiecesRemoved as PiecesRemovedEvent,
  DataSetDeleted as DataSetDeletedEvent,
  NextProvingPeriod as NextProvingPeriodEvent,
} from "../generated/PDPVerifier/PDPVerifier";
import { Provider, DataSet } from "../generated/schema";
import { BIGINT_ONE, BIGINT_ZERO } from "./utils/constants";
import { DataSetStatus } from "./utils/types";
import { resetWindowIfExpired, updateStats, updateDatasetStats } from "./utils/statistics";

const LEAF_SIZE = BigInt.fromI32(32);

export function handlePossessionProven(event: PossessionProvenEvent): void {
  const setId = event.params.setId.toString();

  const dataSet = DataSet.load(setId);
  if (!dataSet) {
    log.warning("PossessionProven: DataSet {} not found", [setId]);
    return;
  }

  const provider = Provider.load(dataSet.provider);
  if (!provider) {
    log.warning("PossessionProven: Provider not found for DataSet {}", [setId]);
    return;
  }

  dataSet.provenPeriods = dataSet.provenPeriods.plus(BIGINT_ONE);
  dataSet.lastActiveAt = event.block.timestamp;
  updateDatasetStats(dataSet);
  dataSet.save();

  provider.provenPeriods = provider.provenPeriods.plus(BIGINT_ONE);
  resetWindowIfExpired(provider, event.block.number, event.block.timestamp);
  provider.recentProvenPeriods = provider.recentProvenPeriods.plus(BIGINT_ONE);
  provider.lastActiveAt = event.block.timestamp;
  updateStats(provider);
  provider.save();
}

export function handlePiecesAdded(event: PiecesAddedEvent): void {
  const setId = event.params.setId.toString();

  const dataSet = DataSet.load(setId);
  if (!dataSet) {
    log.warning("PiecesAdded: DataSet {} not found", [setId]);
    return;
  }

  const provider = Provider.load(dataSet.provider);
  if (!provider) {
    log.warning("PiecesAdded: Provider not found for DataSet {}", [setId]);
    return;
  }

  const count = BigInt.fromI32(event.params.pieceIds.length);

  dataSet.piecesAdded = dataSet.piecesAdded.plus(count);
  dataSet.activePieces = dataSet.activePieces.plus(count);
  dataSet.lastActiveAt = event.block.timestamp;
  dataSet.save();

  provider.piecesStored = provider.piecesStored.plus(count);
  provider.activePieces = provider.activePieces.plus(count);
  resetWindowIfExpired(provider, event.block.number, event.block.timestamp);
  provider.recentPiecesAdded = provider.recentPiecesAdded.plus(count);
  provider.lastActiveAt = event.block.timestamp;
  updateStats(provider);
  provider.save();
}

export function handlePiecesRemoved(event: PiecesRemovedEvent): void {
  const setId = event.params.setId.toString();

  const dataSet = DataSet.load(setId);
  if (!dataSet) {
    log.warning("PiecesRemoved: DataSet {} not found", [setId]);
    return;
  }

  const provider = Provider.load(dataSet.provider);
  if (!provider) {
    log.warning("PiecesRemoved: Provider not found for DataSet {}", [setId]);
    return;
  }

  const count = BigInt.fromI32(event.params.pieceIds.length);

  dataSet.piecesRemoved = dataSet.piecesRemoved.plus(count);
  if (dataSet.activePieces.gt(count)) {
    dataSet.activePieces = dataSet.activePieces.minus(count);
  } else {
    dataSet.activePieces = BIGINT_ZERO;
  }
  dataSet.lastActiveAt = event.block.timestamp;
  dataSet.save();

  provider.piecesDeleted = provider.piecesDeleted.plus(count);
  if (provider.activePieces.gt(count)) {
    provider.activePieces = provider.activePieces.minus(count);
  } else {
    provider.activePieces = BIGINT_ZERO;
  }
  resetWindowIfExpired(provider, event.block.number, event.block.timestamp);
  provider.recentPiecesDeleted = provider.recentPiecesDeleted.plus(count);
  provider.lastActiveAt = event.block.timestamp;
  updateStats(provider);
  provider.save();
}

export function handleDataSetDeleted(event: DataSetDeletedEvent): void {
  const setId = event.params.setId.toString();
  const deletedLeafCount = event.params.deletedLeafCount;

  const dataSet = DataSet.load(setId);
  if (!dataSet) {
    log.warning("DataSetDeleted: DataSet {} not found", [setId]);
    return;
  }

  const provider = Provider.load(dataSet.provider);
  if (!provider) {
    log.warning("DataSetDeleted: Provider not found for DataSet {}", [setId]);
    return;
  }

  dataSet.status = DataSetStatus.DELETED;
  dataSet.activePieces = BIGINT_ZERO;
  dataSet.lastActiveAt = event.block.timestamp;
  dataSet.save();

  provider.datasetsDeleted = provider.datasetsDeleted.plus(BIGINT_ONE);
  if (provider.activeDatasets.gt(BIGINT_ZERO)) {
    provider.activeDatasets = provider.activeDatasets.minus(BIGINT_ONE);
  }

  if (deletedLeafCount.gt(BIGINT_ZERO)) {
    provider.piecesDeleted = provider.piecesDeleted.plus(deletedLeafCount);
    if (provider.activePieces.gt(deletedLeafCount)) {
      provider.activePieces = provider.activePieces.minus(deletedLeafCount);
    } else {
      provider.activePieces = BIGINT_ZERO;
    }
  }

  resetWindowIfExpired(provider, event.block.number, event.block.timestamp);
  provider.recentDatasetsDeleted = provider.recentDatasetsDeleted.plus(BIGINT_ONE);
  if (deletedLeafCount.gt(BIGINT_ZERO)) {
    provider.recentPiecesDeleted = provider.recentPiecesDeleted.plus(deletedLeafCount);
  }

  provider.lastActiveAt = event.block.timestamp;
  updateStats(provider);
  provider.save();
}

/** Sets sizeInBytes from leafCount (each Merkle leaf = 32 bytes). */
export function handleNextProvingPeriod(event: NextProvingPeriodEvent): void {
  const setId = event.params.setId.toString();

  const dataSet = DataSet.load(setId);
  if (!dataSet) {
    log.warning("NextProvingPeriod: DataSet {} not found", [setId]);
    return;
  }

  const provider = Provider.load(dataSet.provider);
  if (!provider) {
    log.warning("NextProvingPeriod: Provider not found for DataSet {}", [setId]);
    return;
  }

  const newSize = event.params.leafCount.times(LEAF_SIZE);
  const oldSize = dataSet.sizeInBytes;

  dataSet.sizeInBytes = newSize;
  dataSet.lastActiveAt = event.block.timestamp;
  dataSet.save();

  if (newSize.gt(oldSize)) {
    provider.totalBytesStored = provider.totalBytesStored.plus(newSize.minus(oldSize));
  } else if (oldSize.gt(newSize)) {
    const decrease = oldSize.minus(newSize);
    if (provider.totalBytesStored.gt(decrease)) {
      provider.totalBytesStored = provider.totalBytesStored.minus(decrease);
    } else {
      provider.totalBytesStored = BIGINT_ZERO;
    }
  }

  updateStats(provider);
  provider.save();
}
