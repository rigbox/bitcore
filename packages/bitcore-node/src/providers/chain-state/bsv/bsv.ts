import { BTCStateProvider } from '../btc/btc';
import { CSP } from '../../../types/namespaces/ChainStateProvider';

export class BSVStateProvider extends BTCStateProvider {
  constructor(chain: string = 'BSV') {
    super(chain);
  }

  async getFee(params: CSP.GetEstimateSmartFeeParams) {
    const { chain, network, target } = params;
    return { feerate: await this.getRPC(chain, network).getBsvEstimateFee(target) };
  }
}
