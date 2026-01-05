const User = require("../models/userModel");

// 🔁 Helper → Downline count বের করা
async function getDownlineCount(userId) {
  let count = 0;
  const queue = [userId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const user = await User.findById(currentId).select("children");
    if (user && user.children.length > 0) {
      count += user.children.length;
      queue.push(...user.children);
    }
  }

  return count;
}

module.exports = { getDownlineCount };