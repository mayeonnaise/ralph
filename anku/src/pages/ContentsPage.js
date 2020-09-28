import React, { useEffect, useState, useRef } from "react";
import ContentsPageStyles from "./ContentsPage.module.css";
import WebRTCClient from "../providers/WebRTCClient";
import { Blockchain, Block, buildLedgerMessage } from "../models/Blockchain";
import BlockchainMiner from "../providers/BlockchainMiner";
import { withRouter, useLocation } from "react-router-dom";
import Haiku from "../models/Haiku";
import Header from "../components/Header";
import LoadingPage from "./LoadingPage";

const ContentsPage = withRouter(({ history }) => {
  const client = useRef(null);
  const miner = useRef(null);
  const blockchain = useRef(null);
  const location = useLocation();
  const loading = useRef(null);

  const [haikus, setHaikus] = useState([]);
  const [haikuName, setHaikuName] = useState("");
  const [canSubmit, setCanSubmit] = useState(true);

  function refreshHaikus() {
    const newHaikus = {};
    blockchain.current.chain.forEach((block) => {
      const blockHaiku = block.payload;
      newHaikus[blockHaiku.id] =
        newHaikus[blockHaiku.id] === undefined ? {} : newHaikus[blockHaiku.id];
      newHaikus[blockHaiku.id][blockHaiku.lineno] = blockHaiku.line;
    });

    setHaikus(newHaikus);
  }

  function receiveBlockCallback(blockMsg) {
    miner.current.terminate();
    const block = Object.assign(new Block(), blockMsg);

    blockchain.current.appendBlock(block);
    haikus[block.id] = haikus[block.id] === undefined ? {} : haikus[block.id];
    haikus[block.id][block.lineno] = block.line;
    setHaikus(haikus);
  }

  function receiveLedgerCallback(blockchainMsg) {
    console.log(blockchainMsg);
    miner.current.terminate();

    const newChain = [];

    for (var block of blockchainMsg.chain) {
      const newBlock = Object.assign(new Block(), block);
      newChain.push(newBlock);
    }

    if (blockchain.current.chain.length < blockchainMsg.chain.length) {
      blockchain.current.chain = newChain;
      refreshHaikus();
    }
  }

  function onConnectCallback() {
    loading.current = false;
  }

  function mineNameSuccessCallback(block) {
    client.current.alertPeers(block);
    blockchain.current.appendBlock(block);

    const blockHaiku = block.payload;
    haikus[blockHaiku.id] =
      haikus[blockHaiku.id] === undefined ? {} : haikus[blockHaiku.id];
    haikus[blockHaiku.id][blockHaiku.lineno] = blockHaiku.line;

    setHaikus(haikus);
    setCanSubmit(true);
  }

  function mineNameTerminateCallback() {
    document.getElementById("submithaiku").disabled = false;
    setCanSubmit(true);
  }

  async function mineHaikuName() {
    setCanSubmit(false);
    const haikuLine = new Haiku(haikuName, -1, "");
    setHaikuName("");
    await miner.current.mine(
      haikuLine,
      mineNameSuccessCallback,
      mineNameTerminateCallback
    );
  }

  useEffect(() => {
    loading.current = true;
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
  }, []);

  useEffect(() => {
    refreshHaikus();
    if (Object.values(client.current.connectionsStatus).some((x) => x)) {
      loading.current = false;
    }
  }, [location, loading]);

  if (loading.current) {
    return <LoadingPage />;
  }

  return (
    <div className={ContentsPageStyles.main}>
      <Header />
      <div id="contents" className={ContentsPageStyles.contents}>
        <span className={ContentsPageStyles.contentsTitle}>Contents</span>
        <div className={ContentsPageStyles.contentsPage}>
          {Object.keys(haikus).map((haikuName) => {
            console.log(haikuName);
            return (
              <div className={ContentsPageStyles.haiku} key={haikuName}>
                <span>{haikuName}</span>
                <img
                  src="./images/ancient-scroll.svg"
                  className={ContentsPageStyles.haikuIcon}
                  onClick={() => history.push("/haiku/" + haikuName)}
                />
              </div>
            );
          })}
        </div>
        <div id="createhaiku" className={ContentsPageStyles.createHaiku}>
          <input
            className={ContentsPageStyles.haikuName}
            value={haikuName}
            onChange={(e) => setHaikuName(e.target.value)}
          ></input>
          {canSubmit ? (
            <div
              className={ContentsPageStyles.submitHaiku}
              onClick={mineHaikuName}
            >
              <span>Create Haiku</span>
              <img
                src="./images/feather-pen.svg"
                className={ContentsPageStyles.haikuQuill}
              />
            </div>
          ) : (
            <div></div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ContentsPage;
