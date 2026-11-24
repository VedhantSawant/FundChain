import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers } = hre;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Seeding initial campaigns into FundChain...");

  // Load config
  const configPath = path.join(__dirname, "..", "frontend", "src", "blockchain", "config.js");
  let contractAddress;
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, "utf8");
    const match = content.match(/CONTRACT_ADDRESS = "(0x[a-fA-F0-9]{40})"/);
    if (match) contractAddress = match[1];
  }

  if (!contractAddress) {
    console.error("No contract address found. Please run deploy.js first.");
    process.exit(1);
  }

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const farmerAccount = signers[1] || deployer;
  const studentAccount = signers[2] || deployer;

  const crowdfunding = await ethers.getContractAt("Crowdfunding", contractAddress);

  const now = Math.floor(Date.now() / 1000);
  const oneDay = 24 * 60 * 60;

  const sampleCampaigns = [
    {
      signer: farmerAccount,
      title: "Solar-Powered Drip Irrigation for Small Farmers",
      description: "Inspired by BharatAgri's mission to empower rural farmers: raising funds to install high-efficiency micro-drip irrigation systems and solar pumps across 40 acres of drought-prone agricultural land.",
      goal: ethers.parseEther("1.5"),
      deadline: now + oneDay * 14,
      category: "Agriculture",
      imageUrl: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80"
    },
    {
      signer: farmerAccount,
      title: "High-Yield Certified Seeds & Bio-Fertilizer Bank",
      description: "Providing subsidized, certified non-GMO seeds and organic bio-fertilizers to 120 smallholder farmer families in rural Maharashtra ahead of the monsoon sowing season.",
      goal: ethers.parseEther("0.8"),
      deadline: now + oneDay * 21,
      category: "Agriculture",
      imageUrl: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=80"
    },
    {
      signer: studentAccount,
      title: "Smart Village Digital Classrooms & STEM Kits",
      description: "Equipping 5 government primary schools in underserved rural districts with solar-powered interactive tablets, projector kits, and foundational STEM learning materials.",
      goal: ethers.parseEther("2.0"),
      deadline: now + oneDay * 30,
      category: "Education",
      imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80"
    },
    {
      signer: deployer,
      title: "Mobile Primary Healthcare Clinic & Tele-Medicine Unit",
      description: "Funding a retrofitted electric van with diagnostic ultrasound, ECG, blood testing kits, and satellite telemedicine to serve 15 remote villages twice weekly.",
      goal: ethers.parseEther("3.5"),
      deadline: now + oneDay * 45,
      category: "Healthcare",
      imageUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80"
    },
    {
      signer: deployer,
      title: "Decentralized Community Rainwater Harvesting Reservoir",
      description: "Constructing a 500,000-litre percolation groundwater recharging tank to end drinking water scarcity for over 450 rural households before summer.",
      goal: ethers.parseEther("1.2"),
      deadline: now + oneDay * 10,
      category: "Community Development",
      imageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?auto=format&fit=crop&w=1200&q=80"
    }
  ];

  for (const c of sampleCampaigns) {
    console.log(`Creating campaign: "${c.title}" by ${c.signer.address}...`);
    const tx = await crowdfunding.connect(c.signer).createCampaign(
      c.title,
      c.description,
      c.goal,
      c.deadline,
      c.category,
      c.imageUrl
    );
    await tx.wait();
  }

  console.log("Seeding completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
