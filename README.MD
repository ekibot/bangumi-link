<!--
 * @Description: read me
 * @Author: ekibun
 * @Date: 2020-06-15 20:10:56
 * @LastEditors: ekibun
 * @LastEditTime: 2020-06-15 21:51:43
-->

# Bangumi 条目关联爬虫

[![](https://data.jsdelivr.com/v1/package/gh/ekibun/bangumi_link/badge)](https://www.jsdelivr.com/package/gh/ekibun/bangumi_link)
![spider](https://github.com/ekibun/bangumi_link/workflows/spider/badge.svg)

### 使用方法

数据类型定义
见[`./spider.d.ts`](https://github.com/ekibun/bangumi_link/blob/spider/spider.d.ts)

先根据 bgm id 获取到对应 map id:

```
https://cdn.jsdelivr.net/gh/ekibun/bangumi_link/node/{id/1000}/{id}
```

再根据 map id 获取关联数据:

```
https://cdn.jsdelivr.net/gh/ekibun/bangumi_link/map/{id/1000}/{id}
```

### 爬取数据

```bash
docker run -v $PWD/data:/app/data ghcr.io/ekibot/bangumi_link]
```
