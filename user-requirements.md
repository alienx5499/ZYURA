## Assignment 2: User Stories & On-Chain Requirements (ZYURA)

### Part A: Initial User & Function Mapping

#### 1) Manual User Brainstorming
Based on my refined Value Proposition from Assignment 1 (flight-delay-only), I brainstormed a broad list of potential user types who might interact with ZYURA:

- Direct Users: travelers (business/leisure), corporate travel admins, travel planners
- Indirect Users/Beneficiaries: travel companions, employers (corporate travel), OTA/airline customers
- Administrators/Moderators: protocol admin (me), OTA/airline integration ops, community moderators
- Stakeholders: liquidity providers, governance participants, oracle providers (Switchboard), payment processors, audit firms, regulatory observers

Output: A comprehensive list of potential user types for ZYURA (flight-only).

#### 2) AI-Assisted User Prioritization (POC focus)
I prompted the AI with: "My project's value proposition is instant, fair, community-owned flight delay insurance on Solana. Here is my brainstormed list of potential user types (travel-only). Based on the value proposition, which 2-5 of these user types are the most critical to focus on for an initial Proof-of-Concept?"

AI Recommendations:
- Proposed POC-critical users (2-5):
  1) Travelers purchasing cover at checkout
  2) OTA/airline integration operators
  3) Liquidity providers (capital pool)
  4) Protocol admin (parameters, emergency controls)
- Rationale:
  - Travelers at checkout prove core value and conversion
  - OTA/airline ops validate distribution and data plumbing
  - LPs are required for capital formation and payout capacity
  - Admin is required for safe operation on testnet

My Analysis and Decision: I agreed with the AI. For the POC I will prioritize travelers, OTA/airline operators, LPs, and admin. Corporate travel programs remain secondary.

Final prioritized users: Traveler; OTA/airline operator; Liquidity provider; Protocol admin.

#### 3) Core Function Mapping (by prioritized user)
I prompted the AI: "For a project with this value proposition [flight-delay parametric cover] and focusing on these prioritized user types [traveler, OTA/airline operator, liquidity provider, protocol admin], help map out the key functions or interactions each user would need to perform."

AI Output and My Refinement:
- Traveler
  - View flight-delay products and coverage thresholds
  - Purchase/activate cover at checkout (select flight, pay premium)
  - View active policy (flight, window, cap)
  - Receive auto payout when delay threshold is verified
  - View payout history and receipts

- OTA/Airline Operator
  - Configure product placement and checkout flow
  - Pass flight identifiers and booking refs to on-chain policy creation
  - Monitor payout status and customer notifications

- Liquidity provider
  - Deposit USDC into risk pool
  - View pool metrics (utilization, losses, surplus)
  - Withdraw liquidity (subject to lockups)
  - Claim surplus distributions

- Protocol admin
  - Configure product parameters (threshold, premium rate, coverage cap)
  - Manage oracle feeds and freshness thresholds
  - Pause/resume product in emergencies
  - Upgrade program via governed process (testnet)

Output: Key functions mapped to prioritized users for ZYURA POC.

#### 4) Deriving Core POC Requirements
From the function map I created, I identified the top 2 most critical user stories essential for a POC:
1) Traveler purchases a flight-delay parametric cover at checkout and later receives instant payout upon an oracle-verified delay.
2) Liquidity provider deposits USDC into the pool and accrues surplus, with the system honoring payouts from the pool.

I prompted the AI: "Based on these top 2 critical user interactions [described above], what are the key technical requirements needed to build a proof-of-concept?"

AI Output and My Analysis:
Initial technical requirements derived:
- Product registry with flight-delay parameters (threshold minutes, coverage cap, premium rate, claim window)
- Policy creation storing traveler, flight identifier, coverage window, and premium paid
- Oracle pipeline (Switchboard) with multi-source reconciliation and freshness checks
- Payout instruction that transfers USDC to traveler and marks policy paid
- Risk pool accounts: vault, LP shares accounting, surplus ledger
- LP deposit/withdraw flows with share math
- Admin parameters and pause switch

