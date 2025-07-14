const admins = process.env.ADMINS
  ? process.env.ADMINS.split(',').map(id => id.trim())
  : require('../data/admin.json'); // nếu dùng json

module.exports = function isAdmin(userId) {
  return admins.includes(userId.toString());
};
