const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/users.json');
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, '{}');

function readData() {
  return JSON.parse(fs.readFileSync(dataPath));
}

function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

function getData(userId) {
  const data = readData();
  if (!data[userId]) {
    data[userId] = {
      money: 1000,
      exp: 0,
      autosend: false // trạng thái autosend cá nhân
    };
    writeData(data);
  }
  return data[userId];
}

function setData(userId, newData) {
  const data = readData();
  data[userId] = { ...getData(userId), ...newData };
  writeData(data);
}

function decreaseMoney(userId, amount) {
  const user = getData(userId);
  user.money = Math.max(0, user.money - amount);
  setData(userId, user);
}

function increaseMoney(userId, amount) {
  const user = getData(userId);
  user.money += amount;
  setData(userId, user);
}

function toggleAutoSend(userId, value) {
  const user = getData(userId);
  user.autosend = value;
  setData(userId, user);
}

function getAllUsersEnabled() {
  const data = readData();
  return Object.entries(data)
    .filter(([_, v]) => v.autosend)
    .map(([id]) => id);
}

module.exports = {
  getData,
  setData,
  decreaseMoney,
  increaseMoney,
  toggleAutoSend,
  getAllUsersEnabled
};
