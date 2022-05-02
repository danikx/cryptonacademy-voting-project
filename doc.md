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
