import React, { useEffect, useState, useRef } from "react";
import WebRTCClient from "../providers/WebRTCClient";
import HaikuPageStyles from "./HaikuPage.module.css";
import ContentsPageStyles from "./ContentsPage.module.css";
import { Blockchain, Block, buildLedgerMessage } from "../models/Blockchain";
import { useLocation } from "react-router-dom";
import BlockchainMiner from "../providers/BlockchainMiner";
import LoadingPage from "./LoadingPage";
import Haiku from "../models/Haiku";
import { useParams } from "react-router-dom";
import Header from "../components/Header";

function HaikuPage(props) {
  const { name } = useParams();
  const client = useRef(null);
  const miner = useRef(null);
  const blockchain = useRef(null);
  const location = useLocation();
  const loading = useRef(null);

  const [line, setLine] = useState("");
  const [lines, setLines] = useState([]);
  const [canSubmit, setCanSubmit] = useState(true);

  function refreshLines() {
    const lineNoPairs = [];
    for (let block of blockchain.current.chain) {
      if (block.payload.id === name) {
        lineNoPairs.push([block.payload.lineno, block.payload.line]);
      }
    }

    console.log(lineNoPairs);

    lineNoPairs.sort(function compare(kv1, kv2) {
      return kv1[0] - kv2[0];
    });

    var sortedLines = lineNoPairs.map((x) => {
      return x[1];
    });

    setLines(sortedLines);
  }

  function receiveBlockCallback(blockMsg) {
    miner.current.terminate();
    const block = Object.assign(new Block(), blockMsg);

    if (block.payload.id === name) {
      lines[block.payload.lineno] = block.payload.line;
    }
    setLines(lines);
  }

  function receiveLedgerCallback(blockchainMsg) {
    miner.current.terminate();
    const newChain = [];

    for (var block of blockchainMsg.chain) {
      const newBlock = Object.assign(new Block(), block);
      newChain.push(newBlock);
    }

    if (blockchain.current.chain.length < blockchainMsg.chain.length) {
      blockchain.current.chain = newChain;
      refreshLines();
    }
  }

  function onConnectCallback() {
    loading.current = false;
  }

  function mineSuccessCallback(block) {
    lines.push(block.line);
    client.current.alertPeers(block);
    blockchain.current.appendBlock(block);
    setLines(lines);
  }

  function mineTerminateCallback() {
    setCanSubmit(true);
  }

  async function mineHaikuLine() {
    let haikuLineNo = 0;
    setCanSubmit(false);
    for (let block of blockchain.current.chain) {
      haikuLineNo =
        block.payload.id === name
          ? block.payload.lineno > haikuLineNo
            ? block.payload.lineno
            : haikuLineNo
          : haikuLineNo;
    }
    const haikuLine = new Haiku(name, haikuLineNo + 1, line);
    await miner.current.mine(
      haikuLine,
      mineSuccessCallback,
      mineTerminateCallback
    );
  }

  useEffect(() => {
    blockchain.current = Blockchain.getInstance([]);
    client.current = WebRTCClient.getInstance(
      new Date().getTime(),
      buildLedgerMessage,
      onConnectCallback
    );

    client.current.parseBlockCallbacks.push(receiveBlockCallback);
    client.current.parseLedgerCallbacks.push(receiveLedgerCallback);
    miner.current = BlockchainMiner.getInstance(blockchain.current);

    if (Object.values(client.current.connectionsStatus).some((x) => x)) {
      loading.current = false;
    }
    refreshLines();
  }, []);

  useEffect(() => {
    if (Object.values(client.current.connectionsStatus).some((x) => x)) {
      loading.current = false;
    }
  }, [location]);

  if (loading.current) {
    return <LoadingPage />;
  }

  return (
    <div className={ContentsPageStyles.main}>
      <Header />
      <div className={HaikuPageStyles.haikuPage}>
        {lines.map((l) => {
          return <p key={l}>{l}</p>;
        })}
        {canSubmit && lines.length < 3 ? (
          <div className={HaikuPageStyles.submitLine}>
            <input
              className={HaikuPageStyles.line}
              value={line}
              onChange={(e) => setLine(e.target.value)}
            ></input>
            <div
              className={HaikuPageStyles.submitLineButton}
              onClick={mineHaikuLine}
            >
              <img
                src="../images/feather-pen.svg"
                className={HaikuPageStyles.submitLineQuill}
              />
            </div>
          </div>
        ) : (
          <div></div>
        )}
      </div>
    </div>
  );
}

export default HaikuPage;
