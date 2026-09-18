/**
 * ============================================================================
 * LLS俱乐部 - 业务数据接口层(统一出口)
 * ----------------------------------------------------------------------------
 * 策略：优先请求本地后台(admin-server, node server.js 启动,端口 3000)；
 *       后台未启动 / 请求失败时自动降级到本地演示数据(utils/mock.js)。
 *       页面代码无需关心后端是否就绪，直接 api.xxx() 即可。
 *
 * 页面用法：
 *   const api = require('../../utils/api.js');
 *   api.feedList({ category: '最新' }).then(list => this.setData({ feedList: list }));
 * ============================================================================
 */
const mock = require('./mock.js');

/** 读取后台基址(占位配置视为未启用) */
function getBase() {
  const app = getApp();
  const base = (app && app.globalData && app.globalData.apiBaseUrl) || '';
  const isPlaceholder = !base || base.indexOf('example.com') > -1;
  return isPlaceholder ? '' : base.replace(/\/+$/, '');
}

/** 请求本地后台:POST /api/mp/:module,协议与原云函数一致({action,...} → {ok,data}) */
function request(name, payload) {
  return new Promise(function (resolve, reject) {
    const base = getBase();
    if (!base) { reject(new Error('NO_BACKEND')); return; }
    wx.request({
      url: base + '/api/mp/' + name,
      method: 'POST',
      data: payload || {},
      success: function (res) {
        const r = res && res.data;
        if (r && r.ok) { resolve(r); return; }
        const err = new Error((r && r.message) || 'BACKEND_ERROR');
        err.code = 'BACKEND_ERROR';
        reject(err);
      },
      fail: function (e) {
        const err = e || {};
        err.code = 'BACKEND_FAIL';
        reject(err);
      }
    });
  });
}

/**
 * 统一调用：后台成功且 ok=true → 返回 data；否则走本地兜底
 * @param {string} name 模块名(对应后台 /api/mp/:module)
 * @param {string} action 动作
 * @param {object} params 参数
 * @param {Function} fallback 本地兜底
 */
function call(name, action, params, fallback) {
  const payload = Object.assign({ action: action }, params || {});
  return request(name, payload).then(function (res) {
    return res.data;
  }).catch(function () {
    return fallback();
  });
}

