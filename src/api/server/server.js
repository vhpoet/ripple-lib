/* @flow */

'use strict';

const _ = require('lodash');
const common = require('../common');
import type {Remote} from '../../core/remote';

// If a ledger is not received in this time, consider the connection offline
const CONNECTION_TIMEOUT = 1000 * 30;

type GetServerInfoResponse = {
  buildVersion: string,
  completeLedgers: string,
  hostid: string,
  ioLatencyMs: number,
  load?: {
    jobTypes: Array<Object>,
    threads: number
  },
  lastClose: {
    convergeTimeS: number,
    proposers: number
  },
  loadFactor: number,
  peers: number,
  pubkeyNode: string,
  pubkeyValidator?: string,
  serverState: string,
  validatedLedger: {
    age: number,
    baseFeeXrp: number,
    hash: string,
    reserveBaseXrp: number,
    reserveIncXrp: number,
    seq: number
  },
  validationQuorum: number
}

function isUpToDate(remote: Remote): boolean {
  const server = remote.getServer();
  return Boolean(server) && (remote._stand_alone
    || (Date.now() - server._lastLedgerClose) <= CONNECTION_TIMEOUT);
}

function isConnected(): boolean {
  return Boolean(this.remote._ledger_current_index) && isUpToDate(this.remote);
}

function getServerInfoAsync(
  callback: (err: any, data?: GetServerInfoResponse) => void
): void {
  this.remote.requestServerInfo((error, response) => {
    if (error) {
      const message =
        _.get(error, ['remote', 'error_message'], error.message);
      callback(new common.errors.RippledNetworkError(message));
    } else {
      callback(null,
        common.convertKeysFromSnakeCaseToCamelCase(response.info));
    }
  });
}

function getFee(): number {
  return common.dropsToXrp(this.remote.createTransaction()._computeFee());
}

function getLedgerVersion(): number {
  return this.remote.getLedgerSequence();
}

function connect(): Promise<void> {
  return common.promisify(callback => {
    this.remote.connect(() => callback(null));
  })();
}

function disconnect(): Promise<void> {
  return common.promisify(callback => {
    this.remote.disconnect(() => callback(null));
  })();
}

function getServerInfo(): Promise<GetServerInfoResponse> {
  return common.promisify(getServerInfoAsync.bind(this))();
}

module.exports = {
  connect,
  disconnect,
  isConnected,
  getServerInfo,
  getFee,
  getLedgerVersion
};
