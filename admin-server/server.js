/**
 * ============================================================================
 * LLS俱乐部 - 本地后台服务(零依赖,Node 原生 http)
 * ----------------------------------------------------------------------------
 * 启动：node server.js   (默认端口 3000,可用 PORT=xxxx 覆盖)
 * 后台：http://localhost:3000        管理员 Lucas66 / 19308400219
 *
 * 接口分三块：
 *   1. /api/admin/*  后台管理接口(Token 鉴权)
 *   2. /api/mp/*     小程序业务接口(与原云函数协议一致:{action,...} → {ok,data})
 *   3. /*            后台管理静态页面(public/)
 * ============================================================================
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const store = require('./db.js');

const PORT = Number(process.env.PORT || 3000);
const db = store.load();

/* ------------------------------ 通用工具 ------------------------------ */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function send(res, code, obj) {
  const body = typeof obj === 'string' ? obj : JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise(function (resolve) {
    // 按块收集后一次性解码:逐块字符串拼接会在多字节字符(中文/emoji)被
    // TCP 分包截断时产生乱码
    const chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { resolve({}); }
    });
    req.on('error', function () { resolve({}); });
  });
}

/* ------------------------------ 鉴权 ------------------------------ */
const tokens = new Set(); // 内存 Token(重启失效,重新登录即可)

function makeToken() {
  const t = 'tk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  tokens.add(t);
  return t;
}

function authed(req) {
  const h = req.headers['authorization'] || '';
  const t = h.replace(/^Bearer\s+/i, '');
  return t && tokens.has(t);
}

/* ------------------------------ 业务查询 ------------------------------ */
function findFeed(id) {
  const k = String(id);
  for (let i = 0; i < db.feeds.length; i++) {
    if (String(db.feeds[i].id) === k) return db.feeds[i];
  }
  for (const pid in db.playerFeeds) {
    const wall = db.playerFeeds[pid] || [];
    for (let j = 0; j < wall.length; j++) {
      if (String(wall[j].id) === k) return wall[j];
    }
  }
  return null;
}

function commentList(id) {
  const k = String(id);
  return (db.feedComments[k] || []).slice();
}

function addComment(id, content) {
  const k = String(id);
  const c = {
    id: 'c' + Date.now(),
    name: '我', avatarText: '我',
    content: content, time: store.formatTime(), likes: 0
  };
  db.feedComments[k] = (db.feedComments[k] || []).concat([c]);
  const feed = findFeed(id);
  if (feed) feed.comments = (feed.comments || 0) + 1;
  store.save();
  return { comment: c, comments: feed ? feed.comments : 1 };
}

function playerFeedsOf(pid) {
  return (db.playerFeeds[String(pid)] || []).slice();
}

/* ------------------------------ 图片处理 ------------------------------ */
/** 判断是否为不可持久化的本地临时路径(开发者工具 http://tmp/ / 真机 wxfile:// / blob: 等) */
function isTempPath(p) {
  if (typeof p !== 'string' || !p) return true;
  if (p.indexOf('http://tmp/') === 0) return true;             // 开发者工具临时文件
  if (/^(wxfile|httplocal|blob|file):/i.test(p)) return true;  // 真机/其他本地协议
  return false;
}

/** 过滤动态里的临时图片路径,过滤后若无图则用封面占位(防止渲染失效图片导致闪退) */
function sanitizeFeedImages(f) {
  if (Array.isArray(f.images)) {
    f.images = f.images.filter(function (p) { return !isTempPath(p); });
    if (f.images.length === 0 && f.cover) f.coverText = f.coverText || '图片';
  } else {
    f.images = [];
  }
  return f;
}

/** 上传目录(跟随数据目录,位于小程序项目之外) */
const UPLOAD_DIR = path.join(store.DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const IMG_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' };

/** 保存 base64 图片,返回可持久访问的相对 URL */
function saveUpload(file) {
  const ext = IMG_EXT[file.type] || (/\.(jpe?g|png|gif|webp)$/i.test(file.name || '') ? '' : '.jpg');
  const name = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), Buffer.from(file.data || '', 'base64'));
  return '/uploads/' + name;
}

