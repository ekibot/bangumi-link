import { Card, List, Switch, Image, Tag } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import './svg.css';
import * as d3 from 'd3';

const { devicePixelRatio = 1 } = window;

const img_w = 50;
const img_h = 50;

function D3Force({ map }) {
  const ref = useRef();
  const [size, onSize] = useState([0, 0]);

  useEffect(() => {
    const onResize = () => {
      onSize([document.body.clientWidth, document.body.clientHeight]);
    }
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, [])

  useEffect(() => {
    if (!ref.current || !map.node) return;

    const viewBox = d3.select(ref.current);
    const svg = d3.select("g");

    const zoom = d3.zoom().on("zoom", (e) => {
      svg.attr("transform", e.transform);
    });

    viewBox
      .call(zoom)
      .call(zoom.transform, d3.zoomIdentity)
      .on("dblclick.zoom", null);

    const defaultLineColor = "#b8b8b8";

    function boldNextAndPrev(matchedValue, defaultValue) {
      return function (line) {
        if (["前传", "续集"].includes(line.relate)) {
          return matchedValue;
        }
        return defaultValue;
      };
    }

    const strokeStyler = boldNextAndPrev("black", defaultLineColor);

    const relate = map.relate.map((rel) => ({
      relate: rel.relate,
      source: map.node.find((n) => n.id === rel.src),
      target: map.node.find((n) => n.id === rel.dst),
    }));
    let edges_line = svg
      .selectAll("line")
      .data(relate)
      .enter()
      .append("line")
      .style("stroke", strokeStyler)
      .style("stroke-width", boldNextAndPrev(2, 1));

    let edges_text = svg
      .selectAll(".linetext")
      .data(relate)
      .enter()
      .append("text")
      .attr("class", "linetext")
      .text((d) => d.relate);

    let nodes_text = svg
      .selectAll(".nodetext")
      .data(map.node)
      .enter()
      .append("text")
      .attr("class", "nodetext")
      .attr("dx", -20)
      .attr("dy", 20)
      .text((d) => d.nameCN || d.name);

    let nodes_img = svg
      .selectAll("image")
      .data(map.node)
      .enter()
      .append("image")
      .attr("width", img_w)
      .attr("height", img_h)
      .attr("preserveAspectRatio", "none")
      .attr("id", (d) => d.id)
      .attr(
        "xlink:href",
        (d) => `https://api.bgm.tv/v0/subjects/${d.id}/image?type=common`
      )
      .on("contextmenu", function (event) {
        window.open("https://bgm.tv/subject/" + event.target.id, "_blank");
      })

    const nodeContainer = {};

    nodes_img.each(function (d) {
      nodeContainer[d.id] = d;
    });

    let highLightObj;

    function highLight(event) {
      const targetID = parseInt(event.target.id);

      // 加黑相关的线条
      edges_line.style("stroke", function (line) {
        if (line.source.id === targetID || line.target.id === targetID) {
          return strokeStyler(line);
        }
      });

      //显示连接线上的文字
      edges_text.style("fill-opacity", function (edge) {
        if (edge.source.id === targetID) {
          return 1.0;
        }
      });
    }

    console.log("init");

    function unHighLight(d) {
      if (highLightObj) {
        return highLight(highLightObj);
      }

      if (!d.highLight) {
        edges_line.style(
          "stroke",
          boldNextAndPrev("black", defaultLineColor)
        );
        //隐去连接线上的文字
        edges_text.style("fill-opacity", 0);
      }
    }

    nodes_img.call(
      d3
        .drag()
        .on("start", function (event) {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        })
        .on("drag", function (event) {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
          event.subject.x = event.x;
          event.subject.y = event.y;
        })
        .on("end", function (event) {
          event.subject.fixed = !event.subject.fixed;
          event.subject.x = event.x;
          event.subject.y = event.y;

          if (event.subject.fixed) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
          } else {
            delete event.subject.fx;
            delete event.subject.fy;
          }
        })
    );

    nodes_img
      .on("mouseover", (event) => {
        const obj = nodeContainer[event.target.id];
        obj.fx = obj.x;
        obj.fy = obj.y;
        highLight(event);
      })
      .on("mouseout", (event) => {
        const obj = nodeContainer[event.target.id];
        if (!obj.fixed) {
          delete obj.fx;
          delete obj.fy;
        }

        unHighLight(event);
      })
      .on("dblclick", function (d, i) {
        if (highLightObj !== d) {
          let relatedRelation = relate.filter(function (val) {
            return val.source.id === d.id || val.target.id === d.id;
          });

          function dataVisible(nodes) {
            if (
              relatedRelation.findIndex(function (val) {
                return (
                  val.source.id === nodes.id || val.target.id === nodes.id
                );
              }) === -1
            ) {
              return null;
            } else {
              return "true";
            }
          }

          nodes_text.attr("data-visible", dataVisible);
          nodes_img.attr("data-visible", dataVisible);
          highLight(d);
          highLightObj = d;
        } else {
          nodes_text.attr("data-visible", "true");
          nodes_img.attr("data-visible", "true");
          highLightObj = null;
        }
      });

    const force = d3.forceSimulation(map.node);
    force
      .force("charge", d3.forceManyBody().strength(-8000))
      .force("link", d3.forceLink().links(relate).distance(100).strength(3))
      .force("gravity", null)
      .force("center", null)
      .velocityDecay(0.6)
      .alpha(0.05)
      .on("tick", function () {
        force.alpha(0.05);

        //更新连接线的位置
        edges_line.attr("x1", (d) => d.source.x);
        edges_line.attr("y1", (d) => d.source.y);
        edges_line.attr("x2", (d) => d.target.x);
        edges_line.attr("y2", (d) => d.target.y);

        //更新连接线上文字的位置
        edges_text.attr("x", function (d) {
          return (d.source.x + d.target.x) / 2;
        });
        edges_text.attr("y", function (d) {
          return (d.source.y + d.target.y) / 2;
        });

        //更新结点图片和文字
        nodes_img.attr("x", function (d) {
          return d.x - img_w / 2;
        });
        nodes_img.attr("y", function (d) {
          return d.y - img_h / 2;
        });

        nodes_text.attr("x", function (d) {
          return d.x + img_w / 2;
        });
        nodes_text.attr("y", function (d) {
          return d.y + img_h / 2;
        });
      });

    return () => {
      force.stop();
      svg.selectChildren().remove();
    }
  }, [ref, map]);

  const [w, h] = size;

  return (
    <svg
      ref={ref}
      width={w * devicePixelRatio}
      height={h * devicePixelRatio}
      viewBox={`${-w / 2} ${-h / 2} ${w} ${h}`}
      style={{ width: '100%', height: '100%' }}>
      <g />
    </svg>
  )
}

