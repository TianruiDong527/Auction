"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface Auction {
  seller: string;
  highestBidder: string;
  highestBid: bigint;
  startingPrice: bigint;
  endTime: bigint;
  active: boolean;
}

const AuctionPage: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const [queryTokenId, setQueryTokenId] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [createTokenId, setCreateTokenId] = useState("");
  const [duration, setDuration] = useState("");
  const [startingPrice, setStartingPrice] = useState("");

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  // 获取单个拍卖信息
  const { data: auctionData } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "auctions",
    args: queryTokenId ? [BigInt(queryTokenId)] : undefined,
    watch: true,
  });

  // 出价
  const handlePlaceBid = async () => {
    if (!queryTokenId || !bidAmount) {
      notification.error("Please enter token ID and bid amount");
      return;
    }

    try {
      const notificationId = notification.loading("Placing bid...");
      await writeContractAsync({
        functionName: "placeBid",
        args: [BigInt(queryTokenId)],
        value: BigInt(bidAmount),
      });
      notification.remove(notificationId);
      notification.success("Bid placed successfully!");
      setBidAmount("");
    } catch (error) {
      console.error(error);
      notification.error("Failed to place bid");
    }
  };

  // 结束拍卖
  const handleEndAuction = async () => {
    if (!queryTokenId) {
      notification.error("Please enter token ID");
      return;
    }

    try {
      const notificationId = notification.loading("Ending auction...");
      await writeContractAsync({
        functionName: "endAuction",
        args: [BigInt(queryTokenId)],
      });
      notification.remove(notificationId);
      notification.success("Auction ended successfully!");
    } catch (error) {
      console.error(error);
      notification.error("Failed to end auction");
    }
  };

  // 添加创建拍卖的函数
  const handleCreateAuction = async () => {
    if (!createTokenId || !duration || !startingPrice) {
      notification.error("Please fill all fields");
      return;
    }

    try {
      const notificationId = notification.loading("Creating auction...");
      await writeContractAsync({
        functionName: "createAuction",
        args: [
          BigInt(createTokenId),
          BigInt(Number(duration) * 3600), // 转换小时为秒
          BigInt(startingPrice),
        ],
      });
      notification.remove(notificationId);
      notification.success("Auction created successfully!");
      // 清空表单
      setCreateTokenId("");
      setDuration("");
      setStartingPrice("");
    } catch (error) {
      console.error(error);
      notification.error("Failed to create auction");
    }
  };

  // 新增：获取活跃拍卖列表
  const { data: activeAuctionIds } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getActiveAuctions",
    watch: true,
  });

  // 新增：获取拍卖详情
  const { data: auctionsDetails } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getAuctionsDetails",
    args: activeAuctionIds ? [activeAuctionIds] : undefined,
    watch: true,
  });

  return (
    <>
      <div className="flex items-center flex-col pt-10">
        <h1 className="text-center mb-8">
          <span className="block text-4xl font-bold">NFT Auction</span>
        </h1>
        
        {!isConnected || isConnecting ? (
          <div className="flex justify-center">
            <RainbowKitCustomConnectButton />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
            {/* 创建拍卖表单 */}
            <div className="card w-full bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Create Auction</h2>
                <input
                  type="number"
                  placeholder="Token ID"
                  value={createTokenId}
                  onChange={(e) => setCreateTokenId(e.target.value)}
                  className="input input-bordered w-full"
                />
                <input
                  type="number"
                  placeholder="Duration (hours)"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="input input-bordered w-full"
                />
                <input
                  type="number"
                  placeholder="Starting Price (wei)"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  className="input input-bordered w-full"
                />
                <button 
                  className="btn btn-primary w-full"
                  onClick={handleCreateAuction}
                >
                  Create Auction
                </button>
              </div>
            </div>

            {/* 查询拍卖信息 */}
            <div className="card w-full bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Query Auction</h2>
                <input
                  type="number"
                  placeholder="Enter Token ID"
                  value={queryTokenId}
                  onChange={(e) => setQueryTokenId(e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
            </div>

            {/* 新增：活跃拍卖列表 */}
            <div className="card w-full bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Active Auctions</h2>
                <div className="grid gap-4">
                  {auctionsDetails && activeAuctionIds && activeAuctionIds.map((tokenId, index) => (
                    <div key={tokenId.toString()} className="card bg-base-100 shadow-xl">
                      <div className="card-body">
                        <h3 className="card-title">Token #{tokenId.toString()}</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <p>Seller: {auctionsDetails[index].seller.slice(0, 6)}...{auctionsDetails[index].seller.slice(-4)}</p>
                          <p>Highest Bid: {auctionsDetails[index].highestBid.toString()} wei</p>
                          <p>Starting Price: {auctionsDetails[index].startingPrice.toString()} wei</p>
                          <p>Ends: {new Date(Number(auctionsDetails[index].endTime) * 1000).toLocaleString()}</p>
                          {auctionsDetails[index].highestBidder !== "0x0000000000000000000000000000000000000000" && (
                            <p>Highest Bidder: {auctionsDetails[index].highestBidder.slice(0, 6)}...{auctionsDetails[index].highestBidder.slice(-4)}</p>
                          )}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <input
                            type="number"
                            placeholder="Bid Amount (wei)"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="input input-bordered flex-1"
                          />
                          <button 
                            className="btn btn-secondary"
                            onClick={() => handlePlaceBid(tokenId)}
                          >
                            Place Bid
                          </button>
                          {auctionsDetails[index].seller === connectedAddress && (
                            <button 
                              className="btn btn-accent"
                              onClick={() => handleEndAuction(tokenId)}
                            >
                              End Auction
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!activeAuctionIds || activeAuctionIds.length === 0) && (
                    <p className="text-center text-gray-500">No active auctions</p>
                  )}
                </div>
              </div>
            </div>

            {/* 拍卖信息显示 */}
            {auctionData && (
              <div className="card w-full bg-base-200 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title flex justify-between">
                    <span>Token #{queryTokenId}</span>
                    <span className={`badge ${auctionData[5] ? 'badge-success' : 'badge-error'}`}>
                      {auctionData[5] ? 'Active' : 'Ended'}
                    </span>
                  </h2>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>Seller: {auctionData[0].slice(0, 6)}...{auctionData[0].slice(-4)}</p>
                    <p>Highest Bid: {auctionData[2].toString()} wei</p>
                    <p>Starting Price: {auctionData[3].toString()} wei</p>
                    <p>Ends: {new Date(Number(auctionData[4]) * 1000).toLocaleString()}</p>
                    {auctionData[1] !== "0x0000000000000000000000000000000000000000" && (
                      <p>Highest Bidder: {auctionData[1].slice(0, 6)}...{auctionData[1].slice(-4)}</p>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex flex-col gap-2 mt-4">
                    {auctionData[5] && (
                      <>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Bid Amount (wei)"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="input input-bordered flex-1"
                          />
                          <button 
                            className="btn btn-secondary"
                            onClick={handlePlaceBid}
                          >
                            Place Bid
                          </button>
                        </div>
                        {auctionData[0] === connectedAddress && (
                          <button 
                            className="btn btn-accent"
                            onClick={handleEndAuction}
                          >
                            End Auction
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default AuctionPage;