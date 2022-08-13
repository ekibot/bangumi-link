/* eslint-disable no-console */
const fs = require('fs');

console.log('checking map');
for (const p of fs.readdirSync('./data/map/')) {
  for (const pp of fs.readdirSync(`./data/map/${p}/`)) {
    /** @type { SubjectRelateMap } */
    const map = JSON.parse(fs.readFileSync(`./data/map/${p}/${pp}`));
    for (const node of map.node) {
      const nodePath = `./data/node/${Math.floor(node.id / 1000)}/${node.id}`;
      if (!fs.existsSync(nodePath)) {
        console.log(`node(${node.id}->null, expected map(${map.id})`);
        continue;
      }
      const mapId = fs.readFileSync(nodePath);
      if (String(mapId) !== String(map.id)) console.log(`node(${node.id}->map(${mapId}), expected map(${map.id})`);
    }
  }
}
console.log('checking node');
for (const p of fs.readdirSync('./data/node/')) {
  for (const pp of fs.readdirSync(`./data/node/${p}/`)) {
    /** @type { SubjectRelateMap } */
    const mapId = JSON.parse(fs.readFileSync(`./data/node/${p}/${pp}`));
    const mapPath = `./data/map/${Math.floor(mapId / 1000)}/${mapId}.json`;
    if (!fs.existsSync(mapPath)) {
      console.log(`node(${pp}->map(${mapId}) no exists`);
      continue;
    }
  }
}
console.log('done');
