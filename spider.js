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

function parseDateStr(s) {
  for (const pattern of [
    /^(\d{4})年(\d+)月(\d+)日?.*/, // YYYY年MM月DD日
    /^(\d{4})-(\d{2})-(\d{2}).*/, // YYYY-MM-DD
    /^(\d{4})\/(\d+)\/(\d+).*/, // YYYY/MM/DD
  ]) {
    const m = pattern.exec(s);
    if (m) return `${m[1].padStart(4, '0')}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  return null;
}

function getReleaseDate($) {
  let dateStr = '';
  const s = $('#infobox li');
  for (let index = 0; index < s.length; index++) {
    const e = s[index];
    const text = $(e).find('span').text();
    if (!text) continue;
    if (['放送开始:', '发行日期:', '开始:', '发售日:', '上映年度:'].includes(text.trim())) {
      dateStr = $(e).text().split(':').pop().trim();
      break;
    }
  }

  if (!dateStr) {
    return 'unknown';
  }
  return parseDateStr(dateStr);
}

const acceptRelate = '前传|续集|总集篇|全集|番外篇|相同世界观|不同世界观|不同演绎|衍生|主线故事'.split('|');

async function getSubject(bgmId) {
  const rsp = await this.safeRequest(`http://bgm.tv/subject/${bgmId}`);
  const $ = cheerio.load(rsp);

  const title = $('h1.nameSingle a');
  if (title.length === 0) return;
  const srcId = Number(title.attr('href').split('/').pop());

  const sections = $('div.subject_section');
  if (sections.length == 0) return;
  const relate = sections.toArray().find((e) => $(e).find('h2.subtitle').text() == '关联条目');
  if (relate == null) return;

  let relateStr = '';
  const relateSubject = $(relate).find('li.sep').toArray().map((e) => {
    const ele = $(e);
    relateStr = ele.find('span.sub').text().trim() || relateStr;
    return {
      relate: relateStr,
      subject: {
        id: Number(ele.find('a.title').attr('href').split('/').pop()),
        name: ele.find('a.title').text() || undefined,
        nameCN: ele.find('a.avatar').attr('title') || undefined,
        image: (/background-image:url\('(.*?)'\)/.exec(ele.find('span.avatarNeue').attr('style')) || [])[1] || undefined,
      },
    };
  })
    .filter((e) => acceptRelate.includes(e.relate));

  if (relateSubject.length == 0) return;

  return {
    id: srcId,
    name: title.text() || undefined,
    nameCN: title.attr('title') || undefined,
    image: ($('div.infobox img.cover').attr('src') || '').replace('/cover/c/', '/cover/m/') || undefined,
    date: getReleaseDate($),
    relate: relateSubject,
  };
}

(async () => {
  const cmpNode = (a, b) => a.id == b.id;
  const cmpRelate = (a, b) => a.src == b.src && a.dst == b.dst;
  const concatMap = (a, b, cmp) => {
    for (c of b) {
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
        if (relateMapID != map.id) {
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

  async function queueItem(bgmId) {
    this.log.v(bgmId);

    /** @type { SubjectNode & { relate: { relate: string, subject: SubjectNode }[] } } } */
    const subject = await getSubject.call(this, bgmId);
    if (subject == null) return;

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
  }

  const rsp = await utils.createThis().safeRequest('https://bgm.tv/wiki');
  const $ = cheerio.load(rsp);
  const updateArray = $('li > a.l').toArray()
    .map((v) => Number((/\/subject\/(\d+)/.exec($(v).attr('href')) || [])[1]))
    .reduce((newArray, v) => {
      if (v > 0 && newArray.indexOf(v) === -1) newArray.push(v);
      return newArray;
    }, []);

  updateArray.sort();

  await utils.queue(updateArray, queueItem, 10);
  console.log('done!');
})();
