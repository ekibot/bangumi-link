/*
 * @Description: utils
 * @Author: ekibun
 * @Date: 2019-08-02 13:32:54
 * @LastEditors  : ekibun
 * @LastEditTime : 2020-01-05 15:16:26
 */
const cheerio = require('cheerio');
const util = require('util');
const http = require('http');
const https = require('https');

const httpAgent = new http.Agent({
  keepAlive: true
});
const httpsAgent = new https.Agent({
  keepAlive: true
});

const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const chalk = new (require('chalk')).Instance({ level: 2 });

/**
 * 函数上下文
 * @typedef { Object } This
 * @property { { v: (...message) => void, e: (...message) => void } } log
 * @property { typeof _safeRequest } safeRequest
 * @property { typeof chalk } chalk
 */

/**
 * safe request with retry
 * @param { string } url
 * @param { * } options
 * @param { number } retry
 */
async function _safeRequest(url, options, retry = 3) {
  if (!retry) throw "max retry exceeded";
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000);
  try {
    const rsp = await fetch(url, {
      agent: function (_parsedURL) {
        if (_parsedURL.protocol == 'http:') {
          return httpAgent;
        } else {
          return httpsAgent;
        }
      },
      signal: controller.signal,
      ...options,
    })
    const text = await rsp.text();
    if (!rsp.ok) {
      const errorStr = cheerio.load(text).text().trim().split('\n')[0].substring(0, 100);
      throw `${rsp.status} ${errorStr}`;
    }
    return text;
  } catch (error) {
    if (error.name === "AbortError")
      this.log.e("timeout of 5000ms exceeded");
    else
      this.log.e(error);
    return _safeRequest.call(this, url, options, retry - 1);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * set of append list
 * @template T
 * @param { T[] } arr
 * @param { T } newData
 * @param { (value: T, index: number) => boolean } finder
 */
function setOrPush(arr, newData, finder) {
  const index = arr.findIndex(finder);
  if (~index) arr.splice(index, 1, newData);
  else arr.push(newData);
}

/**
 * create this with logger
 * @param { (type, ...messsage) => void } printer
 * @returns { This }
 */
// eslint-disable-next-line no-console
function createThis(printer = (type, ...message) => console[type](...message)) {
  const log = {
    v: (...message) => printer('log', ...message),
    e: (...message) => printer('error', ...message),
  };
  /** @type { This } */
  const _this = {
    chalk,
    log,
  };
  _this.safeRequest = (url, options, retry) =>
    _safeRequest.call(_this, url, options, retry);
  return _this;
}

/**
 * async pool
 * @template T
 * @param { T[] } _fetchs
 * @param { (data: T) => Promise } run
 * @param { number } num
 */
async function queue(_fetchs, run, num = 2) {
  const fetchs = _fetchs.concat();
  await Promise.all(new Array(num).fill(0).map(async (_, i) => {
    while (fetchs.length) {
      const pre = [chalk.yellow(`${_fetchs.length - fetchs.length + 1}/${_fetchs.length}`), chalk.green(i)];
      const messages = [];
      const _this = createThis((...message) => messages.push(message));
      try {
        await run.call(_this, fetchs.shift());
      } catch (e) { _this.log.e(e); }
      _this.log = createThis(() => { }).log;
      messages[0] = messages[0] || ['log'];
      messages[0].splice(1, 0, ...pre);
      // eslint-disable-next-line no-console
      const logToConsole = (type, ...message) => {
        if (type == "error") {
          console.log(...message.map(msg => chalk.red(util.inspect(msg))));
        } else console.log(...message);
      }
      messages.forEach((v) => v && logToConsole(...v));
    }
  }));
}

module.exports = {
  setOrPush,
  queue,
  createThis,
};


if (!module.parent) {
  const bangumiData = require('bangumi-data');
  (async () => {
    async function queueItem(bgmItem) {
      while (true) {
        const test = new Promise((res) => setTimeout(() => res(bgmItem.title), 10));
        this.log.v(await this.awaitTimeout(test));
      }
    }
    // console.log(...[chalk.red(inspect(new Error("233")).toString())])
    await queue(bangumiData.items, queueItem, 5, 100);
  })();
}