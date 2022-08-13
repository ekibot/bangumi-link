/* eslint-disable camelcase */
const fs = require('fs');
const moment = require('moment-timezone');
const bangumiData = require('bangumi-data');
const {
  getArchive,
  subjects,
} = require('./data');

const bangumiDataMap = Object.fromEntries(bangumiData.items.map((bgmItem) => (
  [bgmItem.sites.find((v) => v.site === 'bangumi')?.id ?? 0, bgmItem]
)));

/**
 * 通过首播时间推测放送的星期和时间
 * @param { string } dateString
 */
function parseWeekTime(dateString) {
  if (!dateString) return { week: 0, time: '' };
  const date = moment(dateString).tz('Asia/Shanghai');
  return {
    week: date.day(),
    time: date.format('HHmm'),
  };
}

/**
 * 先检查站点的放送信息，不存在则按首播时间推测
 * @param { BangumiData } item
 */
function getChinaDate(item) {
  const chinaSites = ['acfun', 'bilibili', 'tucao', 'sohu', 'youku', 'tudou', 'qq', 'iqiyi', 'letv', 'pptv', 'kankan', 'mgtv'];
  let date = null;
  if (item) for (const site of item.sites) {
    if (site.begin && chinaSites.includes(site.site)) {
      date = date && date < site.begin ? date : site.begin;
    }
  }
  return parseWeekTime(date);
}

const calendar = {};
const now = moment();
getArchive('episode').forEach((ep) => {
  if (!ep.airdate) return;
  const airdate = moment(ep.airdate);
  const diff = now.diff(airdate, 'day');
  if (diff > -20 && diff < 10) {
    const {
      id, type, sort, name, name_cn, status,
    } = ep;
    (calendar[ep.subject_id] = calendar[ep.subject_id] ?? []).push({
      id, type, sort, name, name_cn, airdate: airdate.format('YYYY-MM-DD'), status,
    });
  }
});

fs.writeFileSync('data/calendar.json', `[\n${Object.keys(calendar).map((subjectId) => {
  const subject = subjects[subjectId];
  if (!subject) return null;
  const bgmItem = bangumiDataMap[subjectId];
  const dateJP = parseWeekTime(bgmItem?.begin);
  const dateCN = getChinaDate(bgmItem);
  dateJP.week = dateJP.week > 0 ? dateJP.week : subjects[subjectId].week;
  dateCN.week = dateCN.week > 0 ? dateCN.week : subjects[subjectId].week;
  return JSON.stringify({
    id: subjectId,
    name: subject.name,
    name_cn: subject.name_cn,
    air_date: subject.date,
    weekDayJP: dateJP.week,
    weekDayCN: dateCN.week,
    timeJP: dateJP.time,
    timeCN: dateCN.time,
    sites: bgmItem?.sites?.filter((v) => v.site !== 'bangumi'),
    eps: calendar[subjectId],
    nsfw: subject.nsfw,
  });
}).filter((v) => v).join(',\n')}\n]`);
