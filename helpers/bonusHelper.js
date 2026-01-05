// const mongoose = require("mongoose");
// const Bonus = require("../models/bonusModel");
// const Wallet = require("../models/walletModel");
// const BonusPlan = require("../models/bonusPlanModel");

// /**
//  * 🎁 giveBonus()
//  * Dynamically assign bonuses based on user level.
//  * Supports both numeric (cash) and string (gift/product) rewards.
//  */

// async function giveBonus(userId, level) {
//   try {
//     // // 🔹 Step 1: Level অনুযায়ী বোনাস লিস্ট (string বা number উভয়ই থাকতে পারে)
//     // const bonusAmounts = {
//     //   1: "Mobile Recharge",
//     //   2: 0,
//     //   3: 100,               // 💰 100 টাকা বোনাস
//     //   4: 0,
//     //   5: 1000,
//     //   6: 0,
//     //   7: "Dinar-Set",               // 💰 300 টাকা বোনাস
//     //   8: 0,
//     //   9: "Smart-Phone",
//     //   10: 0,
//     //   11: "Motor-Bike",
//     //   12: 0,
//     //   13: "Tour",
//     //   14: 0,
//     //   15: "Car",
//     //   16: 0,
//     //   17: "Flat",
//     // };

//     // const reward = bonusAmounts[level];

//     // if (!reward || reward === 0) {
//     //   console.log(`❌ Level ${level} not found in bonus configuration.`);
//     //   return;
//     // }

//     // // reward টাইপ নির্ধারণ (cash/gift/product)
//     // const rewardType =
//     //   typeof reward === "number" ? "cash" : "product";







//     const plan = await BonusPlan.findOne({ level });

//     if (!plan) {
//       console.log(`❌ Level ${level} not found in bonus plans.`);
//       return;
//     }

//     const { bonusAmount, rewardType } = plan;

//     if (!bonusAmount || bonusAmount === 0) {
//       console.log(`❌ Level ${level} has no bonus.`);
//       return;
//     }

//     // 🔹Transaction শুরু
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       // ✅ Bonus রেকর্ড তৈরি
//       const bonus = new Bonus({
//         userId: userId,
//         level: level,
//         bonusAmount: bonusAmount,
//         rewardType: rewardType,
//         status: "pending",
//         note: `Auto bonus added for level ${level}`,
//       });

//       await bonus.save({ session });

//       // ✅ Wallet রেকর্ড খোঁজা / তৈরি
//       let wallet = await Wallet.findOne({ userId }).session(session);
//       if (!wallet) {
//         wallet = new Wallet({
//           userId,
//           balance: 0,
//           rewards: [],
//         });
//       }

//       // ✅ যদি বোনাস টাকা হয় → ব্যালেন্সে যোগ হবে
//       if (typeof reward === "number") {
//         wallet.cashBalance = (wallet.cashBalance || 0) + reward;
//         wallet.rewards.push({
//           item: `Cash Bonus ${reward}৳`,
//           date: new Date(),
//         });
//       } else {
//         // ✅ যদি বোনাস আইটেম হয় → rewards লিস্টে যোগ হবে
//         wallet.rewards.push({
//           item: reward,
//           date: new Date(),
//         });
//       }

//       await wallet.save({ session });

//       // ✅ Transaction Commit
//       await session.commitTransaction();
//       session.endSession();

//       console.log(
//         `🎁 Bonus Given → User: ${userId} | Level: ${level} | Reward: ${reward}`
//       );
//     } catch (err) {
//       await session.abortTransaction();
//       console.error("❌ Bonus transaction failed:", err.message);
//     } finally {
//       session.endSession();
//     }
//   } catch (error) {
//     console.error(`❌ giveBonus error for user ${userId}:`, error.message);
//   }
// }

// module.exports = { giveBonus };













const mongoose = require("mongoose");
const Bonus = require("../models/bonusModel");
const Wallet = require("../models/walletModel");
const BonusPlan = require("../models/bonusPlanModel");

/**
 * 🎁 giveBonus()
 * Automatically assigns a bonus to a user based on their level.
 * Supports both numeric (cash) and string (gift/product) rewards.
 */

async function giveBonus(userId, level) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 🔹 1️⃣ Find Bonus Plan for the Level
    const plan = await BonusPlan.findOne({ level, status: "active" }).session(session);

    if (!plan) {
      console.log(`❌ No active bonus plan found for Level ${level}`);
      await session.abortTransaction();
      return;
    }

    const { bonusAmount, costValue, rewardType } = plan;

    if (!bonusAmount) {
      console.log(`❌ Bonus amount missing for Level ${level}`);
      await session.abortTransaction();
      return;
    }

    // 🔹 2️⃣ Create Bonus Record
    const bonus = await Bonus.create(
      [
        {
          userId: userId,
          level: level,
          bonusAmount: bonusAmount,
          rewardType: rewardType,
          costValue: costValue,
          status: "pending",
          note: `Bonus assigned for level ${level}`,
        },
      ],
      { session }
    );

    // // 🔹 3️⃣ Get or Create Wallet
    // let wallet = await Wallet.findOne({ userId }).session(session);
    // if (!wallet) {
    //   wallet = await Wallet.create([{ userId, cashBalance: 0, rewards: [] }], { session });
    //   wallet = wallet[0]; // because create() returns array when using session
    // }

    // // 🔹 4️⃣ Apply Bonus to Wallet
    // if (rewardType === "cash" && typeof bonusAmount === "number") {
    //   wallet.cashBalance = (wallet.cashBalance || 0) + bonusAmount;
    //   wallet.rewards.push({
    //     item: `Cash Bonus ৳${bonusAmount}`,
    //     date: new Date(),
    //   });
    // } else {
    //   // Product / Other Reward
    //   wallet.rewards.push({
    //     item: typeof bonusAmount === "string" ? bonusAmount : `Reward for Level ${level}`,
    //     date: new Date(),
    //   });
    // }

    // await wallet.save({ session });

    // 🔹 5️⃣ Commit Transaction
    await session.commitTransaction();
    console.log(`✅ Bonus given → User: ${userId} | Level: ${level} | Reward: ${bonusAmount}`);
  } catch (error) {
    await session.abortTransaction();
    console.error(`❌ giveBonus() failed for user ${userId}:`, error.message);
  } finally {
    session.endSession();
  }
}

module.exports = { giveBonus };
