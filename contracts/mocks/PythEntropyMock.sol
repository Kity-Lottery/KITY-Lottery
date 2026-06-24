// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Pulls Pyth's MockEntropy into the Hardhat compilation set so tests can deploy
// it via getContractFactory("MockEntropy"). Not used in production.
import "@pythnetwork/entropy-sdk-solidity/MockEntropy.sol";
