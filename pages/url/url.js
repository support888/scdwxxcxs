/**
 * LLS俱乐部 - 内嵌网页容器
 */
Page({
  data: { url: '' },

  onLoad(options) {
    if (options.url) {
      this.setData({ url: decodeURIComponent(options.url) });
    }
  }
});
