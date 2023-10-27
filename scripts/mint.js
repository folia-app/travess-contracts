const { initContracts, correctPrice } = require("./utils");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  const { coordinates } = await initContracts();
  const num = 21;
  // for (i = 0; i < num; i++) {
  // const value = "0"
  await coordinates.adminMint(owner.address, num, { nonce: 521 });
  // }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
