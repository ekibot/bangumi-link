const fs = require('fs');
const path = require('path');
const {
  getArchive,
  relationInfo,
  subjects,
} = require('./data');

process.stdout.write('process subject relations ...\r');

const bgmIdToMapId = {};
const maps = {};
const acceptRelate = '前传|续集|总集篇|全集|番外篇|相同世界观|不同世界观|不同演绎|衍生|主线故事'.split('|');

/**
 * subject relation
 * @type {{ [subjectId: number] : {
 * "subject_id":8,
 * "relation_type":3001,
 * "related_subject_id":8820,
 * "order":5
 * }}}
 */
getArchive('subject-relations', (v) => {
  const srcSubject = subjects[v.subject_id];
  const dstSubject = subjects[v.related_subject_id];
  if (!srcSubject || !dstSubject) return;
  const relate = relationInfo[dstSubject.type][v.relation_type];
  const relateString = relate ? relate.cn : '';
  if (acceptRelate.includes(relateString)) {
    // 读取map记录
    const mapIdSrc = bgmIdToMapId[v.subject_id] ?? v.subject_id;
    const mapIdDst = bgmIdToMapId[v.related_subject_id] ?? v.related_subject_id;
    const mapId = Math.min(mapIdSrc, mapIdDst, v.subject_id, v.related_subject_id);
    // map附加记录
    const map = maps[mapId] ?? {
      id: mapId,
      node: [],
      relate: [],
    };
    maps[mapId] = map;
    const mergeMap = (dstMapId) => {
      if (dstMapId === mapId) return;
      const dstMap = maps[dstMapId];
      if (!dstMap) return;
      delete maps[dstMapId];
      dstMap.node.forEach((node) => {
        bgmIdToMapId[node.id] = mapId;
        map.node.push(node);
      });
      map.relate.push(...dstMap.relate);
    };
    mergeMap(mapIdSrc);
    mergeMap(mapIdDst);
    // 更新map记录
    bgmIdToMapId[v.subject_id] = mapId;
    bgmIdToMapId[v.related_subject_id] = mapId;
    if (!map.node.includes(srcSubject)) map.node.push(srcSubject);
    if (!map.node.includes(dstSubject)) map.node.push(dstSubject);
    map.relate.push({
      relate: relateString,
      src: v.subject_id,
      dst: v.related_subject_id,
    });
  }
}, {});

process.stdout.write('process subject relations done\n');

function rmdirs(url) {
  if (fs.existsSync(url)) {
    fs.readdirSync(url).forEach((file) => {
      const curPath = path.join(url, file);
      if (fs.statSync(curPath).isDirectory()) { // recurse
        rmdirs(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(url);
  }
}

function mkdirs(dirpath) {
  if (!fs.existsSync(path.dirname(dirpath))) {
    mkdirs(path.dirname(dirpath));
  }
  fs.mkdirSync(dirpath);
}

function writeFileSync(filePath, data) {
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) mkdirs(dirPath);
  fs.writeFileSync(filePath, data);
}

process.stdout.write('writting subject relations ...\r');

rmdirs('data/map');
rmdirs('data/node');

Object.keys(bgmIdToMapId).forEach((id) => {
  const mapId = bgmIdToMapId[id];
  const filePath = `./data/node/${Math.floor(id / 1000)}/${id}`;
  writeFileSync(filePath, mapId.toString());
});
Object.keys(maps).forEach((id) => {
  const filePath = `./data/map/${Math.floor(id / 1000)}/${id}.json`;
  const map = maps[id];
  map.node = map.node.map((node) => ({
    id: node.id,
    name: node.name,
    nameCN: node.name_cn,
    date: node.date,
    type: node.type,
    nsfw: node.nsfw,
    platform: node.platform,
  }));
  writeFileSync(filePath, JSON.stringify(map, null, 2));
});

fs.writeFileSync('./data/relate.json', JSON.stringify({
  ids: bgmIdToMapId,
  maps,
}));

process.stdout.write('writting subject relations done. \n');
