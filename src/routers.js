const routers = []
const context = require.context('./pages', true, /.js$/);
context.keys().forEach(key => {
  const path = key.replace(/(^\.|\.js$)/g, '')
    .replace(/index/g, '')
    .replace(/\$/g, ':')
    .replace(/\/+/g, '/');
  const Comp = context(key).default
  routers.push({
    path: path,
    element: <Comp />,
  });
});

export default routers;