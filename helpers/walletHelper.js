const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");

async function addTransaction(userId, type, amount, description) {
  // 1️⃣ Transaction Save
  await Transaction.create({ userId, type, amount, description });

  // 2️⃣ Wallet Update
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    if (!isNaN(bonus)){
        wallet = new Wallet({ userId, balance: 0 });
    }else {
        wallet.rewards.push({ item: bonus });
    }
  }

  if (type === "credit") {
    wallet.balance += amount;
  } else if (type === "debit") {
    wallet.balance -= amount;
  }

  await wallet.save();
  return wallet.balance;
}

module.exports = { addTransaction };
