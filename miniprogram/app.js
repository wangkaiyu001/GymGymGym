const ENV_ID = 'code-realtime-d7gbuxrbze297e600';

App({
  globalData: {
    envId: ENV_ID,
    userContext: null,
    cloudReady: null,
    cloudError: null,
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }

    wx.cloud.init({
      env: ENV_ID,
      traceUser: true,
    });
    wx.cloud.callFunction({
      name: 'getUserContext',
      data: {},
      success: (result) => {
        this.globalData.userContext = result.result || null;
        this.globalData.cloudReady = true;
      },
      fail: (error) => {
        this.globalData.cloudReady = false;
        this.globalData.cloudError = error;
        console.error('CloudBase init check failed', error);
      },
    });
  },
});
