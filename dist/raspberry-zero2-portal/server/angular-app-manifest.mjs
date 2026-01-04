
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 0,
    "route": "/news"
  },
  {
    "renderMode": 0,
    "route": "/news-settings"
  },
  {
    "renderMode": 0,
    "route": "/settings"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 1406, hash: 'df87a862acfbfc1280943f6fb2d0a222a3e8035fd6d93177af04c71d829bbd9c', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1017, hash: '78d0f4e6e50ad5f8d902237a20b518eae4791d03b8e66c6bd57932956f41f098', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-OHXTCM43.css': {size: 1885, hash: 'liHzXL3JTuA', text: () => import('./assets-chunks/styles-OHXTCM43_css.mjs').then(m => m.default)}
  },
};
