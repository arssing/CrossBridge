//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./IERC20MintBurn.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract CrossBridge is AccessControl {
    
    event swapInitialized(address sender, uint amount, uint64 chainFrom, uint64 chainTo, uint nonce, string symbol);

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    mapping(bytes32 => bool) hashWasUsed;
    mapping(uint64 => bool) chainIds;
    mapping(string => address) addressBySymbol;
    mapping(address => uint) nonces;
    mapping(address => bool) validators;

    constructor() {
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    function swap(uint _amount, uint64 _chainFrom, uint64 _chainTo, string memory _symbol) public {
        require(chainIds[_chainFrom] && chainIds[_chainTo], "CrossBridge::swap:chainId not supported");
        require(addressBySymbol[_symbol] != address(0), "CrossBridge::swap:token not supported");
        require(IERC20MintBurn(addressBySymbol[_symbol]).allowance(msg.sender, address(this)) >= _amount, "CrossBridge::swap:insufficient allowance");

        bytes32 hashed = getMessageHash(msg.sender, _amount, _chainFrom, _chainTo, nonces[msg.sender], _symbol);
        require(hashWasUsed[hashed] != true, "CrossBridge::swap:hash was used");
        
        hashWasUsed[hashed] = true;
        nonces[msg.sender] += 1;

        IERC20MintBurn(addressBySymbol[_symbol]).burnFrom(msg.sender, _amount);
        emit swapInitialized(msg.sender, _amount, _chainFrom, _chainTo, nonces[msg.sender] - 1, _symbol);
    }

    function redeem(uint _amount, uint64 _chainFrom, uint64 _chainTo, uint _nonce, string memory _symbol, uint8 v, bytes32 r, bytes32 s) public {
        bytes32 hashed = getMessageHash(msg.sender, _amount, _chainFrom, _chainTo, _nonce, _symbol);
        require(hashWasUsed[hashed] != true, "CrossBridge::redeem:hash was used");

        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hashed));
        address addr = ecrecover(ethSignedMessageHash, v, r, s);

        require(validators[addr], "CrossBridge::redeem:signature not valid");
        hashWasUsed[hashed] = true;
        IERC20MintBurn(addressBySymbol[_symbol]).mint(msg.sender, _amount);
    }

    function getMessageHash(address _to, uint _amount, uint64 _chainFrom, uint64 _chainTo, uint _nonce, string memory _symbol) public pure returns(bytes32) {
        return keccak256(abi.encodePacked(_to, _amount, _chainFrom, _chainTo, _nonce, _symbol));
    }

    function updateChainById(uint64 _chainId) public {
        require(hasRole(ADMIN_ROLE, msg.sender), "CrossBridge::updateChainById:Caller is not an admin");

        if (chainIds[_chainId]) {
            delete chainIds[_chainId];
        } else {
            chainIds[_chainId] = true;
        }
    }

    function includeToken(string memory _symbol, address _ERC20Contract) public {
        require(hasRole(ADMIN_ROLE, msg.sender), "CrossBridge::includeToken:Caller is not an admin");
        addressBySymbol[_symbol] = _ERC20Contract;
    }

    function excludeToken(string memory _symbol) public {
        require(hasRole(ADMIN_ROLE, msg.sender), "CrossBridge::excludeToken:Caller is not an admin");
        delete addressBySymbol[_symbol];
    }

    function addValidator(address _newValidator) public {
        require(hasRole(ADMIN_ROLE, msg.sender), "CrossBridge::addValidator:Caller is not an admin");
        validators[_newValidator] = true;
    }
}
