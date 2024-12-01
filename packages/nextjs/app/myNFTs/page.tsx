"use client";

import { useState } from "react";
import { MyHoldings } from "./_components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { addToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import nftsMetadata from "~~/utils/simpleNFT/nftsMetadata";

const MyNFTs: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const [ipfsUrl, setIpfsUrl] = useState("");

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  const { data: tokenIdCounter } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "tokenIdCounter",
    watch: true,
  });

  const handleMintItem = async () => {
    // circle back to the zero item if we've reached the end of the array
    if (tokenIdCounter === undefined) return;

    const tokenIdCounterNumber = Number(tokenIdCounter);
    const currentTokenMetaData = nftsMetadata[tokenIdCounterNumber % nftsMetadata.length];
    const notificationId = notification.loading("Uploading to IPFS");
    try {
      const uploadedItem = await addToIPFS(currentTokenMetaData);

      // First remove previous loading notification and then show success notification
      notification.remove(notificationId);
      notification.success("Metadata uploaded to IPFS");

      await writeContractAsync({
        functionName: "mintItem",
        args: [connectedAddress, uploadedItem.path],
      });
    } catch (error) {
      notification.remove(notificationId);
      console.error(error);
    }
  };

  // 新增：处理创建独立NFT的函数
  const handleCreateIndependentNFT = async () => {
    if (!ipfsUrl) {
      notification.error("Please enter IPFS URL");
      return;
    }

    try {
      const notificationId = notification.loading("Creating your NFT...");
      
      // 从IPFS URL中提取hash
      const ipfsHash = ipfsUrl.replace("https://ipfs.io/ipfs/", "").trim();
      
      await writeContractAsync({
        functionName: "createIndependentNFT",
        args: [ipfsHash],
      });

      notification.remove(notificationId);
      notification.success("NFT created successfully!");
      setIpfsUrl(""); // 清空输入框
    } catch (error) {
      console.error(error);
      notification.error("Failed to create NFT");
    }
  };

  return (
    <>
      <div className="flex items-center flex-col pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">My NFTs</span>
          </h1>
        </div>
      </div>
      {!isConnected || isConnecting ? (
        <div className="flex justify-center">
          <RainbowKitCustomConnectButton />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {/* 原有的Mint按钮 */}
          <button className="btn btn-secondary" onClick={handleMintItem}>
            Mint NFT
          </button>

          {/* 新增：创建独立NFT的表单 */}
          <div className="flex flex-col items-center gap-2 w-full max-w-md">
            <h2 className="text-lg font-bold">Create Your Own NFT</h2>
            <input
              type="text"
              placeholder="Enter IPFS URL (https://ipfs.io/ipfs/...)"
              value={ipfsUrl}
              onChange={(e) => setIpfsUrl(e.target.value)}
              className="input input-bordered w-full"
            />
            <button 
              className="btn btn-primary w-full"
              onClick={handleCreateIndependentNFT}
            >
              Create Independent NFT
            </button>
          </div>
        </div>
      )}
      <MyHoldings />
    </>
  );
};

export default MyNFTs;
