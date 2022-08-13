/* eslint-disable camelcase */
const fs = require('fs');
const NReadlines = require('n-readlines');

/**
 * parse archive json lines
 * @param {string} name
 */
function getArchive(name, map) {
  const reader = new NReadlines(`archive/${name}.jsonlines`);
  let line;
  // eslint-disable-next-line no-cond-assign
  while (line = reader.next()) {
    try {
      map(JSON.parse(line.toString()));
    } catch (e) {
      process.stderr.write(`parse line error: ${line}\n`);
    }
  }
}

function parseInfoBox(infobox) {
  return infobox.replace(/\r|}}\s*$/g, '').split(/\n\s*\|/g).slice(1).map((c) => {
    const sp = c.indexOf('=');
    const key = c.slice(0, sp).trim();
    const value = c.slice(sp + 1).trim();
    // if (v.indexOf('{') > 0) console.log([v, c, id]); // 8957
    // if (v.indexOf('{') === 0 && v[v.length-1] !== '}') console.log([v, c, id]); // 308933
    if (value[0] === '{' && value[value.length - 1] === '}') {
      return {
        key,
        value: value.slice(1, value.length - 1).split('\n').map((v) => {
          // if (tr0 && (tr0[0] === '[' || tr0[tr0.length - 1] !== ']'))
          //   console.log([v, c, id]); // 368005
          const tr = v.trim().replace(/^\[|\]$/g, '');
          if (!tr) return undefined;
          const spl = tr.indexOf('|');
          if (spl < 0) return { v: tr };
          return {
            k: tr.slice(0, spl).trim(),
            v: tr.slice(spl + 1).trim(),
          };
        }).filter((v) => v),
      };
    }
    return { key, value };
  });
}

/**
 * platform id info
 * @type {{ [subjectType: string]: { [platformId: string]: {
 * alias: "misc",
 * id: 0,
 * type: "other",
 * "type_cn": "其他",
 * "wiki_tpl": "Book"
 * }}}}
 */
const platformInfo = JSON.parse(fs.readFileSync('vars/platform.json').toString());

/**
 * relation id info
 * @type {{ [dstId: string]: { [relationId: string]: {
 * "cn": "改编",
 * "description": "同系列不同平台作品，如柯南漫画与动画版",
 * "en": "Adaptation",
 * "jp": ""
 * }}}}
 */
const relationInfo = JSON.parse(fs.readFileSync('vars/relation.json').toString());

process.stdout.write('process subject ...\r');
const subjectCacheFile = 'archive/subject.json';
/**
 * @type {{ [subjectId: number] : {
 * "id":1,
 * "name":"第一次的親密接觸",
 * "name_cn":"第一次的亲密接触",
 * "infobox": "",
 * "platform":1002,
 * "summary":"",
 * "type": 0,
 * "nsfw":0
 * }}} subject
 */
const subjects = fs.existsSync(subjectCacheFile) ? JSON.parse(fs.readFileSync(subjectCacheFile))
  : (() => {
    const _subjects = {};
    getArchive('subject', (v) => {
      if (!v) return;
      process.stdout.write(`processing subject ${v.id}\r`);
      const infobox = parseInfoBox(v.infobox);
      let date;
      const week = ([
        ...Array.from('一二三四五六日').map((s) => `星期${s}`),
        ...Array.from('月火水木金土日').map((s) => `${s}曜日`),
      ].indexOf(infobox['放送星期']?.value) % 7) + 1;
      for (const info of infobox) {
        if (!['放送开始', '发行日期', '开始', '发售日', '发售日期', '上映年度', 'Released'].includes(info.key)) continue;
        const dateMatch = /(\d{4})[/年-](\d+)[/月-](\d+)日?/.exec(info.value.toString());
        if (dateMatch) {
          date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
          break;
        }
      }
      _subjects[v.id] = {
        id: v.id,
        name: v.name,
        name_cn: v.name_cn,
        type: v.type,
        nsfw: v.nsfw,
        date,
        week,
        platform: platformInfo[v.type]?.[v.platform].type_cn,
      };
    });
    fs.writeFileSync(subjectCacheFile, JSON.stringify(_subjects));
    return _subjects;
  })();

process.stdout.write('process subject done. \n');

module.exports = {
  getArchive,
  platformInfo,
  relationInfo,
  subjects,
};