function Page() {
  const { id } = useParams();
  const [sort, setSort] = useState(false);
  const [map, setMap] = useState({});

  useEffect(() => {
    const abortControl = new AbortController();
    fetch(`https://cdn.jsdelivr.net/gh/ekibot/bangumi-link/node/${(id / 1000) | 0}/${id}`).then(async (rsp) => {
      const mapId = await rsp.text();
      const map = await (await fetch(`https://cdn.jsdelivr.net/gh/ekibot/bangumi-link/map/${(mapId / 1000) | 0}/${mapId}.json`)).json();
      console.log(map);
      const subjectNode = map.node?.find((v) => v.id === Number(id));
      if (subjectNode) {
        subjectNode.fixed = true;
        subjectNode.fx = 0;
        subjectNode.fy = 0;
        subjectNode.x = 0;
        subjectNode.y = 0;
      }
      setMap(map);
    }).catch((e) => {
      setSort(true);
    });
    return () => abortControl.abort();
  }, [id])

  const dataSorted = useMemo(() => map?.node?.sort((a, b) => {
    if (a.date !== b.date)
      return a.date - b.date
    return a.id - b.id
  }), [map]);

  return (
    <div>
      <Card style={{ width: '100%', position: sort ? undefined : 'absolute' }}>
        {'按发行顺序排序 '}
        <Switch checked={sort} onChange={(e) => setSort(e)} />
      </Card>
      {
        sort && <List bordered>
          {
            dataSorted?.map((item) => (
              <Card.Grid key={item.id} style={{ width: '100%' }}>
                <a target="_blank" href={`https://bgm.tv/subject/${item.id}`} rel="noreferrer">
                  <Card.Meta

                    avatar={<Image
                      style={{ objectFit: 'cover' }}
                      width={60}
                      height={90}
                      src={`https://api.bgm.tv/v0/subjects/${item.id}/image?type=common`} preview={false} />}
                    title={item.nameCN || item.name}
                    description={<>
                      <p>{item.name}</p>
                      {item.platform && <Tag>{item.platform}</Tag>}
                      {item.date}
                    </>}
                  />
                </a>
              </Card.Grid>
            ))
          }
        </List>
      }
      <div style={{ display: sort ? 'none' : 'block', width: '100%', height: '100vh', overflow: 'hidden' }}>
        <D3Force key={id} map={map} />
      </div>
    </div >
  )
}

export default Page;