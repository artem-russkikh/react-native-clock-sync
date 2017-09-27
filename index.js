var clockSync = function (config) {
  this.client = require('react-native-ntp-client');
  if (!config) {
    config = {};
  }

  this.ntpServers = config.servers || [{
    server: this.client.defaultNtpServer,
    port: this.client.defaultNtpPort
  }];
  this.currentIndex = 0;
  this.currentServer = this.ntpServers[this.currentIndex];
  this.tickRate = config.syncDelay || 300;
  this.tickRate = this.tickRate * 1000;
  this.delta = [];
  this.limit = config.history || 10;
  this.syncTime();
  this.startTick();
};


clockSync.prototype.shiftServer = function () {
  if (this.ntpServers[this.currentIndex + 1]) {
    this.currentIndex++;
    this.currentServer = this.ntpServers[this.currentIndex];
  }
};

clockSync.prototype.startTick = function () {
  setInterval(function () {
    this.getDelta();
  }.bind(this), this.tickRate);
};

clockSync.prototype.getTime = function () {
  var sum = this.delta.reduce(function (a, b) {
    return a + b;
  }, 0);
  var avg = Math.round(sum / this.delta.length) || 0;
  return ((new Date()).getTime() + avg);
};

clockSync.prototype.syncTime = function () {
  this.getDelta();
};

clockSync.prototype.getDelta = function (callback) {
  this.client.getNetworkTime(this.currentServer.server, this.currentServer.port, function (err, date) {
    if (err) {
      console.log('Shifting to backup server');
      this.shiftServer();
    } else {
      var tempServerTime = date.getTime();
      var tempLocalTime = (new Date()).getTime();
      if (this.delta.length === this.limit) {
        this.delta.shift();
      }
      this.delta.push(tempServerTime - tempLocalTime);
      if (callback) {
        callback(tempServerTime - tempLocalTime)
      }
    }
  }.bind(this))
};

module.exports = clockSync;