module.exports = {
  /* ---------------------- 广场动态 ---------------------- */
  /** 动态列表 @param {{category?:string, limit?:number}} params */
  feedList(params) {
    return call('lls-feed', 'list', params, function () { return mock.feedList(params); });
  },
  /** 动态详情(含浏览量 +1、评论列表) */
  feedDetail(id) {
    return call('lls-feed', 'detail', { id: id }, function () { return mock.feedDetail(id); });
  },
  /** 浏览数 +1 @returns {{views:number}} */
  addView(id) {
    return call('lls-feed', 'view', { id: id }, function () { return mock.addView(id); });
  },
  /** 点赞/取消 @returns {{liked:boolean, likes:number}} */
  toggleLike(id) {
    return call('lls-feed', 'like', { id: id }, function () { return mock.toggleLike(id); });
  },
  /** 评论列表 */
  commentList(id) {
    return call('lls-feed', 'comments', { id: id }, function () { return mock.commentList(id); });
  },
  /** 新增评论 @returns {{comment:object, comments:number}} */
  addComment(id, content, extra) {
    const params = Object.assign({ id: id, content: content }, extra || {});
    return call('lls-feed', 'comment', params, function () { return mock.addComment(id, content); });
  },
  /** 发布动态 */
  publishFeed(data) {
    return call('lls-feed', 'publish', data, function () { return mock.publishFeed(data); });
  },
  /** 上传图片到本地后台(data/uploads/,持久可访问);后台未启动时原样返回临时路径 */
  uploadImages(paths) {
    paths = paths || [];
    if (!paths.length) return Promise.resolve([]);
    const base = getBase();
    if (!base) return Promise.resolve(paths); // 无后台:当次会话内临时路径可用

    // 本地临时路径(开发者工具 http://tmp/、真机 wxfile://)需要上传后才能持久使用
    const need = paths.filter(function (p) { return !/^https?:\/\//i.test(p) || p.indexOf('http://tmp/') === 0; });
    if (!need.length) return Promise.resolve(paths);

    const fsm = wx.getFileSystemManager();
    const files = [];
    let finished = 0;
    return new Promise(function (resolve) {
      const done = function () {
        finished++;
        if (finished < paths.length) return;
        // 逐张读 base64 → POST /api/mp/upload,返回持久 URL
        Promise.all(files.map(function (f) {
          if (!f) return null;
          return new Promise(function (res2) {
            fsm.readFile({
              filePath: f,
              encoding: 'base64',
              success: function (r) {
                res2({ name: f.split('/').pop(), type: '', data: r.data });
              },
              fail: function () { res2(null); }
            });
          });
        })).then(function (list) {
          const payload = list.filter(Boolean);
          if (!payload.length) return resolve(paths.filter(function (p) { return /^https?:\/\//i.test(p) && p.indexOf('http://tmp/') !== 0; }));
          request('upload', { action: 'upload', files: payload }).then(function (r) {
            const urls = (r.data && r.data.urls) || [];
            // 已是 http 的用原值,其余按上传返回的 URL 替换
            const out = [];
            let ui = 0;
            paths.forEach(function (p) {
              if (/^https?:\/\//i.test(p) && p.indexOf('http://tmp/') !== 0) out.push(p);
              else if (urls[ui]) { out.push(base + urls[ui]); ui++; }
            });
            resolve(out);
          }).catch(function () { resolve([]); });
        });
      };
      paths.forEach(function (p) {
        if (/^https?:\/\//i.test(p) && p.indexOf('http://tmp/') !== 0) { files.push(null); done(); return; }
        files.push(p);
        done();
      });
    });
  },

  /* ---------------------- 关注(广场"关注"Tab) ---------------------- */
  /** 我关注的护航员列表 */
  followList() {
    return call('lls-player', 'followList', {}, function () { return mock.followList(); });
  },
  /** 关注的人发布的动态(含 authorId，可跳转其主页) */
  followFeeds() {
    return call('lls-feed', 'followList', {}, function () { return mock.followFeeds(); });
  },

  /* ---------------------- 注册用户热门榜(首页"热门推荐") ---------------------- */
  /** 热门注册用户(按粉丝数降序) @param {{gender?:string, limit?:number}} params */
  hotUsers(params) {
    return call('lls-user', 'hot', params, function () { return mock.hotUsers(params); });
  },
  /** 关注/取关注册用户 @returns {{followed:boolean, fansCount:number}} */
  followUser(targetOpenid) {
    return call('lls-user', 'followUser', { targetOpenid: targetOpenid }, function () {
      return mock.followUser(targetOpenid);
    });
  },
  /** 我关注的注册用户 */
  followedUsers() {
    return call('lls-user', 'followedUsers', {}, function () { return mock.followedUsers(); });
  },
  /** 搜索注册用户(按昵称 / ID) */
  searchUsers(keyword) {
    return call('lls-user', 'searchUsers', { keyword: keyword }, function () {
      return mock.searchUsers(keyword);
    });
  },
  /** 注册用户详情(自己 openid='me'，其余按 demoUsers 查找) */
  userDetail(openid) {
    return call('lls-user', 'userDetail', { openid: openid }, function () {
      return mock.userDetail(openid);
    });
  },

  /* ---------------------- 护航员/用户展示页 ---------------------- */
  /** 护航员列表 @param {{category?:string}} params */
  playerList(params) {
    return call('lls-player', 'list', params, function () { return mock.playerList(params); });
  },
  /** 护航员详情(含评价、动态墙) */
  playerDetail(id) {
    return call('lls-player', 'detail', { id: id }, function () { return mock.playerDetail(id); });
  },
  /** 关注/取关 @returns {{followed:boolean, fansCount:number}} */
  toggleFollow(id) {
    return call('lls-player', 'follow', { id: id }, function () { return mock.toggleFollow(id); });
  },  /** 评价列表 */
  playerReviews(id) {
    return call('lls-player', 'reviews', { id: id }, function () { return mock.playerReviews(id); });
  },

  /* ---------------------- 账户与资料 ---------------------- */
  /** 我的资料(资料修改页回填) */
  profile() {
    return call('lls-user', 'profileGet', {}, function () { return mock.profile(); });
  },
  /** 保存资料 */
  saveProfile(data) {
    return call('lls-user', 'profileUpdate', data, function () { return mock.saveProfile(data); });
  },

  /* ---------------------- 设置 ---------------------- */
  /** 设置项开关 */
  settings() {
    return call('lls-user', 'settingsGet', {}, function () { return mock.settings(); });
  },
  /** 更新设置项 */
  saveSettings(patch) {
    return call('lls-user', 'settingsUpdate', patch, function () { return mock.saveSettings(patch); });
  },

  /* ---------------------- 我的优惠券 ---------------------- */
  /** 可用优惠券列表(附带 count) */
  coupons() {
    return call('lls-user', 'coupons', {}, function () {
      const list = mock.couponList();
      return { count: list.length, list: list };
    });
  },

  /* ---------------------- 我的收入 ---------------------- */
  /** 收入总览 + 明细 */
  income() {
    return call('lls-user', 'income', {}, function () { return mock.income(); });
  }
};
