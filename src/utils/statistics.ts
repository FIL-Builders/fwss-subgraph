import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Provider, DataSet } from "../../generated/schema";
import { getRecentWindowBigInt } from "../reliability/config";
import { BIGINT_ZERO, BIGDECIMAL_ZERO, BIGDECIMAL_ONE } from "./constants";

function calculateSuccessRate(successes: BigInt, failures: BigInt, defaultRate: BigDecimal): BigDecimal {
  const total = successes.plus(failures);
  if (total.gt(BIGINT_ZERO)) {
    return successes.divDecimal(total.toBigDecimal());
  }
  return defaultRate;
}

export function resetWindowIfExpired(provider: Provider, currentBlock: BigInt, currentTime: BigInt): void {
  const windowAge = currentTime.minus(provider.windowStartTime);

  if (windowAge.gt(getRecentWindowBigInt())) {
    provider.recentProvenPeriods = BIGINT_ZERO;
    provider.recentFaultedPeriods = BIGINT_ZERO;
    provider.recentPiecesAdded = BIGINT_ZERO;
    provider.recentPiecesDeleted = BIGINT_ZERO;
    provider.recentDatasetsCreated = BIGINT_ZERO;
    provider.recentDatasetsDeleted = BIGINT_ZERO;
    provider.windowStartBlock = currentBlock;
    provider.windowStartTime = currentTime;
    updateRecentStats(provider);
  }
}

export function updateStats(provider: Provider): void {
  if (provider.datasetsCreated.gt(BIGINT_ZERO)) {
    provider.avgDataSetSize = provider.totalBytesStored.divDecimal(provider.datasetsCreated.toBigDecimal());
    provider.avgPiecesPerDataset = provider.piecesStored.divDecimal(provider.datasetsCreated.toBigDecimal());
  } else {
    provider.avgDataSetSize = BIGDECIMAL_ZERO;
    provider.avgPiecesPerDataset = BIGDECIMAL_ZERO;
  }

  provider.provingReliability = calculateSuccessRate(provider.provenPeriods, provider.faultedPeriods, BIGDECIMAL_ONE);
  updateRecentStats(provider);
}

export function updateDatasetStats(dataSet: DataSet): void {
  dataSet.provingReliability = calculateSuccessRate(dataSet.provenPeriods, dataSet.faultedPeriods, BIGDECIMAL_ONE);
}

export function updateRecentStats(provider: Provider): void {
  provider.recentProvingReliability = calculateSuccessRate(
    provider.recentProvenPeriods, provider.recentFaultedPeriods, provider.provingReliability,
  );
}
