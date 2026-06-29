export interface OsProxySnapshot {
  readonly mode: 'unknown' | 'direct' | 'manual';
  readonly host?: string;
  readonly port?: number;
  readonly ownerInstallId?: string;
}

export interface OsProxyAdapter {
  read(): Promise<OsProxySnapshot> | OsProxySnapshot;
  apply?(next: OsProxySnapshot): Promise<void> | void;
  restore?(previous: OsProxySnapshot): Promise<void> | void;
}

export const noopOsProxyAdapter: OsProxyAdapter = {
  read() {
    return { mode: 'unknown' };
  },
};
