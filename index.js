
const CoordinatesABI = require("./contractMetadata/ABI-sepolia-Coordinates.json");
const Coordinates = require("./contractMetadata/homestead-Coordinates.json");
const CoordinatesSepolia = require("./contractMetadata/sepolia-Coordinates.json");

const MetadataABI = require("./contractMetadata/ABI-sepolia-Metadata.json");
const Metadata = require("./contractMetadata/homestead-Metadata.json");
const MetadataSepolia = require("./contractMetadata/sepolia-Metadata.json");

const { merkleAddresses } = require("./merkleAddresses.js");

module.exports = {
  merkleAddresses,
  Coordinates: {
    abi: CoordinatesABI.abi,
    networks: {
      '1': Coordinates,
      'homestead': Coordinates,
      'mainnet': Coordinates,
      '11155111': CoordinatesSepolia,
      'sepolia': CoordinatesSepolia,
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