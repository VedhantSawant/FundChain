import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers } = hre;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("==================================================");
  console.log("  Adding Additional Campaigns to FundChain 3.0");
  console.log("==================================================");

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
  const adminAccount = signers[0];
  const farmerAccount = signers[1];
  const studentAccount = signers[2];
  const donorAccount = signers[3] || signers[0];

  const crowdfunding = await ethers.getContractAt("Crowdfunding", contractAddress);

  const latestBlock = await ethers.provider.getBlock("latest");
  const now = latestBlock ? Number(latestBlock.timestamp) : Math.floor(Date.now() / 1000);
  const oneDay = 24 * 60 * 60;

  let nextId = Number(await crowdfunding.campaignCount()) + 1;
  console.log(`Current Campaign Count: ${nextId - 1}`);

  // Additional Campaign A: Solar Cold-Storage Pods (Agriculture, 7d, Goal Met)
  console.log(`\n[#${nextId}] Creating: Autonomous Solar Cold-Storage Pods for Farm Produce...`);
  await (
    await crowdfunding.connect(farmerAccount).createCampaignWithMilestones(
      "Autonomous Solar Cold-Storage Pods for Farm Produce",
      "Deploying zero-grid phase-change solar cold rooms at 4 village collection centers so tomato and leafy-vegetable growers cut post-harvest spoilage from 32% to under 5%.",
      ethers.parseEther("1.4"),
      now + oneDay * 7,
      "Agriculture",
      "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=1200&q=80",
      farmerAccount.address,
      [
        "Stage 1: Insulated PUF Chamber & Solar Panels",
        "Stage 2: Thermal Bank Commissioning & Sensor Logs",
      ],
      [
        "Fabrication of 5-ton modular insulated cold chamber and 3kW rooftop PV array.",
        "Thermal phase-change battery installation and temperature alert telemetry.",
      ],
      [ethers.parseEther("0.8"), ethers.parseEther("0.6")]
    )
  ).wait();
  await (await crowdfunding.connect(studentAccount).contribute(nextId, { value: ethers.parseEther("0.8") })).wait();
  await (await crowdfunding.connect(donorAccount).contribute(nextId, { value: ethers.parseEther("0.6") })).wait();
  nextId++;

  // Additional Campaign B: AI Braille Learning Tablets (Education)
  console.log(`\n[#${nextId}] Creating: Tactile Braille & Voice-AI Learning Tablets for Schools...`);
  await (
    await crowdfunding.connect(studentAccount).createCampaignWithMilestones(
      "Tactile Braille & Voice-AI Learning Tablets for Schools",
      "Funding 25 refreshable Braille e-reader slates with offline bilingual voice tutors for visually impaired students across 3 regional residential schools.",
      ethers.parseEther("1.2"),
      now + oneDay * 15,
      "Education",
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
      studentAccount.address,
      [
        "Stage 1: Tactile Braille Actuator Procurement",
        "Stage 2: Audio Curriculum Packaging & School Delivery",
      ],
      [
        "Ordering piezoelectric Braille cell modules and ruggedized aluminum enclosures.",
        "Preloading NCERT math/science audiobooks and conducting teacher orientation.",
      ],
      [ethers.parseEther("0.7"), ethers.parseEther("0.5")]
    )
  ).wait();
  await (await crowdfunding.connect(farmerAccount).contribute(nextId, { value: ethers.parseEther("0.5") })).wait();
  await (await crowdfunding.connect(donorAccount).contribute(nextId, { value: ethers.parseEther("0.4") })).wait();
  nextId++;

  // Additional Campaign C: 3D-Printed Myoelectric Prosthetics (Healthcare, Goal Met)
  console.log(`\n[#${nextId}] Creating: Low-Cost 3D-Printed Myoelectric Prosthetics Workshop...`);
  await (
    await crowdfunding.connect(donorAccount).createCampaignWithMilestones(
      "Low-Cost 3D-Printed Myoelectric Prosthetics Workshop",
      "Manufacturing lightweight EMG sensor-controlled bionic hands using medical-grade carbon-nylon 3D printers for agricultural workers injured in machinery accidents.",
      ethers.parseEther("1.8"),
      now + oneDay * 20,
      "Healthcare",
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80",
      donorAccount.address,
      [
        "Stage 1: High-Temp 3D Printers & EMG Sensor Kits",
        "Stage 2: Custom Socket Fitting & Rehab Clinic",
      ],
      [
        "Procurement of 3 enclosed carbon-fiber 3D printers and surface EMG electrodes.",
        "Clinical fitting and physical therapy sessions for 12 initial beneficiaries.",
      ],
      [ethers.parseEther("1.0"), ethers.parseEther("0.8")]
    )
  ).wait();
  await (await crowdfunding.connect(adminAccount).contribute(nextId, { value: ethers.parseEther("1.0") })).wait();
  await (await crowdfunding.connect(farmerAccount).contribute(nextId, { value: ethers.parseEther("0.8") })).wait();
  nextId++;

  // Additional Campaign D: Flood Early-Warning River Sensor Mesh (Community Development)
  console.log(`\n[#${nextId}] Creating: Community Flood Early-Warning River Sensor Mesh...`);
  await (
    await crowdfunding.connect(adminAccount).createCampaignWithMilestones(
      "Community Flood Early-Warning River Sensor Mesh",
      "Installing ultrasonic river-level gauges and solar siren towers along 12 monsoon tributaries to give downstream villages 4-hour advance flood evacuation alerts.",
      ethers.parseEther("1.5"),
      now + oneDay * 10,
      "Community Development",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
      adminAccount.address,
      [
        "Stage 1: Ultrasonic Water Gauges & Bridge Mounts",
        "Stage 2: Village Siren Towers & Disaster Drills",
      ],
      [
        "Installation of 12 waterproof ultrasonic depth sensors with LoRa repeaters.",
        "Deploying solar emergency sirens and community evacuation drills.",
      ],
      [ethers.parseEther("0.9"), ethers.parseEther("0.6")]
    )
  ).wait();
  await (await crowdfunding.connect(studentAccount).contribute(nextId, { value: ethers.parseEther("0.5") })).wait();
  await (await crowdfunding.connect(donorAccount).contribute(nextId, { value: ethers.parseEther("0.4") })).wait();

  const totalCount = Number(await crowdfunding.campaignCount());
  console.log("\n==================================================");
  console.log(`  Done! Total Active Campaigns On-Chain: ${totalCount}`);
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
