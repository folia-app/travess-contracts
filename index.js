
const NFTABI = require("./contractMetadata/ABI-sepolia-NFT.json");
const NFT = require("./contractMetadata/sepolia-NFT.json"); // TODO: replace with mainnet
const NFTSepolia = require("./contractMetadata/sepolia-NFT.json");

const MetadataABI = require("./contractMetadata/ABI-sepolia-Metadata.json");
const Metadata = require("./contractMetadata/sepolia-Metadata.json"); // TODO: replace with mainnet
const MetadataSepolia = require("./contractMetadata/sepolia-Metadata.json");

const { merkleAddresses } = require("./merkleAddresses.js");

module.exports = {
  merkleAddresses,
  NFT: {
    abi: NFTABI.abi,
    networks: {
      '1': NFT,
      'homestead': NFT,
      'mainnet': NFT,
      '11155111': NFTSepolia,
      'sepolia': NFTSepolia,
    },
  },
  Metadata: {
    abi: MetadataABI.abi,
    networks: {
      '1': Metadata,
      'homestead': Metadata,
      'mainnet': Metadata,
      '11155111': MetadataSepolia,
      'sepolia': MetadataSepolia,
    },
  }
}