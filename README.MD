<!--
 * @Description: read me
 * @Author: ekibun
 * @Date: 2020-06-15 20:10:56
 * @LastEditors: ekibun
 * @LastEditTime: 2020-06-15 21:51:43
--> 
# Bangumi条目关联图

[![](https://data.jsdelivr.com/v1/package/gh/ekibot/bangumi-link/badge)](https://www.jsdelivr.com/package/gh/ekibot/bangumi-link)

分析[Bangumi/Archive](https://github.com/bangumi/Archive)获取条目关联图

## 使用方法

数据类型定义见[`./spider.d.ts`](https://github.com/ekibot/bangumi-link/blob/spider/spider.d.ts)

先根据bgm id获取到对应map id:
```
https://cdn.jsdelivr.net/gh/ekibot/bangumi-link/node/{id/1000}/{id}
```

再根据map id获取关联数据:
```
https://cdn.jsdelivr.net/gh/ekibot/bangumi-link/map/{id/1000}/{id}.json
```
