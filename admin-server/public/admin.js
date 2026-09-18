/* LLS俱乐部 - 后台管理前端逻辑 */
(function () {
  var TOKEN_KEY = 'lls_admin_token';
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- 基础请求 ---------- */
  function api(method, path, body) {
    return fetch(path, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (localStorage.getItem(TOKEN_KEY) || '')
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().then(function (j) {
        if (r.status === 401) { logout(); throw new Error('登录已过期'); }
        if (!j.ok) throw new Error(j.message || '请求失败');
        return j;
      });
    });
  }

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- 登录 ---------- */
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    $('loginMask').style.display = 'flex';
    $('layout').style.display = 'none';
  }

  function doLogin() {
    var u = $('loginUser').value.trim();
    var p = $('loginPass').value;
    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) { $('loginTip').textContent = j.message || '登录失败'; return; }
      localStorage.setItem(TOKEN_KEY, j.token);
      $('loginTip').textContent = '';
      enterAdmin(j.admin);
    }).catch(function () { $('loginTip').textContent = '网络异常,请确认服务已启动'; });
  }

  function enterAdmin(name) {
    $('loginMask').style.display = 'none';
    $('layout').style.display = 'flex';
    $('adminName').textContent = '管理员:' + (name || '');
    switchView('dashboard');
  }

  /* ---------- 弹窗 ---------- */
  var modalOkFn = null;
  function openModal(title, fieldsHTML, onOk) {
    $('modalTitle').textContent = title;
    $('modalBody').innerHTML = fieldsHTML;
    $('modalMask').style.display = 'flex';
    modalOkFn = onOk;
  }
  function closeModal() { $('modalMask').style.display = 'none'; modalOkFn = null; }
  function collectForm() {
    var data = {};
    var els = $('modalBody').querySelectorAll('[data-key]');
    els.forEach(function (el) {
      var v = el.value;
      if (el.type === 'number') v = Number(v) || 0;
      if (el.dataset.type === 'json') { try { v = JSON.parse(v || '[]'); } catch (e) { v = []; } }
      if (el.dataset.type === 'bool') v = el.checked;
      data[el.dataset.key] = v;
    });
    return data;
  }

  function fieldHTML(f, val) {
    var v = esc(val == null ? '' : val);
    if (f.type === 'json') v = esc(JSON.stringify(val || []));
    var input;
    if (f.type === 'textarea') {
      input = '<textarea class="form-textarea" data-key="' + f.key + '">' + v + '</textarea>';
    } else if (f.type === 'select') {
      input = '<select class="form-select" data-key="' + f.key + '">' +
        f.options.map(function (o) {
          var ov = typeof o === 'string' ? o : o.value;
          var ot = typeof o === 'string' ? o : o.text;
          return '<option value="' + esc(ov) + '"' + (String(val) === String(ov) ? ' selected' : '') + '>' + esc(ot) + '</option>';
        }).join('') + '</select>';
    } else if (f.type === 'bool') {
      input = '<input class="form-input" type="checkbox" data-type="bool" data-key="' + f.key + '"' + (val ? ' checked' : '') + '>';
    } else if (f.type === 'json') {
      input = '<input class="form-input" data-type="json" data-key="' + f.key + '" value="' + v + '" placeholder=\'["护航","陪玩"]\'>';
    } else {
      input = '<input class="form-input" type="' + (f.type || 'text') + '" data-key="' + f.key + '" value="' + v + '">';
    }
    return '<div class="form-row"><label class="form-label">' + f.label + '</label>' + input + '</div>';
  }

  /* ---------- 集合配置 ---------- */
  var genderTag = function (g) {
    return g === 'f' ? '<span class="tag f">♀ 女</span>' : '<span class="tag">♂ 男</span>';
  };

  var SECTIONS = {
    users: {
      title: '注册用户', api: '/api/admin/users', idKey: 'openid',
      cols: ['账号(openid)', '昵称', '性别', '城市', '粉丝', '签名'],
      row: function (u) {
        return [esc(u.openid), esc(u.nickname), genderTag(u.gender), esc(u.city),
          '<span class="tag gray">' + (u.fansCount || 0) + '</span>', esc(u.signature || '-')];
      },
      fields: [
        { key: 'nickname', label: '昵称' },
        { key: 'gender', label: '性别', type: 'select', options: [{ value: 'm', text: '男' }, { value: 'f', text: '女' }] },
        { key: 'city', label: '城市' },
        { key: 'signature', label: '签名' },
        { key: 'fansCount', label: '粉丝数', type: 'number' }
      ],
      blank: { gender: 'm', fansCount: 0 }
    },
    players: {
      title: '护航员', api: '/api/admin/players', idKey: 'id',
      cols: ['ID', '名称', '类别', '性别', '评分', '接单', '粉丝', '段位'],
      row: function (p) {
        var catMap = { hu: '护航单', pei: '陪练单', pai: '派单' };
        return [esc(p.id), esc(p.name),
          '<span class="tag">' + esc(catMap[p.category] || p.category) + '</span>',
          genderTag(p.gender), esc(p.score), p.orders || 0, p.fansCount || 0, esc(p.rank)];
      },
      fields: [
        { key: 'name', label: '名称' },
        { key: 'category', label: '类别', type: 'select', options: [{ value: 'hu', text: '护航单' }, { value: 'pei', text: '陪练单' }, { value: 'pai', text: '派单' }] },
        { key: 'gender', label: '性别', type: 'select', options: [{ value: 'm', text: '男' }, { value: 'f', text: '女' }] },
        { key: 'rank', label: '段位(神话/王牌...)' },
        { key: 'score', label: '评分' },
        { key: 'orders', label: '接单量', type: 'number' },
        { key: 'fansCount', label: '粉丝数', type: 'number' },
        { key: 'city', label: '城市' },
        { key: 'skillIntro', label: '技能介绍' },
        { key: 'badge', label: '角标(日常派单...)' },
        { key: 'tags', label: '标签(JSON数组)', type: 'json' },
        { key: 'signature', label: '签名', type: 'textarea' }
      ],
      blank: { category: 'hu', gender: 'm', score: '5.0', rank: '神话', orders: 0, fansCount: 0, tags: ['护航'] }
    },
    feeds: {
      title: '广场动态', api: '/api/admin/feeds', idKey: 'id',
      cols: ['ID', '发布者', '内容', '标签', '浏览', '点赞', '评论', '时间'],
      row: function (f) {
        return [esc(f.id), esc(f.name),
          '<span title="' + esc(f.content) + '">' + esc(String(f.content || '').slice(0, 26)) + (String(f.content || '').length > 26 ? '…' : '') + '</span>',
          f.tag ? '<span class="tag gray">' + esc(f.tag) + '</span>' : '-',
          f.views || 0, f.likes || 0, f.comments || 0, esc(f.time)];
      },
      fields: [
        { key: 'name', label: '发布者昵称' },
        { key: 'gender', label: '性别', type: 'select', options: [{ value: 'm', text: '男' }, { value: 'f', text: '女' }] },
        { key: 'city', label: '城市' },
        { key: 'tag', label: '标签(组队开黑...)' },
        { key: 'content', label: '内容', type: 'textarea' },
        { key: 'views', label: '浏览量', type: 'number' },
        { key: 'likes', label: '点赞数', type: 'number' }
      ],
      blank: { gender: 'm', city: '本地', views: 0, likes: 0 }
    },
    coupons: {
      title: '优惠券', api: '/api/admin/coupons', idKey: 'id',
      cols: ['ID', '券名', '金额(¥)', '使用条件', '有效期至'],
      row: function (c) {
        return [esc(c.id), esc(c.name), '<span class="tag">' + c.amount + '</span>', esc(c.condition || '无门槛'), esc(c.expire)];
      },
      fields: [
        { key: 'name', label: '券名' },
        { key: 'amount', label: '金额(元)', type: 'number' },
        { key: 'condition', label: '使用条件(留空=无门槛)' },
        { key: 'expire', label: '有效期至(2026-12-31)' }
      ],
      blank: { amount: 10, condition: '无门槛', expire: '2026-12-31' }
    },
    incomeLogs: {
      title: '收入记录', api: '/api/admin/incomeLogs', idKey: 'id',
      cols: ['ID', '标题', '类型', '金额(¥)', '时间'],
      row: function (x) {
        return [esc(x.id), esc(x.title),
          '<span class="tag ' + (x.amount < 0 ? 'f' : '') + '">' + esc(x.type) + '</span>',
          (x.amount > 0 ? '+' : '') + x.amount, esc(x.time)];
      },
      fields: [
        { key: 'title', label: '标题' },
        { key: 'type', label: '类型', type: 'select', options: ['订单收入', '提现支出', '平台奖励'] },
        { key: 'amount', label: '金额(提现为负数)', type: 'number' }
      ],
      blank: { type: '订单收入', amount: 0 }
    }
  };

  /* ---------- 视图渲染 ---------- */
  function switchView(name) {
    document.querySelectorAll('#menu a').forEach(function (a) {
      a.classList.toggle('active', a.dataset.view === name);
    });
    $('content').innerHTML = '<div class="empty">加载中...</div>';
    if (name === 'dashboard') return renderDashboard();
    if (name === 'comments') return renderComments();
    if (name === 'config') return renderConfig();
    renderSection(name);
  }

  function renderDashboard() {
    $('viewTitle').textContent = '数据概览';
    $('viewActions').innerHTML = '<button class="btn-ghost" id="btnReset">重置演示数据</button>';
    api('GET', '/api/admin/stats').then(function (j) {
      var s = j.data;
      $('content').innerHTML =
        '<div class="stat-grid">' +
        '<div class="stat-card"><div class="stat-label">注册用户</div><div class="stat-num">' + s.users + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">护航员</div><div class="stat-num">' + s.players + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">广场动态</div><div class="stat-num">' + s.feeds + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">动态总浏览</div><div class="stat-num">' + s.feedViews + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">动态总点赞</div><div class="stat-num">' + s.feedLikes + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">评论总数</div><div class="stat-num">' + s.feedComments + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">优惠券</div><div class="stat-num">' + s.coupons + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">本月收入(¥)</div><div class="stat-num pink">' + s.monthIncome + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">可提现余额(¥)</div><div class="stat-num pink">' + s.balance + '</div></div>' +
        '</div>' +
        '<div class="table-wrap"><table><thead><tr><th>数据文件</th><th>说明</th></tr></thead><tbody>' +
        '<tr><td>admin-server/data/db.json</td><td>所有数据落盘于此文件,可直接备份;小程序与后台共用同一份数据,后台修改即时生效</td></tr>' +
        '</tbody></table></div>';
      $('btnReset').onclick = function () {
        if (!confirm('将清空所有数据并恢复演示数据,确定?')) return;
        api('POST', '/api/admin/reset').then(function () { toast('已重置'); renderDashboard(); });
      };
    }).catch(function (e) { $('content').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
  }

  function renderSection(name) {
    var sec = SECTIONS[name];
    $('viewTitle').textContent = sec.title;
    $('viewActions').innerHTML = '<button class="btn-primary" id="btnNew">+ 新增' + sec.title.slice(0, 3) + '</button>';
    api('GET', sec.api).then(function (j) {
      var list = j.data || [];
      if (!list.length) { $('content').innerHTML = '<div class="empty">暂无数据,点击右上角新增</div>'; }
      else {
        $('content').innerHTML = '<div class="table-wrap"><table><thead><tr>' +
          sec.cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '<th>操作</th></tr></thead><tbody>' +
          list.map(function (it, i) {
            return '<tr>' + sec.row(it).map(function (c) { return '<td>' + c + '</td>'; }).join('') +
              '<td class="actions-cell"><button class="btn-mini" data-act="edit" data-i="' + i + '">编辑</button>' +
              '<button class="btn-danger" data-act="del" data-i="' + i + '">删除</button></td></tr>';
          }).join('') + '</tbody></table></div>';
        var rows = list;
        $('content').querySelectorAll('button[data-act]').forEach(function (btn) {
          btn.onclick = function () {
            var item = rows[Number(btn.dataset.i)];
            if (btn.dataset.act === 'edit') editItem(sec, item);
            else delItem(sec, item);
          };
        });
      }
      $('btnNew').onclick = function () { editItem(sec, null); };
    }).catch(function (e) { $('content').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
  }

  function editItem(sec, item) {
    var isNew = !item;
    var html = sec.fields.map(function (f) {
      return fieldHTML(f, isNew ? (sec.blank || {})[f.key] : item[f.key]);
    }).join('');
    openModal((isNew ? '新增' : '编辑') + sec.title, html, function () {
      var data = collectForm();
      var p = isNew ? api('POST', sec.api, data) : api('PUT', sec.api + '/' + item[sec.idKey], data);
      p.then(function () { toast('已保存'); closeModal(); renderSection(currentView()); })
        .catch(function (e) { toast(e.message); });
    });
  }

  function delItem(sec, item) {
    if (!confirm('确定删除该' + sec.title.slice(2) + '?')) return;
    api('DELETE', sec.api + '/' + item[sec.idKey]).then(function () {
      toast('已删除'); renderSection(currentView());
    }).catch(function (e) { toast(e.message); });
  }

  function renderComments() {
    $('viewTitle').textContent = '评论管理';
    $('viewActions').innerHTML = '';
    api('GET', '/api/admin/comments').then(function (j) {
      var list = j.data || [];
      if (!list.length) { $('content').innerHTML = '<div class="empty">暂无评论</div>'; return; }
      $('content').innerHTML = '<div class="table-wrap"><table><thead><tr><th>所属动态</th><th>评论人</th><th>内容</th><th>时间</th><th>操作</th></tr></thead><tbody>' +
        list.map(function (c) {
          return '<tr><td>' + esc(c.feedId) + '</td><td>' + esc(c.name) + '</td><td>' + esc(c.content) + '</td><td>' + esc(c.time) + '</td>' +
            '<td class="actions-cell"><button class="btn-danger" data-fid="' + esc(c.feedId) + '" data-cid="' + esc(c.id) + '">删除</button></td></tr>';
        }).join('') + '</tbody></table></div>';
      $('content').querySelectorAll('button[data-cid]').forEach(function (btn) {
        btn.onclick = function () {
          if (!confirm('确定删除该评论?')) return;
          api('DELETE', '/api/admin/comments/' + btn.dataset.fid + '/' + btn.dataset.cid)
            .then(function () { toast('已删除'); renderComments(); })
            .catch(function (e) { toast(e.message); });
        };
      });
    }).catch(function (e) { $('content').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
  }

  function renderConfig() {
    $('viewTitle').textContent = '系统设置';
    $('viewActions').innerHTML = '<button class="btn-primary" id="btnSaveCfg">保存设置</button>' +
      '<button class="btn-ghost" id="btnPwd">修改密码</button>';
    api('GET', '/api/admin/config').then(function (j) {
      var c = j.data;
      $('content').innerHTML =
        fieldHTML({ key: 'announcement', label: '平台公告(小程序首页跑马灯)', type: 'textarea' }, c.announcement) +
        fieldHTML({ key: 'promoText', label: '陪玩推广字幕', type: 'textarea' }, c.promoText) +
        '<div class="form-row"><label class="form-label">平台功能开关(bossSwich)</label></div>' +
        fieldHTML({ key: 'is_player', label: '玩家/护航功能 (1开启/0关闭)', type: 'number' }, c.bossSwich.is_player) +
        fieldHTML({ key: 'partner_type', label: '合作模式 (1/0)', type: 'number' }, c.bossSwich.partner_type) +
        fieldHTML({ key: 'is_dianping', label: '点评功能 (1开启/0关闭)', type: 'number' }, c.bossSwich.is_dianping);
      $('btnSaveCfg').onclick = function () {
        var d = collectForm();
        api('PUT', '/api/admin/config', {
          announcement: d.announcement,
          promoText: d.promoText,
          bossSwich: { is_player: d.is_player, partner_type: d.partner_type, is_dianping: d.is_dianping }
        }).then(function () { toast('已保存,小程序重启后生效'); }).catch(function (e) { toast(e.message); });
      };
      $('btnPwd').onclick = function () {
        openModal('修改管理员密码',
          fieldHTML({ key: 'oldPassword', label: '原密码' }, '') +
          fieldHTML({ key: 'newPassword', label: '新密码(至少6位)' }, ''),
          function () {
            api('POST', '/api/admin/password', collectForm())
              .then(function () { toast('密码已修改'); closeModal(); })
              .catch(function (e) { toast(e.message); });
          });
      };
    }).catch(function (e) { $('content').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
  }

  function currentView() {
    var a = document.querySelector('#menu a.active');
    return a ? a.dataset.view : 'dashboard';
  }

  /* ---------- 事件绑定 ---------- */
  $('loginBtn').onclick = doLogin;
  $('loginPass').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
  $('logoutBtn').onclick = function () { logout(); };
  $('modalCancel').onclick = closeModal;
  $('modalMask').onclick = function (e) { if (e.target === $('modalMask')) closeModal(); };
  $('modalOk').onclick = function () { if (modalOkFn) modalOkFn(); };
  document.querySelectorAll('#menu a').forEach(function (a) {
    a.onclick = function () { switchView(a.dataset.view); };
  });

  /* ---------- 启动 ---------- */
  api('GET', '/api/admin/stats').then(function (j) {
    enterAdmin(j.data.admin);
  }).catch(function () { logout(); });
})();