### Part B: Adversarial Analysis & Granularity Check

#### 1) Critique & Refine User Stories / Requirements

I prompted the AI: "Review my core user functions/stories [from Part A, Step 3] and requirements [from Part A, Step 4]. Considering my project's refined value proposition [instant, fair, community-owned insurance on Solana with micro-insurance products and automated payouts], do these stories truly hit the mark? Are the requirements granular enough to map to specific technical components (e.g., database schemas, API endpoints, specific blockchain programs)? What's missing or unclear?"

AI Critique:
1. **Missing Critical User Stories**: The stories don't address what happens when a claim is disputed or when oracle data is unavailable. There's no story for policy expiration or renewal.
2. **Insufficient Granularity**: Requirements like "event verification pipeline" are too high-level. Need specific oracle integration patterns, data validation rules, and fallback mechanisms.
3. **Missing Edge Cases**: No stories for partial payouts, maximum payout caps, or what happens when the risk pool is underfunded.
4. **Unclear User Flows**: The SHG leader story mixes individual and group actions without clear separation of concerns.
5. **Missing Technical Dependencies**: No mention of USDC token program integration, account rent requirements, or transaction fee handling.

My Analysis and Refinements:
I agreed with most of the AI's critique. The stories were too optimistic and lacked important edge cases. I refined them as follows:

**Refined User Stories:**
- Split SHG leader functions into individual member management vs. group policy management
- Added explicit stories for claim disputes, oracle failures, and policy expiration
- Separated "view payout history" into distinct stories for different data views
- Added stories for emergency scenarios (pool underfunding, admin pause)

**Refined Technical Requirements:**
- Broke down "event verification pipeline" into specific oracle account validation, threshold checking, and dispute resolution mechanisms
- Added USDC token program integration requirements
- Specified account rent and transaction fee handling
- Added requirements for emergency pause and recovery procedures

Documentation: I documented the AI critique, my analysis, and the rationale for each refinement in my process log.

### Part C: Granularity & Clarity Refinement

#### 1) Final Manual Review & Refinement

I reviewed every user story and function from Part B through the following lens to simplify and clarify for technical implementation:

**De-Jargon Check:**
- Changed "oracle account updates" to "receive verified data from external sources"
- Replaced "LP shares accounting" with "track how much each person contributed to the pool"
- Simplified "parametric micro-cover" to "insurance that pays automatically when specific events happen"

**Granularity Check:**
- Split "User purchases and activates cover" into two separate stories: "User selects insurance product" and "User pays premium and activates coverage"
- Separated "Monitor group policies and payouts" into "View group policy status" and "View group payout history"

**Atomicity Check:**
- Broke down "Onboard members (link wallets, KYC attestations if required)" into:
  - "Add member wallet address to group"
  - "Verify member identity if required by group rules"
- Split "Configure product parameters" into individual parameter setting stories

**Clarity of Action Check:**
- Made "Receive auto payout upon event" more specific: "Receive USDC payment in wallet when covered event is verified"
- Clarified "View pool APY" as "See current annual percentage yield earned by the pool"

**No Overlap Check:**
- Merged duplicate "view payout history" stories into single comprehensive story
- Eliminated redundant "view active policy" and "view policy terms" by combining into one story

**Part C Refinement Log:**
- Before: "User purchases and activates cover" → After: Split into "User selects insurance product" and "User pays premium and activates coverage" (atomicity)
- Before: "oracle account updates" → After: "receive verified data from external sources" (de-jargon)
- Before: "Monitor group policies and payouts" → After: Split into "View group policy status" and "View group payout history" (granularity)
- Before: "Onboard members (link wallets, KYC attestations if required)" → After: Split into separate wallet addition and identity verification stories (atomicity)

### Part D: Defining Potential On-Chain Requirements

#### 1) Brainstorming On-Chain Requirements for Each User Story

I took my final, refined list of user stories from Part C and created a simple bulleted list of potential on-chain requirements needed to make each story happen:

