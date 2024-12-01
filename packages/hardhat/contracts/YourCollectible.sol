// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2; //Do not change the solidity version as it negatively impacts submission grading

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
contract YourCollectible is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    Ownable,
    ReentrancyGuard
{
    using Counters for Counters.Counter;

    Counters.Counter public tokenIdCounter;

    // 新增：记录每个NFT是否是独立NFT
    mapping(uint256 => bool) public isIndependentNFT;
    // 新增：记录独立NFT的创建者
    mapping(uint256 => address) public nftCreator;

    constructor() ERC721("YourCollectible", "YCB") {}

    function _baseURI() internal pure override returns (string memory) {
        return "https://ipfs.io/ipfs/";
    }

    function mintItem(address to, string memory uri) public returns (uint256) {
        tokenIdCounter.increment();
        uint256 tokenId = tokenIdCounter.current();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }

    // 新增：用户自己铸造独立NFT的函数
    function createIndependentNFT(string memory uri) external returns (uint256) {
        tokenIdCounter.increment();
        uint256 tokenId = tokenIdCounter.current();
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        
        // 标记为独立NFT
        isIndependentNFT[tokenId] = true;
        nftCreator[tokenId] = msg.sender;
        
        return tokenId;
    }

    // Auction structure
    struct Auction {
        address seller;
        address highestBidder;
        uint256 highestBid;
        uint256 startingPrice; // New: starting price for the auction
        uint256 endTime;
        bool active;
    }

    // Mapping from token ID to auction details
    mapping(uint256 => Auction) public auctions;

    event AuctionCreated(uint256 indexed tokenId, uint256 startingPrice, uint256 endTime);
    event BidPlaced(uint256 indexed tokenId, address bidder, uint256 amount);
    event AuctionEnded(uint256 indexed tokenId, address winner, uint256 amount);

    // Function to create an auction for an NFT
    function createAuction(uint256 tokenId, uint256 duration, uint256 startingPrice) external {
        if (isIndependentNFT[tokenId]) {
            require(nftCreator[tokenId] == msg.sender, "Not the creator of this NFT");
        }
        require(ownerOf(tokenId) == msg.sender, "Not the owner of this NFT");
        require(auctions[tokenId].active == false, "Auction already active");
        require(startingPrice > 0, "Starting price must be greater than 0");

        _transfer(msg.sender, address(this), tokenId);

        auctions[tokenId] = Auction({
            seller: msg.sender,
            highestBidder: address(0),
            highestBid: 0,
            startingPrice: startingPrice,
            endTime: block.timestamp + duration,
            active: true
        });

        emit AuctionCreated(tokenId, startingPrice, block.timestamp + duration);
    }

    // Function to place a bid on an active auction
    function placeBid(uint256 tokenId) external payable nonReentrant {
        Auction storage auction = auctions[tokenId];
        require(auction.active, "Auction is not active");
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(msg.value > auction.highestBid && msg.value >= auction.startingPrice, "Bid must be higher than current highest bid and starting price");

        // Refund the previous highest bidder
        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;

        emit BidPlaced(tokenId, msg.sender, msg.value);
    }

    // Function to end an auction
    function endAuction(uint256 tokenId) external nonReentrant {
        Auction storage auction = auctions[tokenId];
        require(auction.active, "Auction is not active");
        require(auction.seller == msg.sender, "Only seller can end auction");

        auction.active = false;

        // 如果有人出价，按最高价成交
        if (auction.highestBidder != address(0)) {
            _transfer(address(this), auction.highestBidder, tokenId);
            payable(auction.seller).transfer(auction.highestBid);
        } else {
            // 如果没人出价，返还给卖家
            _transfer(address(this), auction.seller, tokenId);
        }

        emit AuctionEnded(tokenId, auction.highestBidder, auction.highestBid);
    }

    // 新增：获取用户创建的所有独立NFT
    function getIndependentNFTsByCreator(address creator) external view returns (uint256[] memory) {
        uint256 totalSupply = totalSupply();
        uint256[] memory temp = new uint256[](totalSupply);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= totalSupply; i++) {
            if (isIndependentNFT[i] && nftCreator[i] == creator) {
                temp[count] = i;
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        
        return result;
    }

    // 新增：获取所有活跃拍卖的函数
    function getActiveAuctions() external view returns (uint256[] memory) {
        uint256 totalSupply = totalSupply();
        uint256[] memory tempAuctions = new uint256[](totalSupply);
        uint256 activeCount = 0;
        
        // 遍历所有token，找出活跃的拍卖
        for (uint256 i = 1; i <= totalSupply; i++) {
            if (auctions[i].active) {
                tempAuctions[activeCount] = i;
                activeCount++;
            }
        }
        
        // 创建最终数组，只包含活跃拍卖
        uint256[] memory activeAuctions = new uint256[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            activeAuctions[i] = tempAuctions[i];
        }
        
        return activeAuctions;
    }

    // 新增：批量获取拍卖信息的函数
    function getAuctionsDetails(uint256[] calldata tokenIds) 
        external 
        view 
        returns (Auction[] memory) 
    {
        Auction[] memory auctionDetails = new Auction[](tokenIds.length);
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            auctionDetails[i] = auctions[tokenIds[i]];
        }
        
        return auctionDetails;
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 quantity
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, quantity);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

// 添加新的SingleNFT合约
contract SingleNFT is ERC721, ERC721URIStorage, ReentrancyGuard {
    address public creator;
    bool public isMinted;
    
    struct Auction {
        address seller;
        address highestBidder;
        uint256 highestBid;
        uint256 startingPrice;
        uint256 endTime;
        bool active;
    }
    
    Auction public auction;
    
    event AuctionCreated(uint256 startingPrice, uint256 endTime);
    event BidPlaced(address bidder, uint256 amount);
    event AuctionEnded(address winner, uint256 amount);

    constructor(
        string memory name,
        string memory symbol,
        address _creator
    ) ERC721(name, symbol) {
        creator = _creator;
    }

    function mint(string memory uri) external {
        require(msg.sender == creator, "Only creator can mint");
        require(!isMinted, "NFT already minted");
        
        _safeMint(creator, 0);
        _setTokenURI(0, uri);
        isMinted = true;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://ipfs.io/ipfs/";
    }

    function createAuction(uint256 duration, uint256 startingPrice) external {
        require(ownerOf(0) == msg.sender, "Not the owner");
        require(!auction.active, "Auction already active");
        require(startingPrice > 0, "Invalid starting price");

        _transfer(msg.sender, address(this), 0);

        auction = Auction({
            seller: msg.sender,
            highestBidder: address(0),
            highestBid: 0,
            startingPrice: startingPrice,
            endTime: block.timestamp + duration,
            active: true
        });

        emit AuctionCreated(startingPrice, block.timestamp + duration);
    }

    function placeBid() external payable nonReentrant {
        require(auction.active, "No active auction");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value > auction.highestBid && msg.value >= auction.startingPrice, 
                "Bid too low");

        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;

        emit BidPlaced(msg.sender, msg.value);
    }

    function endAuction() external nonReentrant {
        require(auction.active, "No active auction");
        require(block.timestamp >= auction.endTime, "Auction not ended");

        auction.active = false;

        if (auction.highestBidder != address(0)) {
            _transfer(address(this), auction.highestBidder, 0);
            payable(auction.seller).transfer(auction.highestBid);
        } else {
            _transfer(address(this), auction.seller, 0);
        }

        emit AuctionEnded(auction.highestBidder, auction.highestBid);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

// 添加新的NFT工厂合约
contract NFTFactory {
    event NFTCreated(address nftAddress, address creator);
    
    mapping(address => address[]) public creatorToNFTs;
    address[] public allNFTs;

    function createNFT(
        string memory name,
        string memory symbol,
        string memory tokenURI
    ) external returns (address) {
        SingleNFT nft = new SingleNFT(name, symbol, msg.sender);
        
        nft.mint(tokenURI);
        
        creatorToNFTs[msg.sender].push(address(nft));
        allNFTs.push(address(nft));
        
        emit NFTCreated(address(nft), msg.sender);
        return address(nft);
    }

    function getNFTsByCreator(address creator) external view returns (address[] memory) {
        return creatorToNFTs[creator];
    }

    function getAllNFTs() external view returns (address[] memory) {
        return allNFTs;
    }
}