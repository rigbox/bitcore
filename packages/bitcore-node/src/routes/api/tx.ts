import { SetCache } from '../middleware';
import { Router } from 'express';
import { CSP } from '../../types/namespaces/ChainStateProvider';
import { ChainStateProvider } from '../../providers/chain-state';
import logger from '../../logger';
import { CacheTimes } from '../middleware';
const router = Router({ mergeParams: true });

router.get('/', function(req, res) {
  let { chain, network } = req.params;
  let { blockHeight, blockHash, limit, since, direction, paging } = req.query;
  if (!chain || !network) {
    return res.status(400).send('Missing required param');
  }
  if (!blockHash && !blockHeight) {
    return res.status(400).send('Must provide blockHash or blockHeight');
  }
  chain = chain.toUpperCase();
  network = network.toLowerCase();
  let payload: CSP.StreamTransactionsParams = {
    chain,
    network,
    req,
    res,
    args: { limit, since, direction, paging }
  };

  if (blockHeight !== undefined) {
    payload.args.blockHeight = parseInt(blockHeight);
  }
  if (blockHash !== undefined) {
    payload.args.blockHash = blockHash;
  }
  return ChainStateProvider.streamTransactions(payload);
});

router.get('/:txId', async (req, res) => {
  let { chain, network, txId } = req.params;
  if (typeof txId !== 'string' || !chain || !network) {
    return res.status(400).send('Missing required param');
  }
  chain = chain.toUpperCase();
  network = network.toLowerCase();
  try {
    const tx = await ChainStateProvider.getTransaction({ chain, network, txId });
    if (!tx) {
      return res.status(404).send(`The requested txid ${txId} could not be found.`);
    } else {
      const tip = await ChainStateProvider.getLocalTip({ chain, network });
      if (tx && tip && tip.height - tx.blockHeight > 100) {
        SetCache(res, CacheTimes.Month);
      }
      return res.send(tx);
    }
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.get('/:txId/block/:blockHash', async (req, res) => {
  let { chain, network, txId, blockHash } = req.params;
  if (typeof txId !== 'string' || !chain || !network) {
    return res.status(400).send('Missing required param');
  }
  chain = chain.toUpperCase();
  network = network.toLowerCase();
  try {
    const tx = await ChainStateProvider.getRawTransaction({ chain, network, txId, blockHash });
    if (!tx) {
      return res.status(404).send(`The requested txid ${txId} could not be found.`);
    } else {
      const tip = await ChainStateProvider.getLocalTip({ chain, network });
      if (tx && tip && tip.height - tx.blockHeight > 100) {
        SetCache(res, CacheTimes.Month);
      }
      return res.send(tx);
    }
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.get('/:txId/authhead', async (req, res) => {
  let { chain, network, txId } = req.params;
  if (typeof txId !== 'string' || !chain || !network) {
    return res.status(400).send('Missing required param');
  }
  chain = chain.toUpperCase();
  network = network.toLowerCase();
  try {
    const authhead = await ChainStateProvider.getAuthhead({ chain, network, txId });
    if (!authhead) {
      return res.status(404).send(`Authhead for txid ${txId} could not be found.`);
    } else {
      return res.send(authhead);
    }
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.get('/:txid/coins', (req, res, next) => {
  let { chain, network, txid } = req.params;
  if (typeof txid !== 'string' || typeof chain !== 'string' || typeof network !== 'string') {
    res.status(400).send('Missing required param');
  } else {
    chain = chain.toUpperCase();
    network = network.toLowerCase();
    ChainStateProvider.getCoinsForTx({ chain, network, txid })
      .then(coins => {
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(JSON.stringify(coins));
      })
      .catch(next);
  }
});

router.get('/send/:rawTx', async function(req, res) {
  try {
    let { chain, network, rawTx } = req.params;
    //let { rawTx } = req.body;
    chain = chain.toUpperCase();
    network = network.toLowerCase();
    let txid = await ChainStateProvider.broadcastTransaction({
      chain,
      network,
      rawTx
    });
    return res.send({ txid });
  } catch (err) {
    logger.error(err);
    return res.status(500).send(err.message);
  }
});

module.exports = {
  router: router,
  path: '/tx'
};
