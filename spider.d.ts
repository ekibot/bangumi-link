/*
 * @Description: 类型声明
 * @Author: ekibun
 * @Date: 2020-06-15 21:06:22
 * @LastEditors: ekibun
 * @LastEditTime: 2020-06-15 21:53:20
 */

/**
 * 条目信息
 */
type SubjectNode = {
  id: number,         // 条目id
  name: string,       // 名称
  nameCN: string,     // 译名
  image: string,      // 封面图
}

/**
 * 关联信息
 */
type SubjectRelate = {
  relate: string,     // 关联类型
  src: number,        // 来源
  dst: number,        // 目标
}

/**
 * 条目关联图
 */
type SubjectRelateMap = {
  id: number,         // 关联图id
  node: SubjectNode[] // 节点
  relate:  SubjectRelate[] // 关联
}