**User Story: "User selects insurance product"**
- Potential On-Chain Requirements:
  - Need a product registry account that stores available insurance types
  - Each product must have a unique identifier and display parameters (coverage amount, premium rate, duration)
  - Product registry must be readable by any user without transaction fees

**User Story: "User pays premium and activates coverage"**
- Potential On-Chain Requirements:
  - Need a policy minting function that creates a new policy account
  - Policy account must store: policyholder address, product type, premium paid, coverage start/end times, coverage amount
  - Function must transfer USDC from user to risk pool vault
  - Function must fail if user doesn't have sufficient USDC balance
  - Function must fail if product is paused or discontinued

**User Story: "User receives USDC payment when covered event is verified"**
- Potential On-Chain Requirements:
  - Need an oracle verification function that checks external data against policy terms
  - Need a payout function that transfers USDC from risk pool to policyholder
  - Payout function must update policy state to prevent double-payouts
  - Payout function must fail if policy has expired or already been paid out
  - Payout function must fail if risk pool has insufficient funds

**User Story: "Liquidity provider deposits USDC into risk pool"**
- Potential On-Chain Requirements:
  - Need a risk pool vault account to hold USDC
  - Need a share tracking system to record each LP's contribution
  - Deposit function must calculate and mint LP shares based on current pool value
  - Function must handle the case where pool is empty (first deposit gets 1:1 shares)

**User Story: "Liquidity provider withdraws USDC from risk pool"**
- Potential On-Chain Requirements:
  - Need a withdrawal function that burns LP shares and transfers proportional USDC
  - Function must respect any lockup periods (e.g., 7-day minimum)
  - Function must fail if withdrawal would leave pool underfunded for active policies
  - Function must calculate current share value based on pool balance and total shares

**User Story: "Protocol admin pauses product in emergencies"**
- Potential On-Chain Requirements:
  - Need a pause flag stored in product registry or global program state
  - All policy creation functions must check pause status before proceeding
  - Pause function must be restricted to admin authority
  - Unpause function must also be admin-restricted

**User Story: "User views active policy details"**
- Potential On-Chain Requirements:
  - Policy account data must be readable without transaction fees
  - Need a way to query all policies owned by a specific address
  - Policy data must include current status (active, expired, paid out, disputed)

**User Story: "SHG leader creates group profile"**
- Potential On-Chain Requirements:
  - Need a group registry account that stores group information
  - Group account must store: group ID, leader address, member list, group policies
  - Group creation must be restricted to verified addresses (if KYC required)

**User Story: "SHG leader adds member wallet to group"**
- Potential On-Chain Requirements:
  - Need a function to update group member list
  - Function must verify that caller is the group leader
  - Function must validate that wallet address is valid Solana address
  - Group member list must have maximum size limit to prevent abuse

---

## Process Appendix

### Part A Process Documentation

#### Step 1: Manual User Brainstorming
**Process:** I conducted a comprehensive brainstorming session based on my refined Value Proposition from Assignment 1. I systematically categorized potential users into Direct Users, Indirect Users/Beneficiaries, Administrators/Moderators, and Stakeholders.

**Rationale:** This broad approach ensured I didn't miss any important user types that could impact the POC design. I considered both obvious users (gig workers) and less obvious ones (oracle providers, regulators) to create a complete picture.

#### Step 2: Target Market Identification
**AI Prompt Used:** "For this flight-delay value proposition, suggest 2-5 key target demographics or distribution channels."

**AI Output Analysis:** The AI suggested: (1) Frequent travelers, (2) Corporate travel programs, (3) OTAs/airline partners at checkout, (4) Crypto-native travelers and LPs. I agreed with these and prioritized OTAs/airlines and frequent travelers for POC distribution; corporate travel is secondary; crypto-native users serve as early adopters and liquidity bootstrap.

#### Step 3: Core Function Mapping
**AI Prompt Used:** "For a project with this value proposition [instant, fair, community-owned insurance on Solana] and focusing on these prioritized user types [gig worker policyholder, SHG leader, liquidity provider, protocol admin], help map out the key functions or interactions each user would need to perform."

