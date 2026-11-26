"""
FundChain AI Fraud Detection Service - Training & Benchmark Dataset
Academic Third-Year Computer Engineering Project
"""

DATASET = [
    # --- LEGITIMATE CAMPAIGNS (label: 0) ---
    {
        "title": "Solar Powered Micro-Drip Irrigation for Vidarbha Farmers",
        "description": "Providing 50 marginal smallholder farmers with solar-powered micro-drip irrigation systems, reducing water waste by 65% and increasing crop yield for sustainable farming.",
        "goal": 3.5,
        "category": "Agriculture",
        "label": 0
    },
    {
        "title": "Community Non-GMO Certified Seed Bank Cooperative",
        "description": "Establishing a decentralized indigenous organic seed bank to protect crop biodiversity and provide affordable non-hybrid seeds to 120 rural farming families.",
        "goal": 2.0,
        "category": "Agriculture",
        "label": 0
    },
    {
        "title": "Emergency Solar Power & Clean Water for Primary Healthcare Center",
        "description": "Installing a 5kW solar hybrid inverter and UV water filtration system for a rural health sub-center delivering pediatric care and emergency childbirth services.",
        "goal": 4.0,
        "category": "Healthcare",
        "label": 0
    },
    {
        "title": "Open Source STEM & Robotics Laboratory for Zilla Parishad School",
        "description": "Equipping 200 underprivileged village students with 15 Raspberry Pi workstations, Arduino robotics kits, and offline digital science curriculum.",
        "goal": 2.5,
        "category": "Education",
        "label": 0
    },
    {
        "title": "Bio-Fertilizer Vermicompost Units for Women Farmers Self-Help Group",
        "description": "Constructing 30 commercial vermicompost production beds managed by a women-led agricultural self-help cooperative to replace toxic synthetic chemical fertilizers.",
        "goal": 1.8,
        "category": "Agriculture",
        "label": 0
    },
    {
        "title": "Community Mangrove Reforestation and Coastal Protection",
        "description": "Planting 15,000 native mangrove saplings along degraded coastal estuarine mudflats to prevent tidal erosion and restore fish breeding habitats.",
        "goal": 3.0,
        "category": "Environment",
        "label": 0
    },
    {
        "title": "Decentralized Cold Storage Chamber for Perishable Farm Harvests",
        "description": "Constructing a 10-metric-ton solar-powered cold storage unit to eliminate post-harvest tomato and onion distress sales by local farming collectives.",
        "goal": 5.0,
        "category": "Agriculture",
        "label": 0
    },
    {
        "title": "Pediatric Prosthetic Limbs and Physical Therapy Outreach",
        "description": "Designing, 3D printing, and fitting lightweight adjustable prosthetic limbs for 25 children with congenital limb differences from low-income households.",
        "goal": 3.2,
        "category": "Healthcare",
        "label": 0
    },
    {
        "title": "Rural Community Rainwater Harvesting and Borewell Groundwater Recharge",
        "description": "Constructing 8 percolation trenches and silt check dams across drought-prone village watersheds to recharge seasonal groundwater aquifers.",
        "goal": 2.8,
        "category": "Environment",
        "label": 0
    },
    {
        "title": "Vocational Weaving and Natural Dye Training for Artisans",
        "description": "Revitalizing traditional handloom weaving clusters by providing motorized pirn winders, non-toxic plant-based natural dyes, and digital commerce workshops.",
        "goal": 1.5,
        "category": "Community Development",
        "label": 0
    },

    # --- SUSPICIOUS & FRAUDULENT CAMPAIGNS (label: 1) ---
    {
        "title": "Guaranteed 1000% ROI Quantum Crypto AI Trading Robot Fast Cash",
        "description": "Send ETH now for guaranteed 100x instant returns! Our automated quantum secret trading algorithm doubles your cryptocurrency every 24 hours with zero risk!",
        "goal": 150.0,
        "category": "Technology",
        "label": 1
    },
    {
        "title": "Urgent Emergency Cash Needed Send Immediately No Questions Asked",
        "description": "I need lots of Ethereum right now fast send to my wallet urgently emergency secret reasons please send 50 ETH immediately no refund needed.",
        "goal": 50.0,
        "category": "Healthcare",
        "label": 1
    },
    {
        "title": "Miracle Secret Cancer Cure Elixir Unverified Universal Remedy",
        "description": "Secret natural herb discovered that cures all chronic diseases and cancer in 3 days! Big pharma does not want you to know this. Send money to unlock formula.",
        "goal": 80.0,
        "category": "Healthcare",
        "label": 1
    },
    {
        "title": "Free Airdrop 100x Token Pre-Sale Send ETH Get Double Back",
        "description": "Official Elon Musk Tesla Bitcoin Ethereum giveaway send 1 ETH to smart contract and get 2 ETH back immediately limited slots act now!",
        "goal": 200.0,
        "category": "Technology",
        "label": 1
    },
    {
        "title": "Help me buy a luxury supercar sports car for my birthday",
        "description": "I deserve a gold Ferrari supercar please donate 100 ETH to buy me a luxury vehicle so I can become a famous social media influencer.",
        "goal": 100.0,
        "category": "Community Development",
        "label": 1
    },
    {
        "title": "Exclusive VIP Crypto Signals Group Insider Pumping Scheme",
        "description": "Join our ultra secret pump and dump insider circle guaranteed millionaire profits within one week risk free investment send crypto to join.",
        "goal": 60.0,
        "category": "Technology",
        "label": 1
    },
    {
        "title": "Random generic test project give me your money",
        "description": "give money test test test pls send eth fast thanks.",
        "goal": 25.0,
        "category": "Other",
        "label": 1
    },
    {
        "title": "Risk Free High Yield Offshore Banking Arbitrage Platform",
        "description": "Deposit your crypto into our private offshore tax haven smart contract. Guaranteed 15% daily compound interest payout without KYC.",
        "goal": 90.0,
        "category": "Technology",
        "label": 1
    },
]