function incomeSummary() {
  let total = 0, withdrawn = 0, today = 0, month = 0;
  const now = store.formatTime();            // "MM-DD HH:mm"
  const todayKey = now.slice(0, 5);          // "MM-DD"
  const monthKey = now.slice(0, 2);          // "MM"
  db.incomeLogs.forEach(function (x) {
    if (x.amount > 0) {
      total += x.amount;
      if (String(x.time || '').indexOf(todayKey) === 0) today += x.amount;
      if (String(x.time || '').indexOf(monthKey) === 0) month += x.amount;
    } else {
      withdrawn += -x.amount;
    }
  });
  return {
    balance: Math.max(0, total - withdrawn),
    totalIncome: total,
    withdrawn: withdrawn,
    pending: 0,
    todayIncome: today,
    monthIncome: month,
    list: db.incomeLogs.slice()
  };
}

/* ------------------------------ 小程序 API(原云函数协议) ------------------------------ */
function mpHandler(module, body) {
  const action = body.action;
  const p = body;
  const D = function (data) { return { ok: true, data: data }; };

  if (module === 'lls-login') {
    return D({ openid: 'local-user-' + (db.admin.username || 'admin') });
  }

  if (module === 'lls-security') {
    // 服务端内容安全锚点:当前直接放行,后续可接入检测服务
    return D({ checked: true, pass: true });
  }

  // 图片上传:body {files:[{name,type,data(base64)}]} → {urls:[...]}
  // 图片落盘 data/uploads/,通过 /uploads/xxx 静态访问,持久可用
  if (module === 'upload') {
    const urls = [];
    (Array.isArray(body.files) ? body.files : []).forEach(function (f) {
      if (f && f.data) { try { urls.push(saveUpload(f)); } catch (e) { /* ignore */ } }
    });
    return D({ urls: urls });
  }

  if (module === 'lls-feed') {
    switch (action) {
      case 'list': {
        const list = store.clone(db.feeds);
        const cate = p.category || '最新';
        if (cate === '点赞') list.sort((a, b) => b.likes - a.likes);
        else if (cate === '热评') list.sort((a, b) => b.comments - a.comments);
        else if (cate === '人气') list.sort((a, b) => b.views - a.views);
        else if (cate === '推荐') list.sort((a, b) => (b.likes + b.views) - (a.likes + a.views));
        return D(list.map(sanitizeFeedImages));
      }
      case 'detail': {
        const feed = findFeed(p.id);
        if (!feed) return { ok: false, message: '动态不存在' };
        feed.views = (feed.views || 0) + 1;
        store.save();
        const detail = store.clone(feed);
        // 兜底:过滤已失效的本地临时图片路径 + 补全字段,避免渲染时 TypeError/闪退
        sanitizeFeedImages(detail);
        detail.commentList = commentList(p.id);
        return D(detail);
      }
      case 'view': {
        const feed = findFeed(p.id);
        if (feed) { feed.views = (feed.views || 0) + 1; store.save(); }
        return D({ views: feed ? feed.views : 0 });
      }
      case 'like': {
        const feed = findFeed(p.id);
        if (!feed) return { ok: false, message: '动态不存在' };
        feed.liked = !feed.liked;
        feed.likes = Math.max(0, (feed.likes || 0) + (feed.liked ? 1 : -1));
        store.save();
        return D({ liked: feed.liked, likes: feed.likes });
      }
      case 'comments': return D(commentList(p.id));
      case 'comment': return D(addComment(p.id, p.content));
      case 'publish': {
        const feed = Object.assign({
          id: 'f' + Date.now(),
          name: '我', avatarText: '我', avatar: '', gender: 'm',
          time: store.formatTime(), city: '本地',
          content: '', cover: false, coverText: '', images: [],
          tag: '', views: 0, comments: 0, likes: 0, liked: false
        }, p);
        delete feed.action;
        // 只保留可持久访问的图片 URL,临时路径会导致详情页渲染闪退
        if (Array.isArray(feed.images)) {
          feed.images = feed.images.filter(function (u) { return !isTempPath(u); });
          feed.cover = feed.images.length > 0;
          feed.coverText = feed.cover ? ('图片 ' + feed.images.length + ' 张') : '';
        } else {
          feed.images = [];
          feed.cover = false;
          feed.coverText = '';
        }
        db.feeds.unshift(feed);
        store.save();
        return D(feed);
      }
      case 'followList': {
        const out = [];
        db.players.filter((x) => x.followed).forEach(function (pl) {
          playerFeedsOf(pl.id).forEach(function (f) {
            out.push(sanitizeFeedImages(Object.assign(store.clone(f), { authorId: pl.id })));
          });
        });
        return D(out);
      }
    }
    return { ok: false, message: '未知操作: ' + action };
  }

  if (module === 'lls-player') {
    switch (action) {
      case 'list': {
        let list = store.clone(db.players);
        const cate = p.category;
        if (cate && cate !== 'all') {
          list = list.filter(function (x) {
            if (cate === 'pei') return (x.tags || []).indexOf('陪玩') > -1 || x.category === 'pei';
            return x.category === cate;
          });
        }
        return D(list);
      }
      case 'detail': {
        const pl = db.players.filter((x) => String(x.id) === String(p.id))[0] || db.players[0];
        const out = store.clone(pl);
        out.reviews = store.clone(db.playerReviews[String(pl.id)] || []);
        out.feeds = store.clone(playerFeedsOf(pl.id));
        return D(out);
      }
      case 'follow': {
        const pl = db.players.filter((x) => String(x.id) === String(p.id))[0];
        if (!pl) return { ok: false, message: '护航员不存在' };
        pl.followed = !pl.followed;
        pl.fansCount = Math.max(0, (pl.fansCount || 0) + (pl.followed ? 1 : -1));
        store.save();
        return D({ followed: pl.followed, fansCount: pl.fansCount });
      }
      case 'reviews': return D(store.clone(db.playerReviews[String(p.id)] || []));
      case 'followList': return D(store.clone(db.players.filter((x) => x.followed)));
    }
    return { ok: false, message: '未知操作: ' + action };
  }

  if (module === 'lls-user') {
    switch (action) {
      case 'hot': {
        let list = store.clone(db.users);
        if (p.gender && p.gender !== 'all') list = list.filter((u) => u.gender === p.gender);
        if (p.limit) list = list.slice(0, Number(p.limit));
        return D(list.sort((a, b) => (b.fansCount || 0) - (a.fansCount || 0)));
      }
      case 'followUser': {
        const u = db.users.filter((x) => x.openid === p.targetOpenid)[0];
        if (!u) return { ok: false, message: '用户不存在' };
        u.followed = !u.followed;
        u.fansCount = Math.max(0, (u.fansCount || 0) + (u.followed ? 1 : -1));
        store.save();
        return D({ followed: u.followed, fansCount: u.fansCount });
      }
      case 'followedUsers': return D(store.clone(db.users.filter((u) => u.followed)));
      case 'searchUsers': {
        const kw = String(p.keyword || '').trim().toLowerCase();
        if (!kw) return D([]);
        const out = store.clone(db.users.filter(function (u) {
          const nick = String(u.nickname || '').toLowerCase();
          const oid = String(u.openid || '').toLowerCase();
          return nick.indexOf(kw) > -1 || oid === kw || oid.indexOf(kw) === 0;
        })).map(function (u) {
          u.shortId = String(u.openid || '').slice(-6);
          u.id = u.openid;
          u.isMe = false;
          return u;
        });
        // 当前登录用户本人(本地 profile)若命中,并入结果首位
        try {
          const profile = db.profile || {};
          const nick = String(profile.nickname || '').toLowerCase();
          const phone = String(profile.phone || '');
          const matchNick = nick && nick.indexOf(kw) > -1;
          const matchPhone = phone && (phone.toLowerCase() === kw || phone.indexOf(kw) === 0);
          if (matchNick || matchPhone) {
            const me = Object.assign({}, profile, {
              id: 'me',
              openid: 'me',
              isMe: true,
              shortId: phone ? phone.slice(-6) : '000000',
              fansCount: 0
            });
            out.unshift(me);
          }
        } catch (e) { /* ignore */ }
        return D(out.sort(function (a, b) { return (b.fansCount || 0) - (a.fansCount || 0); }));
      }
      case 'userDetail': {
        const oid = String(p.openid || '');
        if (oid === 'me') {
          const me = Object.assign({}, store.clone(db.profile), {
            id: 'me',
            openid: 'me',
            isMe: true,
            avatarText: (db.profile.nickname || '我').slice(0, 1).toUpperCase()
          });
          return D(me);
        }
        const u = db.users.filter(function (x) { return x.openid === oid; })[0];
        if (!u) return D({ openid: oid, nickname: '未知用户', isMe: false, fansCount: 0 });
        return D(Object.assign({}, store.clone(u), {
          id: u.openid,
          openid: u.openid,
          isMe: false,
          avatarText: (u.nickname || 'U').slice(0, 1).toUpperCase(),
          shortId: String(u.openid || '').slice(-6),
          fansCount: u.fansCount || 0
        }));
      }
      case 'profileGet': return D(store.clone(db.profile));
      case 'profileUpdate': {
        const patch = store.clone(p);
        delete patch.action;
        db.profile = Object.assign({}, db.profile, patch);
        store.save();
        return D(store.clone(db.profile));
      }
      case 'settingsGet': return D(store.clone(db.settings));
      case 'settingsUpdate': {
        const patch = store.clone(p);
        delete patch.action;
        db.settings = Object.assign({}, db.settings, patch);
        store.save();
        return D(store.clone(db.settings));
      }
      case 'coupons': return D({ count: db.coupons.length, list: store.clone(db.coupons) });
      case 'income': return D(incomeSummary());
    }
    return { ok: false, message: '未知操作: ' + action };
  }

  return { ok: false, message: '未知模块: ' + module };
}