**AI Output Analysis:** The AI provided a good foundation for user functions, but I refined some areas where the functions were too high-level or mixed different concerns.

**My Refinements:** I separated group management functions from individual policy functions for SHG leaders, and made the admin functions more specific to POC needs.

#### Step 4: Deriving Core POC Requirements
**AI Prompt Used:** "Based on these top 2 critical user interactions [policyholder purchases cover and receives payout; liquidity provider deposits and accrues surplus], what are the key technical requirements needed to build a proof-of-concept?"

**AI Output Analysis:** The AI provided a good high-level list of technical requirements, but they needed significant refinement in Part B to be specific enough for implementation.

### Part B Process Documentation

#### Adversarial AI Critique
**AI Prompt Used:** "Review my core user functions/stories [from Part A, Step 3] and requirements [from Part A, Step 4]. Considering my project's refined value proposition [instant, fair, community-owned insurance on Solana with micro-insurance products and automated payouts], do these stories truly hit the mark? Are the requirements granular enough to map to specific technical components (e.g., database schemas, API endpoints, specific blockchain programs)? What's missing or unclear?"

**AI Critique Analysis:** The AI identified 5 key issues: missing critical user stories (disputes, oracle failures), insufficient granularity, missing edge cases, unclear user flows, and missing technical dependencies. I agreed with all points and used them to significantly refine my approach.

**My Refinement Process:** I systematically addressed each critique point by adding missing stories, breaking down high-level requirements, adding edge cases, separating mixed concerns, and specifying technical dependencies.

### Part C Process Documentation

#### Manual Review Process
I systematically reviewed each user story through 5 lenses:

1. **De-Jargon Check:** I identified technical terms that non-technical stakeholders wouldn't understand and replaced them with plain language.

2. **Granularity Check:** I looked for stories that were too broad and split them into more specific, focused stories.

3. **Atomicity Check:** I identified stories that involved multiple distinct actions and separated them into individual stories.

4. **Clarity of Action Check:** I made sure each story clearly described what the user does and what outcome they expect.

5. **No Overlap Check:** I reviewed all stories to eliminate redundancy and merge similar stories.

**Refinement Log Rationale:**
- Split "User purchases and activates cover" for atomicity - these are two distinct actions that could fail independently
- De-jargoned "oracle account updates" to make it accessible to non-technical stakeholders
- Split "Monitor group policies and payouts" for granularity - monitoring and viewing are different functions
- Split "Onboard members" for atomicity - wallet addition and identity verification are separate processes

### Part D Process Documentation

#### On-Chain Requirements Brainstorming
**Process:** For each refined user story from Part C, I systematically thought through what on-chain components would be needed to make that story work.

**Approach:** I focused on the specific Solana program accounts, functions, and data structures that would be required, rather than high-level system requirements.

**Key Insights:**
- Each user story typically requires multiple on-chain components (accounts, functions, validation logic)
- Error handling and edge cases need to be built into the on-chain requirements from the start
- Account rent and transaction fee considerations are critical for Solana
- Authority and permission models must be explicitly defined for each function

**Rationale for Requirements Granularity:** I made the requirements specific enough that a developer could start implementing them immediately, while still keeping them at the "high-level" stage before detailed architectural design.

### Overall Process Reflection

**What Worked Well:**
- The AI-assisted prioritization helped me focus on the most critical users for POC
- The adversarial critique revealed important gaps I had missed
- The systematic refinement process in Part C created much clearer, more implementable user stories

**Challenges Encountered:**
- Initial user stories were too optimistic and missed important edge cases
- Technical requirements were initially too high-level to be actionable
- Balancing granularity with simplicity was challenging

**Key Learnings:**
- AI assistance is most valuable for critique and gap identification
- Manual refinement is essential for creating implementable requirements
- First-person perspective helps maintain ownership and clarity throughout the process

**Alignment with Assignment Goals:**
This process successfully created the direct link between user needs and on-chain logic required for Assignment 2, while maintaining the strategic foundation from Assignment 1. The refined user stories and on-chain requirements provide a solid foundation for the detailed architectural design in Assignment 3.
