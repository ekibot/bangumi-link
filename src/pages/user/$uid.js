import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import { Avatar, Button, Space, Card, Image, Tag, Row, Select, Col, List, Switch } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from "react-router-dom";

const bgmServer = 'https://api.bgm.tv';
const collectionType = '未看|想看|看过|在看|搁置|抛弃'.split('|');
const collectionColor = 'red|orange|blue|green|default|default'.split('|');

function getSeason(map, collection, subjectId, type) {
  const ret = [];
  const visitNode = (nodeId) => map.node.find((v) => v.id === nodeId && v.visited !== true)
  const queue = [];
  queue.push(subjectId);
  const filterRelation = ['续集', '前传', '主线故事'];
  while (true) {
    const nodeId = queue.pop();
    if (!nodeId) break;
    const node = visitNode(nodeId);
    if (!node) continue;
    if (node.type && node.type !== type) continue;
    node.visited = true;
    const collect = collection.find((v) => v.subject_id === nodeId);
    if (collect && collect.subject_type !== type) continue;
    if (collect) collect.visited = true;
    ret.push({
      id: node.id,
      name: node.name,
      nameCN: node.nameCN,
      date: node.date,
      collect: collect?.type || 0,
      type: node.type || collect?.subject_type || type,
      platform: node.platform,
    });
    if (!map.relate) continue;
    queue.push(...map.relate.filter((e) => e.src === nodeId && filterRelation.includes(e.relate)).map((e) => e.dst));
    queue.push(...map.relate.filter((e) => e.dst === nodeId && filterRelation.includes(e.relate)).map((e) => e.src));
  }
  return ret.sort((a, b) => a.id - b.id);
}

async function loadCollectionData(uid, setLoading) {
  setLoading('获取收藏数据...');

  let offset = 0;
  const collections = [];
  while (true) {
    const rsp = await (await fetch(`${bgmServer}/v0/users/${uid}/collections?limit=100&offset=${offset}`)).json();
    collections.push(...rsp.data);
    const total = rsp.total;
    offset += rsp.data.length;
    setLoading(`获取收藏数据(${offset}/${total})`);
    if (offset >= total) break;
  }
  const relateMap = [];

  setLoading('获取关联数据...')
  const relate = await (await fetch('https://cdn.jsdelivr.net/gh/ekibot/bangumi-link/relate.json', {
    cache: "reload",
  })).json()

  const fetchs = collections.concat();
  while (fetchs.length) {
    const sort = fetchs.length;
    const collect = fetchs.shift();
    if (collect.visited) continue;
    const subjectId = collect.subject_id;
    const mapId = relate.ids[subjectId];
    const map = relate.maps[mapId];
    if (!map) continue;
    relateMap.push({
      sort,
      data: getSeason(map, collections, subjectId, collect.subject_type),
    });
  }
  setLoading('');

  return {
    update_at: new Date().toISOString(),
    data: relateMap.sort((a, b) => b.sort - a.sort).map((v) => v.data),
  };
}

const subjectTypes = '全部类型|书籍|动画|音乐|游戏||三次元'.split('|');

const swicthFilters = [
  {
    key: 'onlyWatched',
    switch: '系列必须包含看过/在看',
    filter: (data, value) => value && !data.find((d) => [2, 3].includes(d.collect)) ? [] : data
  },
  {
    key: 'onlyOnAir',
    switch: '排除未到日期的条目',
    filter: (data, value) => {
      if (!value) return data
      const now = new Date().getTime();
      return data.filter((v) => v.date && (new Date(v.date).getTime() < now))
    }
  },
  {
    key: 'onlyNoWatched',
    switch: '系列必须包含未看',
    filter: (data, value) => value && !data.find((d) => !d.collect) ? [] : data
  }
]

const optionsFilters = [
  {
    key: 'subjectType',
    options: subjectTypes.filter((v) => v),
    filter: (data, value) => {
      const type = subjectTypes.indexOf(value);
      if (type <= 0) return data;
      return data.filter((d) => (!d.type) || d.type === type);
    }
  }
]

