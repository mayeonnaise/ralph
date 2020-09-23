class Blockchain {
    constructor(isGenesis) {
        this.chain = []
        this.currentBlock = null
        if (isGenesis) {
            this.genesis()
        }
    }

    appendBlock(block) {
        this.chain.push(block)
    }

    async newBlock(payload) {
        console.log(this.chain)
        const previousBlock = this.chain[this.chain.length - 1]
        const previousHash = await previousBlock.hash()
        var block = new Block(payload, previousHash)
        this.currentBlock = block
    }

    async mine(callback) {
        while (! (await this.currentBlock.verify())) {
            this.currentBlock.nonce += 1
        }
        console.log("mined")
        callback(this.currentBlock)
    }

    genesis() {
        const block = new Block("", new Uint8Array([0, 0, 0, 0]))
        this.chain.push(block)
    }
}

class Block {
    constructor(payload, previousHash) {
        this.timestamp = (new Date()).getTime()
        this.payload = payload
        this.nonce = Math.random() * 1000
        this.previousHash = previousHash
    }

    async verify() {
        const prefix = (await this.hash()).slice(0, 2)
        return prefix.every(v => v === 0)
    }

    async hash() {
        const msg = (new TextEncoder()).encode(JSON.stringify(this))
        const hashBuffer = await crypto.subtle.digest('SHA-256', msg)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray
    }
}

export {Block, Blockchain}