/* ------------------------------ 后台管理 API ------------------------------ */
const ADMIN_COLS = ['users', 'players', 'feeds', 'coupons', 'incomeLogs'];

function adminStats() {
  let feedViews = 0, feedLikes = 0, feedComments = 0;
  db.feeds.forEach(function (f) {
    feedViews += f.views || 0;
    feedLikes += f.likes || 0;
    feedComments += f.comments || 0;
  });
  const income = incomeSummary();
  return {
    users: db.users.length,
    players: db.players.length,
    feeds: db.feeds.length,
    feedViews: feedViews,
    feedLikes: feedLikes,
    feedComments: feedComments,
    coupons: db.coupons.length,
    balance: income.balance,
    monthIncome: income.monthIncome,
    admin: db.admin.displayName || db.admin.username
  };
}

/** 展开评论(带所属动态) */
function flatComments() {
  const out = [];
  for (const fid in db.feedComments) {
    (db.feedComments[fid] || []).forEach(function (c) {
      out.push(Object.assign(store.clone(c), { feedId: fid }));
    });
  }
  return out.reverse();
}

async function handleAdmin(req, res, pathname) {
  const parts = pathname.split('/').filter(Boolean); // ['api','admin',...]
  const sub = parts.slice(2);
  const body = await readBody(req);

  // 登录(免鉴权)
  if (req.method === 'POST' && sub[0] === 'login') {
    const u = String(body.username || '').trim();
    const pw = String(body.password || '');
    if (u === db.admin.username && store.sha256(pw) === db.admin.passwordHash) {
      return send(res, 200, { ok: true, token: makeToken(), admin: db.admin.displayName || u });
    }
    return send(res, 401, { ok: false, message: '用户名或密码错误' });
  }

  // 以下均需鉴权
  if (!authed(req)) return send(res, 401, { ok: false, message: '未登录或登录已过期' });

  // 概览
  if (req.method === 'GET' && sub[0] === 'stats') return send(res, 200, { ok: true, data: adminStats() });

  // 配置(公告/平台开关/设置)
  if (sub[0] === 'config') {
    if (req.method === 'GET') return send(res, 200, { ok: true, data: db.config });
    if (req.method === 'PUT') {
      db.config = Object.assign({}, db.config, body);
      store.save();
      return send(res, 200, { ok: true, data: db.config });
    }
  }

  // 评论(只读 + 删除)
  if (sub[0] === 'comments') {
    if (req.method === 'GET') return send(res, 200, { ok: true, data: flatComments() });
    if (req.method === 'DELETE' && sub[1]) {
      const fid = sub[1], cid = sub[2];
      const list = db.feedComments[fid] || [];
      const idx = list.findIndex((c) => String(c.id) === String(cid));
      if (idx > -1) {
        list.splice(idx, 1);
        db.feedComments[fid] = list;
        const feed = findFeed(fid);
        if (feed) feed.comments = Math.max(0, (feed.comments || 0) - 1);
        store.save();
      }
      return send(res, 200, { ok: true });
    }
  }

  // 通用 CRUD 集合
  if (ADMIN_COLS.indexOf(sub[0]) > -1) {
    const colName = sub[0];
    const list = db[colName];
    const idOf = function (it) { return String(it.openid || it.id); };

    if (req.method === 'GET' && !sub[1]) return send(res, 200, { ok: true, data: store.clone(list) });

    if (req.method === 'POST' && !sub[1]) {
      const item = Object.assign({}, body);
      if (colName === 'users') {
        item.openid = item.openid || ('u_' + Date.now());
        item.fansCount = Number(item.fansCount) || 0;
        item.followed = false;
      } else if (colName === 'feeds') {
        item.id = 'f' + Date.now();
        item.time = store.formatTime();
        item.views = item.views || 0;
        item.likes = item.likes || 0;
        item.comments = 0;
        item.liked = false;
        item.avatarText = (item.name || '用').slice(0, 1);
      } else if (colName === 'coupons') {
        item.id = store.nextId(db.coupons, 'cp');
      } else if (colName === 'incomeLogs') {
        item.id = 'i' + Date.now();
        item.time = store.formatTime();
        item.amount = Number(item.amount) || 0;
      }
      list.unshift(item);
      store.save();
      return send(res, 200, { ok: true, data: item });
    }

    if (sub[1]) {
      const idx = list.findIndex(function (it) { return idOf(it) === String(sub[1]); });
      if (req.method === 'PUT' && idx > -1) {
        list[idx] = Object.assign({}, list[idx], body);
        store.save();
        return send(res, 200, { ok: true, data: list[idx] });
      }
      if (req.method === 'DELETE' && idx > -1) {
        list.splice(idx, 1);
        store.save();
        return send(res, 200, { ok: true });
      }
    }
  }

  // 重置演示数据
  if (req.method === 'POST' && sub[0] === 'reset') {
    store.reset();
    return send(res, 200, { ok: true });
  }

  // 修改管理员密码
  if (req.method === 'POST' && sub[0] === 'password') {
    const old = String(body.oldPassword || '');
    const nw = String(body.newPassword || '');
    if (store.sha256(old) !== db.admin.passwordHash) {
      return send(res, 400, { ok: false, message: '原密码错误' });
    }
    if (nw.length < 6) return send(res, 400, { ok: false, message: '新密码至少 6 位' });
    db.admin.passwordHash = store.sha256(nw);
    store.save();
    return send(res, 200, { ok: true });
  }

  return send(res, 404, { ok: false, message: '接口不存在: ' + pathname });
}

