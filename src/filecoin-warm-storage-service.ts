import { log } from "@graphprotocol/graph-ts";
import {
  DataSetCreated as DataSetCreatedEvent,
  FaultRecord as FaultRecordEvent,
  ProviderApproved as ProviderApprovedEvent,
  ProviderUnapproved as ProviderUnapprovedEvent,
  ServiceTerminated as ServiceTerminatedEvent,
} from "../generated/FilecoinWarmStorageService/FilecoinWarmStorageService";
import { Provider, DataSet } from "../generated/schema";
import { BIGINT_ONE, ContractAddresses } from "./utils/constants";
import { getProviderInfo } from "./utils/contract-calls";
import { createDataset } from "./utils/entity";
import { DataSetStatus, ProviderStatus } from "./utils/types";
import { resetWindowIfExpired, updateStats, updateDatasetStats } from "./utils/statistics";

export function handleDataSetCreated(event: DataSetCreatedEvent): void {
  const provider = Provider.load(event.params.serviceProvider);
  if (!provider) {
    log.warning("DataSetCreated: Provider {} not found", [event.params.serviceProvider.toHex()]);
    return;
  }

  const dataSet = createDataset(
    event.params.dataSetId,
    provider,
    event.params.providerId,
    event.params.metadataKeys,
    event.params.metadataValues,
    event.block.timestamp,
    event.block.number,
  );
  dataSet.save();

  provider.datasetsCreated = provider.datasetsCreated.plus(BIGINT_ONE);
  provider.activeDatasets = provider.activeDatasets.plus(BIGINT_ONE);
  resetWindowIfExpired(provider, event.block.number, event.block.timestamp);
  provider.recentDatasetsCreated = provider.recentDatasetsCreated.plus(BIGINT_ONE);
  provider.lastActiveAt = event.block.timestamp;
  updateStats(provider);
  provider.save();
}

export function handleProviderApproved(event: ProviderApprovedEvent): void {
  const providerInfo = getProviderInfo(ContractAddresses.ServiceProviderRegistry, event.params.providerId);
  const provider = Provider.load(providerInfo.serviceProvider);
  if (!provider) {
    log.warning("ProviderApproved: Provider {} not found", [event.params.providerId.toString()]);
    return;
  }

  provider.status = ProviderStatus.APPROVED;
  provider.approvedAt = event.block.number;
  provider.lastActiveAt = event.block.timestamp;
  provider.save();
}

export function handleProviderUnapproved(event: ProviderUnapprovedEvent): void {
  const providerInfo = getProviderInfo(ContractAddresses.ServiceProviderRegistry, event.params.providerId);
  const provider = Provider.load(providerInfo.serviceProvider);
  if (!provider) {
    log.warning("ProviderUnapproved: Provider {} not found", [event.params.providerId.toString()]);
    return;
  }

  provider.status = ProviderStatus.UNAPPROVED;
  provider.lastActiveAt = event.block.timestamp;
  provider.save();
}

export function handleFaultRecord(event: FaultRecordEvent): void {
  const dataSetId = event.params.dataSetId.toString();
  const periodsFaulted = event.params.periodsFaulted;

  const dataSet = DataSet.load(dataSetId);
  if (!dataSet) {
    log.warning("FaultRecord: DataSet {} not found", [dataSetId]);
    return;
  }

  const provider = Provider.load(dataSet.provider);
  if (!provider) {
    log.warning("FaultRecord: Provider not found for DataSet {}", [dataSetId]);
    return;
  }

  dataSet.faultedPeriods = dataSet.faultedPeriods.plus(periodsFaulted);
  dataSet.lastActiveAt = event.block.timestamp;
  updateDatasetStats(dataSet);
  dataSet.save();

  provider.faultedPeriods = provider.faultedPeriods.plus(periodsFaulted);
  resetWindowIfExpired(provider, event.block.number, event.block.timestamp);
  provider.recentFaultedPeriods = provider.recentFaultedPeriods.plus(periodsFaulted);
  provider.lastActiveAt = event.block.timestamp;
  updateStats(provider);
  provider.save();

  log.warning("Fault recorded: provider={}, periods={}", [provider.id.toHex(), periodsFaulted.toString()]);
}

export function handleServiceTerminated(event: ServiceTerminatedEvent): void {
  const dataSetId = event.params.dataSetId.toString();

  const dataSet = DataSet.load(dataSetId);
  if (!dataSet) {
    log.warning("ServiceTerminated: DataSet {} not found", [dataSetId]);
    return;
  }

  const provider = Provider.load(dataSet.provider);
  if (!provider) {
    log.warning("ServiceTerminated: Provider not found for DataSet {}", [dataSetId]);
    return;
  }

  dataSet.status = DataSetStatus.TERMINATED;
  dataSet.lastActiveAt = event.block.timestamp;
  dataSet.save();

  provider.lastActiveAt = event.block.timestamp;
  updateStats(provider);
  provider.save();
}
