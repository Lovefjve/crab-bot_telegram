const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/threads.json');
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, '{}');

function readData() {
  return JSON.parse(fs.readFileSync(dataPath));
}

function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

function getData(threadId) {
  const data = readData();
  if (!data[threadId]) {
    data[threadId] = { autosend: false };
    writeData(data);
  }
  return data[threadId];
}

function setData(threadId, newData) {
  const data = readData();
  data[threadId] = { ...getData(threadId), ...newData };
  writeData(data);
}

function toggleAutoSend(threadId, value) {
  const data = getData(threadId);
  data.autosend = value;
  setData(threadId, data);
}

function getAllEnabled() {
  const data = readData();
  return Object.entries(data)
    .filter(([_, v]) => v.autosend)
    .map(([id]) => id);
}

module.exports = {
  getData,
  setData,
  toggleAutoSend,
  getAllEnabled
};