/* ------------------------------ 静态资源 ------------------------------ */
function serveStatic(res, pathname) {
  // 上传的图片存放在数据目录 uploads/,通过 /uploads/xxx 访问(数据目录在项目外)
  let root = path.join(__dirname, 'public');
  let fp = pathname === '/' ? '/index.html' : pathname;
  if (fp.indexOf('/uploads/') === 0) root = store.DATA_DIR;
  fp = path.normalize(path.join(root, fp));
  if (!fp.startsWith(root)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.readFile(fp, function (err, buf) {
    if (err) { res.writeHead(404); return res.end('Not Found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
}

/* ------------------------------ 入口 ------------------------------ */
const server = http.createServer(function (req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }
  const parsed = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsed.pathname);

  if (pathname.startsWith('/api/admin/')) return handleAdmin(req, res, pathname);
  if (pathname.startsWith('/api/mp/')) {
    const mod = pathname.split('/').filter(Boolean)[2];
    readBody(req).then(function (body) {
      try {
        send(res, 200, mpHandler(mod, body || {}));
      } catch (e) {
        send(res, 500, { ok: false, message: '服务异常: ' + e.message });
      }
    });
    return;
  }
  if (pathname.startsWith('/api/')) return send(res, 404, { ok: false, message: 'Not Found' });
  serveStatic(res, pathname);
});

server.listen(PORT, function () {
  console.log('=====================================================');
  console.log('  LLS俱乐部 本地后台已启动');
  console.log('  后台管理 : http://localhost:' + PORT);
  console.log('  管理员   : ' + db.admin.username + ' / 密码 ' + db.admin.phone + '(可在后台修改)');
  console.log('  小程序   : app.js 里的 apiBaseUrl 保持 http://127.0.0.1:' + PORT);
  console.log('  数据文件 : ' + store.DB_FILE);
  console.log('=====================================================');
});
