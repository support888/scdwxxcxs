/**
 * ============================================================================
 * LLS俱乐部 - 消息(迭代版本)
 * ----------------------------------------------------------------------------
 * 【AI 后端锚点】写后端时优先看本注释,定位需对接的位置
 * ============================================================================
 * 1. 数据(data) - 需后端提供
 *   • typeList[]       : 消息类型Tab(系统/订单/组队)
 *   • msgList[]        : 当前类型消息列表(图标/标题/时间/摘要)
 *                        ← GET /api/messages?type=0|1|2
 *
 * 2. 关键函数 - 需替换为 wx.request
 *   • loadMsg()        : 按当前 typeActive 拉取消息 ← /api/messages?type=...
 *   • chooseType(e)    : 切换Tab重新加载
 *   • onClearMsg()     : 清空当前类型未读消息 ← DELETE /api/messages?type=...&read=0
 *   • onDeleteTap(e)   : 滑动删除单条消息     ← DELETE /api/messages/{id}
 *
 * 3. 交互
 *   • 导航栏「清空」按钮 → showModal 二次确认(取消/确定)后清空未读
 *   • 消息卡片左滑 → 露出「删除」按钮
 *
 * 4. 跳转路由
 *   • gotoChat()       → /minePages/chat/talk/talk
 * ============================================================================
 */
const app = getApp();
const DEL_W_RPX = 160; // 滑动删除按钮宽度(rpx),需与 wxss 中 .swipe-del 保持一致

Page({
  data: {
    statusBarHeight: 20,

    typeList: [
      { id: 0, icon: '🔔', text: '系统消息' },
      { id: 1, icon: '📋', text: '订单消息' },
      { id: 2, icon: '👥', text: '组队消息' }
    ],
    typeActive: 0,

    msgList: [],

    // 滑动状态
    dragging: false,   // 拖动中(拖动态关闭过渡动画,松手再吸附)
    openedIndex: -1    // 当前展开的卡片下标,-1 表示都收起
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    // 删除按钮宽度(px),用于滑动吸附阈值换算
    this.delW = Math.round(DEL_W_RPX * (app.globalData.screenWidth || 375) / 750);
    this.initPool();
    this.loadMsg();
  },

  onShow() {
    if (wx.hideHomeButton) wx.hideHomeButton();
  },

  /** 初始化消息数据池(演示数据;接入后端后由 loadMsg 直接请求) */
  initPool() {
    this.msgPool = {
      0: [
        {
          id: 1,
          icon: '🔔',
          title: '平台公告：订单...',
          time: '2026-07-20 13:26:43',
          excerpt: '近期个别陪玩反馈找不到订单记录，为减少此类情况的发生，平台已优化订单查询入口，请及时更新体验。'
        },
        {
          id: 2,
          icon: '🔔',
          title: '未成年禁止下单',
          time: '2026-05-09 17:46:03',
          excerpt: '未成年禁止下单消费，下单默认成年人，请各位老板知悉并遵守平台规则。'
        },
        {
          id: 3,
          icon: '🔔',
          title: '春节放假提现结算安排',
          time: '2026-02-09 19:02:11',
          excerpt: '关于2026年春节假期提现结算时间通知：2月10日-2月17日暂停提现审核，2月18日起恢复正常，请提前安排。'
        }
      ],
      1: [
        {
          id: 4,
          icon: '📋',
          title: '您有新的护航订单',
          time: '2026-07-18 21:05:32',
          excerpt: '老板「Lucas66」下单了王者荣耀护航服务，请尽快接单开始服务。'
        },
        {
          id: 5,
          icon: '📋',
          title: '订单已完成',
          time: '2026-07-15 18:22:40',
          excerpt: '您的陪练订单已确认完成，评价5.0分，服务收益已结算至余额。'
        }
      ],
      2: [
        {
          id: 6,
          icon: '👥',
          title: '车队邀请',
          time: '2026-07-19 20:11:09',
          excerpt: '「上分车队」邀请你加入今晚八点的双排车队，速来组队开黑！'
        }
      ]
    };
  },

  /** 消息列表(读取数据池;接入后端后替换为 wx.request) */
  loadMsg() {
    const list = (this.msgPool[this.data.typeActive] || []).map((it) =>
      Object.assign({ offsetX: 0 }, it)
    );
    this.setData({ msgList: list, openedIndex: -1 });
  },

  chooseType(e) {
    this.setData({ typeActive: Number(e.currentTarget.dataset.id) });
    this.loadMsg();
  },

  /* ---------------- 清空未读消息 ---------------- */
  onClearMsg() {
    if (!this.data.msgList.length) {
      wx.showToast({ title: '暂无消息', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '清空消息',
      content: '确定清空当前所有未读消息吗?清空后不可恢复。',
      cancelText: '取消',
      confirmText: '确定',
      confirmColor: '#00e5ff',
      success: (res) => {
        if (!res.confirm) return;
        this.msgPool[this.data.typeActive] = [];
        this.loadMsg();
        // 同步清除「消息」tab 角标(tabBar 第 3 项,index=2)
        wx.removeTabBarBadge({ index: 2, fail: () => {} });
        wx.showToast({ title: '已清空', icon: 'success' });
      }
    });
  },

  /* ---------------- 左滑删除 ---------------- */
  onTouchStart(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ dragging: true });
    this.touch = {
      index,
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      startOffset: this.data.msgList[index].offsetX || 0,
      lock: ''
    };
  },

  onTouchMove(e) {
    if (!this.touch) return;
    const dx = e.touches[0].clientX - this.touch.startX;
    const dy = e.touches[0].clientY - this.touch.startY;
    // 锁定滑动方向,避免与页面纵向滚动冲突
    if (!this.touch.lock) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) this.touch.lock = 'x';
      else if (Math.abs(dy) > 6) this.touch.lock = 'y';
      else return;
    }
    if (this.touch.lock === 'y') return;

    let offset = this.touch.startOffset + dx;
    if (offset > 0) offset = 0;
    if (offset < -this.delW) offset = -this.delW;

    const patch = { ['msgList[' + this.touch.index + '].offsetX']: offset };
    // 拖动当前项时收起其它已展开项
    if (this.data.openedIndex > -1 && this.data.openedIndex !== this.touch.index) {
      patch['msgList[' + this.data.openedIndex + '].offsetX'] = 0;
      patch.openedIndex = -1;
    }
    this.setData(patch);
  },

  onTouchEnd() {
    if (!this.touch) return;
    const index = this.touch.index;
    const offset = this.data.msgList[index].offsetX || 0;
    const open = offset < -this.delW / 2;
    this.setData({
      ['msgList[' + index + '].offsetX']: open ? -this.delW : 0,
      openedIndex: open ? index : -1,
      dragging: false
    });
    this.touch = null;
  },

  /** 点击空白处收起已展开卡片 */
  closeAllSwipe() {
    if (this.data.openedIndex === -1) return;
    this.setData({
      ['msgList[' + this.data.openedIndex + '].offsetX']: 0,
      openedIndex: -1
    });
  },

  /** 删除单条消息 */
  onDeleteTap(e) {
    const index = e.currentTarget.dataset.index;
    this.msgPool[this.data.typeActive].splice(index, 1);
    this.loadMsg();
    wx.showToast({ title: '已删除', icon: 'none' });
  },

  /** 保留原会话入口(更多消息跳转聊天) */
  gotoChat() {
    wx.navigateTo({ url: '/minePages/chat/talk/talk' });
  }
});
