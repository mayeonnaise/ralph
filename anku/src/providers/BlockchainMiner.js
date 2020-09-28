export default class BlockchainMiner {
  static instance = null;

  constructor(blockchain) {
    this.blockchain = blockchain;
    this.mining_status = true;
  }

  static getInstance(blockchain) {
    if (this.instance === null) {
      this.instance = new BlockchainMiner(blockchain);
    }
    return this.instance;
  }

  async mine(value, successCallback, terminateCallback) {
    this.mining_status = true;
    await this.blockchain.newBlock(value);
    while (
      !(await this.blockchain.currentBlock.verify()) &&
      this.mining_status
    ) {
      this.blockchain.currentBlock.nonce += 1;
    }
    if (!this.mining_status) {
      terminateCallback();
      return;
    }
    console.log("mined");
    successCallback(this.blockchain.currentBlock);
  }

  terminate() {
    this.mining_status = false;
  }
}
