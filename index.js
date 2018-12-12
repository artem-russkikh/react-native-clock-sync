var clockSync = function (config) {
  this.client = require('react-native-ntp-client');
  if (!config) {
    config = {};
  }

  if (config.hasOwnProperty('servers')) {
    this.ntpServers = [];
    try {
      config.servers.forEach(function (s, i) {
        if (typeof s === 'string' && s.length > 0) {
          this.ntpServers.push({
            server: s,
            port: this.client.defaultNtpPort
          });
        } else if (typeof s === 'object') {
          if (s.server && typeof s.server === 'string') {
            if (s.port) {
              if (typeof s.port !== 'number' || s.port <= 0) {
                throw new Error('Invalid port number specified at index: ' + i);
              }
            }
            this.ntpServers.push({
              server: s.server,
              port: s.port || this.client.defaultNtpPort
            });
          } else {
            throw new Error('Missing server string at index: ' + i);
          }
        } else {
          throw new Error('Invalid config item at index: ' + i);
        }
      }, this);
      if (this.ntpServers.length === 0) {
        throw new Error('No servers provided in config object');
      }
    } catch (e) {
      throw new Error('Malformed \'config.servers\' array: ' + e.message);
    }
  } else {
    this.ntpServers = [{
      server: this.client.defaultNtpServer,
      port: this.client.defaultNtpPort
    }];
  }

  this.currentIndex = 0;
  this.currentServer = this.ntpServers[this.currentIndex];
  this.cycleServers = config.cycleServers || false;
  this.delta = [];
  this.isOnline = (config.hasOwnProperty('startOnline') ? config.startOnline : true);
  this.limit = parseInt(config.history) || 10;
  if (this.limit <= 0) { throw new Error('\'config.history\' must be greater than 0'); }
  this.tickId = null;
  this.tickRate = parseFloat(config.syncDelay) || 300;
  if (this.tickRate <= 0) { throw new Error('\'config.syncDelay\' must be greater than 0'); }
  this.tickRate = this.tickRate * 1000;

  if (this.isOnline) {
    this.syncTime();
    this.startTick();
  }
};

/**
 * @private
 */
clockSync.prototype.computeDelta = function (ntpDate, update, cb) {
  var dt = 0;
  var tempServerTime = 0;
  var tempLocalTime = 0;
  if (ntpDate) {
    tempServerTime = ntpDate.getTime();
    tempLocalTime = (new Date()).getTime();
    dt = tempServerTime - tempLocalTime;
  }
  if (update) {
    if (this.delta.length === this.limit) {
      this.delta.shift();
    }
    this.delta.push({
      dt: dt,
      ntp: tempServerTime
    });
  }
  if (cb) {
    cb(dt);
  }
};

clockSync.prototype.getDelta = function (callback) {
  if (this.isOnline) {
    this.client.getNetworkTime(this.currentServer.server, this.currentServer.port, function (err, date) {
      if (err) {
        console.log('Shifting to backup server');
        this.shiftServer();
      } else {
        this.computeDelta(date, true, callback);
      }
    }.bind(this))
  } else {
    this.computeDelta(null, false, callback);
  }
};

clockSync.prototype.getHistory = function () {
  // FIXME: deal with details
  // {
  //   currentConsecutiveErrorCount: expect.any(Number),
  //   currentServer: objectContaining({
  //     server: expect.any(String),
  //     port: expect.any(Number)
  //   }),
  //   deltas: expect.any(Array),
  //   errors: expect.any(Array),
  //   isInErrorState: expect.any(Boolean),
  //   lastSyncTime: expect.any(Number),
  //   lastNtpTime: expect.any(Number),
  //   lastError: null,
  //   lastErrorTime: null,
  //   maxConsecutiveErrorCount: expect.any(Number)
  // }

  // fast way to deep clone since we know the stuff inside delta
  // is just simple numbers, strings, and maps
  return {
    deltas: JSON.parse(JSON.stringify(this.delta))
  };
};

clockSync.prototype.getIsOnline = function () {
  return this.isOnline;
};

clockSync.prototype.getTime = function () {
  var sum = this.delta.reduce(function (a, b) {
    return a + b.dt;
  }, 0);
  var avg = Math.round(sum / this.delta.length) || 0;
  return ((new Date()).getTime() + avg);
};

clockSync.prototype.setOnline = function (online) {
  if (online && !this.isOnline) {
    this.isOnline = true;
    this.syncTime();
    this.startTick();
  } else if (!online && this.isOnline) {
    clearInterval(this.tickId);
    this.tickId = null;
    this.isOnline = false;
  }
};

clockSync.prototype.shiftServer = function () {
  if (this.cycleServers && this.ntpServers.length > 1) {
    this.currentIndex++;
    this.currentIndex %= this.ntpServers.length;
  }
  else if (this.ntpServers[this.currentIndex + 1]) {
    this.currentIndex++;
  }
  this.currentServer = this.ntpServers[this.currentIndex];
};

clockSync.prototype.startTick = function () {
  if (!this.tickId) {
    this.tickId = setInterval(function () {
      this.getDelta();
    }.bind(this), this.tickRate);
  }
};

clockSync.prototype.syncTime = function () {
  this.getDelta();
};

module.exports = clockSync;
