const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const Voting = await hre.ethers.getContractFactory("Voting");
  const voter = await Voting.deploy();

  await voter.deployed();

  console.log("Smart contract deployed to address:", voter.address);

  saveFrontendFiles({
    Voting: voter
  })
}

function saveFrontendFiles(contracts) {
  const contractsDir = path.join(__dirname, '/..', 'front/contracts')

  if(!fs.existsSync(contractsDir)){
    fs.mkdirSync(contractsDir)
  }

  Object.entries(contracts).forEach( (contract_item) => {
    const [name, contract] = contract_item

    if(contract){
      fs.writeFileSync(
        path.join(contractsDir, '/', name + '-contract-address.json'),
        JSON.stringify({[name]: contract.address}, undefined, 2)
      )
    }

    const ContractArtifact = hre.artifacts.readArtifactSync(name)
    fs.writeFileSync(
      path.join(contractsDir, '/', name + ".json"),
      JSON.stringify(ContractArtifact, null, 2)
    )
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
