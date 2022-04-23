/**
 * 写入数据
 * @param { SubjectNode } node
 */
function render(item) {
    return `
<div class="card row" id="item_${item.id}">
  <div class="row g-0">
    <div class="col-4">
      <img src="${item.image}" class="img-fluid rounded mx-auto"  style='max-height: 120px' alt="${item.name}">
    </div>
    <div class="col-8">
      <div class="card-body">
        <h5 class="card-title">${item.nameCN} <small class="text-muted">${item.name}</small></h5>
        <p class="card-text"><small class="text-muted">${item.date ?? 'unknown'}</small></p>
      </div>
    </div>
  </div>
</div>
`;
}

function getQueryVariable(variable) {
    const query = new URLSearchParams(document.location.search.substring(1))
    return query.get(variable)
}

async function fetchData() {
    const _prefix = 'https://cdn.jsdelivr.net/gh/ekibot/bangumi-link'
    const _subject_dir = (_subject_id / 1000) | 0
    let res = await fetch(`${_prefix}/node/${_subject_dir}/${_subject_id}`)
    if (res.status !== 200) {
        throw new Error(await res.text())
    }

    const map_id = await res.text()
    const map_dir = (map_id / 1000) | 0
    let json = await fetch(`${_prefix}/map/${map_dir}/${map_id}.json`)
    if (json.status !== 200) {
        throw new Error(await json.text())
    }
    return await json.json()
}

function errorHandle(error) {
    const p = document.createElement("h1");
    p.innerText = error;
    document.body.prepend(p);
    console.log(error);
}

/**
 * @param {SubjectRelateMap} root
 */
function onData(root) {
    root.node.sort((a, b) => {
        if (a.date !== b.date)
            return a.date - b.date
        return a.id - b.id
    })

    document.getElementById('container').innerHTML = root.node.map(item => render(item)).join('<br>\n')
    document.getElementById(`item_${_subject_id}`).scrollIntoView()
    $('.card').on('click', function (e) {
        window.open(`https://bgm.tv/subject/${this.id.split('_')[1]}`, '_blank', 'noopener');
    })
}

const _subject_id = getQueryVariable("subject");

if (!_subject_id) {
    errorHandle(new Error("请指定subject参数"));
} else {
    fetchData().then(onData).catch(errorHandle);
}