function Page() {
  const navigate = useNavigate();
  const { uid } = useParams();
  const [collection, setCollection] = useState({});
  const [user, setUser] = useState({});
  const [loadingCollection, setLoadingCollection] = useState('');
  const [filterState, setFilterState] = useState({});
  const [onlyNoCollects, setOnlyNoCollects] = useState({});

  useEffect(() => {
    try {
      setCollection(JSON.parse(localStorage.getItem(`${uid}/collections`)));
    } catch (e) { }
    const abortControl = new AbortController();
    fetch(`${bgmServer}/user/${uid}`).then(async (rsp) => {
      const user = await rsp.json();
      if (user.username !== uid) navigate(`/user/${user.username}`, { replace: true })
      setUser(user);
    }).catch((e) => {
      setUser({
        request: `/user/${uid}`,
        error: e.message
      });
    });
    return () => abortControl.abort();
  }, [uid, navigate]);

  useEffect(() => {
    if (filterState.onlyNoWatched) {
      setOnlyNoCollects({
        ...collection?.data?.map(() => true)
      })
    } else {
      setOnlyNoCollects({})
    }
  }, [filterState.onlyNoWatched, collection])

  const { filterdCollection, filterdPlatforms } = useMemo(() => {
    const filterdPlatforms = new Set();
    const filterdCollection = collection?.data?.map((items, index) => {
      const filteredSubjects = [
        ...swicthFilters,
        ...optionsFilters,
      ].reduce((v, f) => {
        return f.filter(v, filterState[f.key])
      }, items);
      return {
        id: index,
        label: items.find((v) => v.collect),
        subjects: filteredSubjects,
      };
    }).filter((items) => items.subjects?.length > 0)

    const value = filterState.platforms;
    filterdCollection?.forEach((v) => {
      v.subjects.forEach((vv) => filterdPlatforms.add(vv.platform || "其他"));
      if (!value || (value === '全部平台')) return;
      v.subjects = v.subjects.filter((d) => (d.platform || "其他") === value)
    });

    return { filterdCollection, filterdPlatforms };
  }, [collection, filterState]);

  return user.error || (
    <>
      <Card>
        <Card.Meta
          avatar={<Avatar src={user?.avatar?.medium} />}
          title={user?.nickname ?? user?.username ?? uid}
          description={
            <Space wrap>
              {collection?.update_at && `获取到 ${(collection.data || []).length} 条关联数据`}
              <Button
                disabled={loadingCollection}
                onClick={async () => {
                  const data = await loadCollectionData(uid, setLoadingCollection).catch((e) => {
                    setLoadingCollection('');
                    throw e;
                  });
                  console.log(data);
                  setCollection(data);
                  localStorage.setItem(`${uid}/collections`, JSON.stringify(data));
                }}
              >{loadingCollection || (collection?.update_at ? `上次更新于 ${collection?.update_at}` : '获取收藏数据')}</Button>
            </Space>
          }
        />
        <div>
          <Space style={{ marginTop: '16px' }} wrap>
            {
              swicthFilters.map((f) => (
                <span key={f.key}>
                  <Switch
                    checked={filterState[f.key]}
                    onChange={(v) => setFilterState({ ...filterState, [f.key]: v })}
                  />
                  {f.switch}
                </span>
              ))
            }
          </Space>
        </div>
        <Space style={{ marginTop: '16px' }} wrap>
          {
            [
              ...optionsFilters,
              {
                key: 'platforms',
                options: ['全部平台', ...filterdPlatforms]
              },
            ].map((f) => (
              <Select
                style={{ width: 120 }}
                key={f.key}
                defaultValue={f.options[0]}
                value={filterState[f.key] ?? f.options[0]}
                onChange={(v) => setFilterState({ ...filterState, [f.key]: v })}
              >
                {
                  f.options.map((v) => (
                    <Select.Option key={v}>{v}</Select.Option>
                  ))
                }
              </Select>
            ))
          }
        </Space>

      </Card>
      {
        filterdCollection &&
        <List
          pagination={{
            position: 'both',
            pageSize: 30,
          }}
          dataSource={filterdCollection}
          renderItem={(items) => (
            <Card key={items.id}>
              <Card.Grid style={{ width: '100%' }} hoverable={false}>
                <Row wrap={false}>
                  <Col flex="auto" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    <Tag>{subjectTypes[items.label?.type || 0]}</Tag>
                    {items.label?.nameCN || items.label?.name}
                  </Col>
                  <Col flex="none">
                    <Button onClick={() => setOnlyNoCollects({
                      ...onlyNoCollects,
                      [items.id]: !onlyNoCollects[items.id]
                    })} size="small">
                      {onlyNoCollects[items.id] ? <CaretDownOutlined /> : <CaretUpOutlined />}
                    </Button>
                    {' '}
                    <Link to={`/subject/${items?.label?.id}`}>
                      关系图
                    </Link>
                  </Col>
                </Row>

              </Card.Grid>
              {(onlyNoCollects[items.id] ? items.subjects.filter((v) => !v.collect) : items.subjects).map((item) => (
                <a key={item.id} target="_blank" href={`https://bgm.tv/subject/${item.id}`} rel="noreferrer">
                  <Card.Grid style={{ width: '100%' }}>
                    <Card.Meta
                      avatar={<Image
                        style={{ objectFit: 'cover' }}
                        width={60}
                        height={90}
                        src={`https://api.bgm.tv/v0/subjects/${item.id}/image?type=common`} preview={false} />}
                      title={item.nameCN || item.name}
                      description={<>
                        <p>{item.name}</p>
                        <Tag color={collectionColor[item.collect || 0]}>
                          {collectionType[item.collect || 0]}
                        </Tag>
                        {item.platform && <Tag>{item.platform}</Tag>}
                        {item.date}
                      </>}
                    />
                  </Card.Grid>
                </a>
              ))}
            </Card>

          )}
        />
      }
    </>

  );
}

export default Page;