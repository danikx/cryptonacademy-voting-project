# Documentation


### How to send money. Option 1
```solidity
(bool success, ) = polls[pollName].wallet.call{value: fee}("");
require(success, "Failed to send Ether");
```

### How to send money. Option 2
```solidity
<address>.transfer(uint amount) // throw exception if fail
```

### How to send money. Option 3
```solidity
<address>.send(uint amount) // return true/false depending on success
```


### How to convert ethers
```solidity
{ value: ethers.utils.parseUnits("8999085173560582658028", "wei")}
```

### Gas
Gas Spent = Gas Used x Effective Gas Price
```javascript
it('owner can withdraw all ETH', async () => {
  // let's say contract has 5 ETH, owner has 10 ETH

  // 1. let's do a withdrawal
  const tx = await contract.connect(owner).withdrawAllETH()

  // 2. Let's calculate the gas spent
  const receipt = await tx.wait()
  const gasSpent = receipt.gasUsed.mul(receipt.effectiveGasPrice)

  // 3. Now we know, it is 15 ETH minus by gasSpent! 
  expect(await owner.getBalance()).to.eq(parseEther(15).sub(gasSpent))
})
```


This matcher ignores the fees of the transaction, but you can include them with the includeFee option:

```javascript
await expect(
  sender.sendTransaction({ to: receiver, value: 1000 })
).to.changeEtherBalance(sender, -22000, { includeFee: true });
```

###AnyValue

If you don't care about the value of one of the arguments, you can use the anyValue predicate:

```solidity
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

await expect(factory.create(9999))
  .to.emit(factory, "Created")
  .withArgs(anyValue, 9999);
```

###Predicate

Predicates are just function that return true if the value is correct, and return false if it isn't, so you can create your own predicates:

```solidity

function isEven(x: BigNumber): boolean {
  return x.mod(2).isZero();
}

await expect(token.transfer(100)).to.emit(token, "Transfer").withArgs(isEven);

```

