class BlockchainMiner {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.mining_status = true;
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

export { BlockchainMiner };
