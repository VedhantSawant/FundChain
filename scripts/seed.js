import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers } = hre;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("==================================================");
  console.log("  Seeding FundChain 3.0 Fresh Campaigns Suite");
  console.log("==================================================");

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
  const adminAccount = signers[0];             // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  const farmerAccount = signers[1];            // 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  const studentAccount = signers[2];           // 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  const donorAccount = signers[3] || signers[0]; // 0x90F79bf6EB2c4f870365E785982E1f101E93b906

  const crowdfunding = await ethers.getContractAt("Crowdfunding", contractAddress);

  const latestBlock = await ethers.provider.getBlock("latest");
  const now = latestBlock ? Number(latestBlock.timestamp) : Math.floor(Date.now() / 1000);
  const oneDay = 24 * 60 * 60;

  console.log(`Contract: ${contractAddress}`);
  console.log(`Block TS: ${now}`);
  console.log("--------------------------------------------------");

  // Campaign 1: 7-Day Goal-Met Escrow Demo Ready Campaign
  console.log("\n[1/8] Creating: Autonomous Crop Disease Drone & Soil Sensor Fleet (7d, Goal Met)...");
  await (
    await crowdfunding.connect(farmerAccount).createCampaignWithMilestones(
      "Autonomous Crop Disease Drone & Soil Sensor Fleet",
      "Deploying multispectral imaging drones and NPK IoT soil probes across 85 smallholder farms to detect fungal blight 10 days early and cut pesticide runoff by 45%.",
      ethers.parseEther("1.0"),
      now + oneDay * 7,
      "Agriculture",
      "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80",
      farmerAccount.address,
      [
        "Phase 1: Multispectral Drone & Calibration Kit",
        "Phase 2: 50 Soil NPK Sensors & Farmer Dashboard",
      ],
      [
        "Procurement of agricultural survey UAV with normalized difference vegetation index camera.",
        "Deployment of LoRaWAN soil moisture and NPK sensors across partner village farms.",
      ],
      [ethers.parseEther("0.5"), ethers.parseEther("0.5")]
    )
  ).wait();

  await (await crowdfunding.connect(studentAccount).contribute(1, { value: ethers.parseEther("0.7") })).wait();
  await (await crowdfunding.connect(donorAccount).contribute(1, { value: ethers.parseEther("0.5") })).wait();

  // Campaign 2: BharatAgri Weather Stations with Milestone Release + Governance Proposal
  console.log("\n[2/8] Creating: BharatAgri Precision Weather Station Network for 60 Villages...");
  await (
    await crowdfunding.connect(farmerAccount).createCampaignWithMilestones(
      "BharatAgri Precision Weather Station Network for 60 Villages",
      "Installing hyper-local automated weather stations delivering SMS frost warnings, rainfall telemetry, and irrigation scheduling to 3,200 rural farming families.",
      ethers.parseEther("1.5"),
      now + oneDay * 14,
      "Agriculture",
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      farmerAccount.address,
      [
        "Stage 1: Site Surveys & Mast Fabrication",
        "Stage 2: Anemometer & Rain Gauge Hardware",
        "Stage 3: Telemetry Server & Vernacular SMS Alerts",
      ],
      [
        "GPS mapping and galvanized mounting pole installation across 60 panchayat locations.",
        "Procurement of solar-powered rain gauges, humidity probes, and GSM gateways.",
        "Integration with automated regional language weather advisory engine.",
      ],
      [ethers.parseEther("0.5"), ethers.parseEther("0.6"), ethers.parseEther("0.4")]
    )
  ).wait();

  await (await crowdfunding.connect(studentAccount).contribute(2, { value: ethers.parseEther("0.8") })).wait();
  await (await crowdfunding.connect(donorAccount).contribute(2, { value: ethers.parseEther("0.7") })).wait();
  await (
    await crowdfunding
      .connect(farmerAccount)
      .submitMilestoneEvidence(2, 0, "https://ipfs.io/ipfs/QmWeatherMastSurveyProof2026")
  ).wait();
  await (await crowdfunding.connect(adminAccount).approveMilestone(2, 0)).wait();
  await (await crowdfunding.connect(farmerAccount).releaseMilestoneFunds(2, 0)).wait();

  await (
    await crowdfunding
      .connect(studentAccount)
      .createProposal(
        2,
        "Add Solar Lightning Surge Protectors to All 60 Masts",
        "Allocate contingency budget to equip every rural weather pole with Type-2 DC surge arrestors before monsoon storms.",
        7 * oneDay
      )
  ).wait();
  await (await crowdfunding.connect(donorAccount).voteOnProposal(1, true)).wait();

  // Campaign 3: Clean Biogas & Organic Vermicompost (7d, Below Goal - Refund Demo Ready)
  console.log("\n[3/8] Creating: Clean Biogas & Organic Vermicompost Cooperative...");
  await (
    await crowdfunding.connect(donorAccount).createCampaignWithMilestones(
      "Clean Biogas & Organic Vermicompost Cooperative",
      "Converting agricultural crop residue and dairy waste into clean cooking methane and nutrient-rich vermicompost to stop stubble burning across 18 villages.",
      ethers.parseEther("1.8"),
      now + oneDay * 7,
      "Environment",
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=80",
      donorAccount.address,
      [
        "Stage 1: Anaerobic Digester Dome Civil Works",
        "Stage 2: Gas Scrubbing & Community Distribution",
      ],
      [
        "Construction of 40-cubic-meter fixed-dome anaerobic biodigester unit.",
        "Installation of H2S scrubber filters and vermicompost packaging beds.",
      ],
      [ethers.parseEther("1.0"), ethers.parseEther("0.8")]
    )
  ).wait();

  await (await crowdfunding.connect(studentAccount).contribute(3, { value: ethers.parseEther("0.6") })).wait();

  // Campaign 4: Open-Source RISC-V Hardware Lab (Technology)
  console.log("\n[4/8] Creating: Open-Source RISC-V Hardware Lab for Engineering Students...");
  await (
    await crowdfunding.connect(studentAccount).createCampaignWithMilestones(
      "Open-Source RISC-V Hardware Lab for Engineering Students",
      "Building an accessible FPGA prototyping and embedded systems laboratory so third-year engineering students can design, synthesize, and benchmark open-source RISC-V processors.",
      ethers.parseEther("2.2"),
      now + oneDay * 21,
      "Technology",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
      studentAccount.address,
      [
        "Stage 1: FPGA Development Boards & Logic Analyzers",
        "Stage 2: Soldering Rework Stations & Bench Scopes",
        "Stage 3: Open Curriculum & Capstone Hackathon",
      ],
      [
        "Purchase of 15 Artix-7 FPGA kits and USB protocol analyzers.",
        "Setting up 8 ESD-safe hardware debugging benches with digital oscilloscopes.",
        "Publishing open Verilog lab manuals and hosting inter-college chip design demo day.",
      ],
      [ethers.parseEther("1.0"), ethers.parseEther("0.8"), ethers.parseEther("0.4")]
    )
  ).wait();

  await (await crowdfunding.connect(donorAccount).contribute(4, { value: ethers.parseEther("0.9") })).wait();
  await (await crowdfunding.connect(adminAccount).contribute(4, { value: ethers.parseEther("0.5") })).wait();

  // Campaign 5: Rural Maternal Tele-Ultrasound & Vaccine Hubs (Healthcare, Goal Met)
  console.log("\n[5/8] Creating: Rural Maternal Tele-Ultrasound & Cold-Chain Vaccine Hubs...");
  await (
    await crowdfunding.connect(donorAccount).createCampaignWithMilestones(
      "Rural Maternal Tele-Ultrasound & Cold-Chain Vaccine Hubs",
      "Equipping 6 community primary health centers with solar-backed medical cold-chain refrigerators and handheld tele-ultrasound probes linked to obstetric specialists.",
      ethers.parseEther("2.5"),
      now + oneDay * 30,
      "Healthcare",
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
      donorAccount.address,
      [
        "Stage 1: Solar Vaccine Cold-Chain Units",
        "Stage 2: Handheld Tele-Ultrasound Procurement",
        "Stage 3: Nurse Training & Specialist Roster Launch",
      ],
      [
        "WHO-PQS certified solar direct-drive vaccine refrigerators for 6 rural clinics.",
        "Portable wireless ultrasound transducers with encrypted tele-radiology sync.",
        "Clinical ultrasound screening certification for 18 community midwives.",
      ],
      [ethers.parseEther("1.0"), ethers.parseEther("1.0"), ethers.parseEther("0.5")]
    )
  ).wait();

  await (await crowdfunding.connect(farmerAccount).contribute(5, { value: ethers.parseEther("1.5") })).wait();
  await (await crowdfunding.connect(studentAccount).contribute(5, { value: ethers.parseEther("1.0") })).wait();

  // Campaign 6: Solar Microgrid & EV Charging Kiosk (Community Development, with Dispute)
  console.log("\n[6/8] Creating: Solar Microgrid & EV Charging Kiosk for Farm Cooperatives...");
  await (
    await crowdfunding.connect(farmerAccount).createCampaignWithMilestones(
      "Solar Microgrid & EV Charging Kiosk for Farm Cooperatives",
      "Establishing a 15kW community solar microgrid that powers cold storage crates and electric cargo trikes used to transport fresh produce to district markets.",
      ethers.parseEther("1.6"),
      now + oneDay * 10,
      "Community Development",
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=80",
      farmerAccount.address,
      [
        "Stage 1: 15kW Bifacial PV Array & LiFePO4 Bank",
        "Stage 2: Smart Metered EV Cargo Charging Bays",
      ],
      [
        "Mounting 15kW solar panels and 30kWh lithium-iron-phosphate battery storage.",
        "Installing 4 weatherproof DC charging ports with RFID cooperative billing.",
      ],
      [ethers.parseEther("1.0"), ethers.parseEther("0.6")]
    )
  ).wait();

  await (await crowdfunding.connect(donorAccount).contribute(6, { value: ethers.parseEther("0.9") })).wait();
  await (
    await crowdfunding
      .connect(donorAccount)
      .raiseDispute(
        6,
        1,
        "Vendor quotation for LiFePO4 battery cells changed specs from 30kWh to 20kWh without contributor vote.",
        "https://ipfs.io/ipfs/QmBatterySpecDiscrepancyEvidence2026"
      )
  ).wait();

  // Campaign 7: Regional Vernacular Coding & AI Literacy Bootcamps (Education)
  console.log("\n[7/8] Creating: Regional Vernacular Coding & AI Literacy Bootcamps...");
  await (
    await crowdfunding.connect(studentAccount).createCampaignWithMilestones(
      "Regional Vernacular Coding & AI Literacy Bootcamps",
      "Delivering hands-on Python, Web3, and practical AI literacy workshops in Marathi and Hindi for 400 first-generation college students across semi-urban towns.",
      ethers.parseEther("1.0"),
      now + oneDay * 12,
      "Education",
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
      studentAccount.address,
      [
        "Stage 1: Localized Video & Workbook Production",
        "Stage 2: 10 Town Workshops & Scholarship Stipends",
      ],
      [
        "Translating interactive coding exercises and deploying offline Linux lab USBs.",
        "Conducting weekend in-person mentorship cohorts across 10 district colleges.",
      ],
      [ethers.parseEther("0.4"), ethers.parseEther("0.6")]
    )
  ).wait();

  await (await crowdfunding.connect(farmerAccount).contribute(7, { value: ethers.parseEther("0.45") })).wait();
  await (await crowdfunding.connect(donorAccount).contribute(7, { value: ethers.parseEther("0.3") })).wait();

  // Campaign 8: AI-Powered Groundwater Arsenic Filtration Units (Environment)
  console.log("\n[8/8] Creating: AI-Powered Groundwater Arsenic Filtration Units...");
  await (
    await crowdfunding.connect(adminAccount).createCampaignWithMilestones(
      "AI-Powered Groundwater Arsenic Filtration Units",
      "Deploying IoT-monitored activated alumina and nano-iron community water filtration kiosks providing safe WHO-grade drinking water for 1,500 rural households.",
      ethers.parseEther("2.0"),
      now + oneDay * 18,
      "Environment",
      "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1200&q=80",
      adminAccount.address,
      [
        "Stage 1: Nano-Media Filtration Towers & UV Chambers",
        "Stage 2: Automated TDS/Turbidity Telemetry Sensors",
      ],
      [
        "Fabrication of 4 stainless steel dual-stage arsenic adsorption towers.",
        "Integrating real-time water purity sensors with public QR inspection logs.",
      ],
      [ethers.parseEther("1.2"), ethers.parseEther("0.8")]
    )
  ).wait();

  await (await crowdfunding.connect(farmerAccount).contribute(8, { value: ethers.parseEther("0.6") })).wait();
  await (await crowdfunding.connect(studentAccount).contribute(8, { value: ethers.parseEther("0.5") })).wait();

  console.log("\n==================================================");
  console.log("  FundChain 3.0 Fresh Seeding Completed!");
  console.log("==================================================");
  console.log("8 Fresh Campaigns Active:");
  console.log("  - #1 (7d, Goal Met 1.2/1.0 ETH): Ready for Expiry & Release Demo");
  console.log("  - #2 (14d, Milestone 1 Released, Governance Proposal Active)");
  console.log("  - #3 (7d, 0.6/1.8 ETH): Ready for Expiry & Refund Demo");
  console.log("  - #4, #5 (Goal Met 2.5/2.5 ETH), #6 (Active Dispute), #7, #8");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
