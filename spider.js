/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
/*
 * @Description: spider
 * @Author: ekibun
 * @Date: 2019-07-14 18:35:31
 * @LastEditors: ekibun
 * @LastEditTime: 2020-07-07 13:10:23
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const utils = require('./utils');

function mkdirs(dirpath) {
  if (!fs.existsSync(path.dirname(dirpath))) {
    mkdirs(path.dirname(dirpath));
  }
  fs.mkdirSync(dirpath);
}

function writeFileSync(nodePath, data) {
  const dirPath = path.dirname(nodePath);
  if (!fs.existsSync(dirPath)) mkdirs(dirPath);
  fs.writeFileSync(nodePath, data);
}

const acceptRelate = '前传|续集|总集篇|全集|番外篇|相同世界观|不同世界观|不同演绎|衍生|主线故事'.split('|');

async function getSubject(bgmId, host) {
  const subject = await (await this.safeRequest(`${host}/v0/subjects/${bgmId}`)).json();
  const relates = await (await this.safeRequest(`${host}/v0/subjects/${bgmId}/subjects`)).json();

  const relateSubject = relates.map((e) => ({
    relate: e.relation,
    subject: {
      id: e.id,
      name: e.name,
      nameCN: e.name_cn,
      image: e.images.medium,
      type: e.type,
    },
  })).filter((e) => acceptRelate.includes(e.relate));

  if (relateSubject.length === 0) return;

  // eslint-disable-next-line consistent-return
  return {
    id: subject.id,
    name: subject.name,
    nameCN: subject.name_cn,
    image: subject.images.medium,
    date: subject.date,
    nsfw: subject.nsfw,
    platform: subject.platform,
    relate: relateSubject,
  };
}

(async () => {
  const cmpNode = (a, b) => a.id === b.id;
  const cmpRelate = (a, b) => a.src === b.src && a.dst === b.dst;
  const concatMap = (a, b, cmp) => {
    for (const c of b) {
      const mapIndex = a.findIndex((n) => cmp(c, n));
      a.splice(mapIndex, mapIndex < 0 ? 0 : 1, { ...a[mapIndex], ...c });
    }
  };
  const getMapPath = (id) => `./data/map/${Math.floor(id / 1000)}/${id}.json`;
  const getNodePath = (id) => `./data/node/${Math.floor(id / 1000)}/${id}`;

  /** @type { (id: string) => SubjectRelateMap } */
  const getMap = (id) => {
    const mapPath = getMapPath(id);
    if (fs.existsSync(mapPath)) return JSON.parse(fs.readFileSync(mapPath));
    return null;
  };

  /**
 * 写入数据
 * @param { SubjectNode } node
 * @param { SubjectRelateMap } map
 * @this { import('./utils').This }
 */
  function writeNode(node, map) {
    const nodePath = getNodePath(node.id);
    if (fs.existsSync(nodePath)) {
      const relateMapID = String(fs.readFileSync(nodePath));
      const _relateMap = getMap(relateMapID);
      if (_relateMap === null) {
        this.log.e(`map data corrupt at ${node.id} -> map ${relateMapID}`);
      } else {
        if (Number(relateMapID) !== map.id) {
          this.log.v(this.chalk.blue(`map ${map.id} -> ${relateMapID}`));
          const mapPath = getMapPath(map.id);
          if (fs.existsSync(mapPath)) fs.unlinkSync(mapPath);
          map.node.forEach(({ id }) => {
            writeFileSync(getNodePath(id), relateMapID);
          });
          map.id = Number(relateMapID);
        }
        concatMap(map.node, _relateMap.node, cmpNode);
        concatMap(map.relate, _relateMap.relate, cmpRelate);
      }
    }
    writeFileSync(nodePath, String(map.id));
    concatMap(map.node, [node], cmpNode);

    map.node.sort((a, b) => a.id - b.id);
    map.relate.sort((a, b) => (a.src - b.src) || (a.dst - b.dst));
    writeFileSync(getMapPath(map.id), JSON.stringify(map, null, 1));
  }

  const host = process.argv.includes('-mirror') ? 'http://mirror.api.bgm.rincat.ch' : 'http://api.bgm.tv';

  async function queueItem(bgmId) {
    this.log.v(bgmId);

    // (ASYNC)读取Subject
    /** @type { SubjectNode & { relate: { relate: string, subject: SubjectNode }[] } } } */
    const subject = await getSubject.call(this, bgmId, host);
    if (subject == null) return;

    // (SYNC)从文件读取map
    /** @type { SubjectRelateMap } */
    const map = getMap(bgmId) || {
      id: bgmId,
      node: [],
      relate: [],
    };
    const { relate, ...node } = subject;
    this.log.v(`${node.id}:${node.name}`);
    writeNode.call(this, node, map);

    for (const rel of relate) {
      this.log.v(` ${node.id}--${rel.relate}->${rel.subject.id}`);
      concatMap(map.relate, [{
        relate: rel.relate,
        src: node.id,
        dst: rel.subject.id,
      }], cmpRelate);
      writeNode.call(this, rel.subject, map);
    }
    const unrels = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const unrelIndex = map.relate.findIndex(
        (rel) => rel.src === node.id && relate.findIndex((r) => r.subject.id === rel.dst) < 0,
      );
      if (unrelIndex < 0) break;
      const unrel = map.relate.splice(unrelIndex, 1)[0];
      this.log.v(this.chalk.red(` ${node.id}-x-${unrel.relate}->${unrel.dst}`));
      unrels.push(unrel);
    }
    if (unrels.length === 0) return;
    const unionFind = {};
    const unionFindMap = {};
    for (const rel of map.relate) {
      const isrc = unionFind[rel.src];
      const idst = unionFind[rel.dst];
      const usrc = unionFindMap[isrc];
      const udst = unionFindMap[idst];
      delete unionFindMap[isrc];
      delete unionFindMap[idst];
      const newMap = {
        // eslint-disable-next-line no-nested-ternary
        id: usrc ? usrc.id : udst ? udst.id : rel.src,
        node: [
          map.node.find((n) => n.id === rel.src),
          map.node.find((n) => n.id === rel.dst),
        ],
        relate: [
          rel,
        ],
      };
      if (usrc) {
        concatMap(newMap.node, usrc.node, cmpNode);
        concatMap(newMap.relate, usrc.relate, cmpRelate);
      }
      if (udst) {
        concatMap(newMap.node, udst.node, cmpNode);
        concatMap(newMap.relate, udst.relate, cmpRelate);
      }
      unionFind[rel.src] = newMap.id;
      unionFind[rel.dst] = newMap.id;
      for (const u in unionFind) {
        if (unionFind[u] === isrc || unionFind[u] === idst) unionFind[u] = newMap.id;
      }
      unionFindMap[newMap.id] = newMap;
    }
    if (Object.keys(unionFindMap).length <= 1) {
      writeFileSync(getMapPath(map.id), JSON.stringify(map, null, 1));
      return;
    }
    // eslint-disable-next-line guard-for-in
    for (const m in unionFindMap) {
      const newMap = unionFindMap[m];
      if (newMap.node.find((n) => n.id === map.id)) newMap.id = map.id;
      else for (const n of newMap.node) {
        const nodePath = getNodePath(n.id);
        writeFileSync(nodePath, String(newMap.id));
      }
      newMap.node.sort((a, b) => a.id - b.id);
      newMap.relate.sort((a, b) => (a.src - b.src) || (a.dst - b.dst));
      writeFileSync(getMapPath(newMap.id), JSON.stringify(newMap, null, 1));
    }
  }

  const rsp = await (await utils.createThis().safeRequest('https://bgm.tv/wiki')).text();
  const $ = cheerio.load(rsp);
  let max = 0;
  const updateArray = $('li > a.l').toArray()
    .map((v) => Number((/\/subject\/(\d+)/.exec($(v).attr('href')) || [])[1]))
    .reduce((newArray, v) => {
      max = v > 0 ? Math.max(max, v) : max;
      if (v > 0 && newArray.indexOf(v) === -1) newArray.push(v);
      return newArray;
    }, []);
  // 90天循环
  const maxUpdateLoop = 90;
  const updateOffset = Math.floor(new Date().getTime() / (24 * 60 * 60 * 1000)) % maxUpdateLoop;
  console.log(`update ${updateOffset}/${maxUpdateLoop}`);
  await utils.queue(
    process.argv.includes('-all') ? Array(max).fill(0).map((_, i) => i + 1) : [
      ...updateArray,
      ...Array(Math.ceil(max / maxUpdateLoop)).fill(0).map((_, i) => i * maxUpdateLoop + 1 + updateOffset),
    ], queueItem, 10,
  );
  console.log('done!');
})();