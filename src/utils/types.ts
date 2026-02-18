import { Address } from "@graphprotocol/graph-ts";

export class ProviderInfo {
  constructor(
    public serviceProvider: Address,
    public payee: Address,
    public name: string,
    public description: string,
    public isActive: boolean,
  ) {}
}

export class ProviderStatus {
  static readonly REGISTERED: string = "REGISTERED";
  static readonly APPROVED: string = "APPROVED";
  static readonly UNAPPROVED: string = "UNAPPROVED";
  static readonly REMOVED: string = "REMOVED";
}

export class DataSetStatus {
  static readonly ACTIVE: string = "ACTIVE";
  static readonly DELETED: string = "DELETED";
  static readonly TERMINATED: string = "TERMINATED";
}
