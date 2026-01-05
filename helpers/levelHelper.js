const User = require("../models/userModel");
const {giveBonus} = require("../helpers/bonusHelper");

// Helper → Downline সংখ্যা বের করা
async function getDownlineCount(userId) {
  let count = 0;
  const queue = [userId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const user = await User.findById(currentId).select("children");
    if (user && Array.isArray(user.children) && user.children.length > 0) {
      count += user.children.length;
      queue.push(...user.children);
    }
  }

  return count;
}

async function updateUserLevel(userId) {
  const user = await User.findById(userId);
  if (!user) return;

  const currentLevel = user.level || 0;

  // ----------------------
  // Part 1 → Level 1 to 5
  // ----------------------
  if (currentLevel < 17) {
    // level 0 থেকে 5 পর্যন্ত check করার জন্য dynamic rule
    const requiredChildLevel = currentLevel; // child-দের এই লেভেল থাকতে হবে
    const targetLevel = currentLevel + 1;    // পরবর্তী লেভেল

    if (Array.isArray(user.children) && user.children.length === 3) {
      const cnt = await User.countDocuments({
        _id: { $in: user.children },
        level: { $gte: requiredChildLevel }
      });

      if (cnt === 3) {
        user.level = targetLevel;

        // 🔒 referral lock apply
        if (targetLevel === 1) {
          user.referralLocked = true;
        }

        await user.save();

        // 🎁 Bonus Save
        await giveBonus(user._id, targetLevel);

        console.log(`${user.firstName} now ${user.level} level ✅`);

        // recursion for parent
        if (user.parentId) {
          await updateUserLevel(user.parentId);
        }
      }
    }
  }

  // ----------------------
  // Part 2 → Level 6 to 17
  // ----------------------
  // else if (currentLevel >= 5 && currentLevel < 17) {
  //   const downlineCount = await getDownlineCount(user._id);

  //   const levelTargets = {
  //     6: 729,
  //     7: 2187,
  //     8: 6561,
  //     9: 19683,
  //     10: 59049,
  //     11: 177147,
  //     12: 531441,
  //     13: 1594323,
  //     14: 4782969,
  //     15: 14348907,
  //     16: 43046721,
  //     17: 129140163
  //   };

  //   const nextLevel = currentLevel + 1;
  //   if (downlineCount >= levelTargets[nextLevel]) {
  //     user.level = nextLevel;
  //     await user.save();

  //     // 🎁 Bonus Save
  //     await giveBonus(user._id, nextLevel);

  //     console.log(`${user.firstName} এখন ${user.level} লেভেলে ✅`);

  //     if (user.parentId) {
  //       await updateUserLevel(user.parentId);
  //     }
  //   }
  // }
}

module.exports = { updateUserLevel };
