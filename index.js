var clockSync = function (config) {
  this.client = require('react-native-ntp-client');
  if (!config) {
    config = {};
  }

  // flexible parsing for server configs
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
  this.cycleServers = config.cycleServers || false;
  this.isOnline = (config.hasOwnProperty('startOnline') ? config.startOnline : true);
  this.limit = parseInt(config.history) || 10;
  if (this.limit <= 0) { throw new Error('\'config.history\' must be greater than 0'); }
  this.tickId = null;
  this.tickRate = parseFloat(config.syncDelay) || 300;
  if (this.tickRate <= 0) { throw new Error('\'config.syncDelay\' must be greater than 0'); }
  this.tickRate = this.tickRate * 1000;

  // runtime tracking
  this.historyDetails = {
    currentConsecutiveErrorCount: 0,
    currentServer: this.ntpServers[this.currentIndex],
    deltas: [],
    errors: [],
    isInErrorState: false,
    lastSyncTime: null,
    lastNtpTime: null,
    lastError: null,
    lifetimeErrorCount: 0,
    maxConsecutiveErrorCount: 0
  };

  if (this.isOnline) {
    this.syncTime();
    this.startTick();
  }
};

/**
 * @private
 */
clockSync.prototype.computeDeltaAndUpdateHistory = function (ntpDate) {
  var tempServerTime = ntpDate.getTime();
  var tempLocalTime = Date.now();
  console.log(tempServerTime, tempLocalTime);
  var dt = tempServerTime - tempLocalTime;
  if (this.historyDetails.deltas.length === this.limit) {
    this.historyDetails.deltas.shift();
  }
  this.historyDetails.deltas.push({
    dt: dt,
    ntp: tempServerTime
  });
  this.historyDetails.lastSyncTime = tempLocalTime;
  this.historyDetails.lastNtpTime = tempServerTime;
  return dt;
};

/**
 * @private
 */
clockSync.prototype.getDelta = function (callback) {
  if (this.isOnline) {
    var fetchingServer = Object.assign({}, this.historyDetails.currentServer);
    this.client.getNetworkTime(this.historyDetails.currentServer.server, this.historyDetails.currentServer.port, function (err, date) {
      if (err) {
        console.log('Shifting to backup server');
        this.shiftServer();
        var ex = err;
        if (!ex) {
          ex = new Error('unknown error');
        } else if (!(ex instanceof Error)) {
          if (typeof ex === 'string') {
            ex = new Error(ex);
          } else {
            ex = new Error(ex.toString());
          }
        }
        if (callback) {
          callback(ex, fetchingServer);
        }
      } else {
        var delta = this.computeDeltaAndUpdateHistory(date);
        if (callback) {
          callback(delta, fetchingServer);
        }
      }
    }.bind(this))
  } else {
    if (callback) {
      callback(0);
    }
  }
};

clockSync.prototype.getHistory = function () {
  // fast way to deep clone since we know the stuff inside
  // is JSON serializable
  return JSON.parse(JSON.stringify(this.historyDetails));
};

clockSync.prototype.getIsOnline = function () {
  return this.isOnline;
};

clockSync.prototype.getTime = function () {
  var sum = this.historyDetails.deltas.reduce(function (a, b) {
    return a + b.dt;
  }, 0);
  var avg = Math.round(sum / this.historyDetails.deltas.length) || 0;
  return (Date.now() + avg);
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

/**
 * @private
 */
clockSync.prototype.shiftServer = function () {
  if (this.cycleServers && this.ntpServers.length > 1) {
    this.currentIndex++;
    this.currentIndex %= this.ntpServers.length;
  }
  else if (this.ntpServers[this.currentIndex + 1]) {
    this.currentIndex++;
  }
  this.historyDetails.currentServer = this.ntpServers[this.currentIndex];
};

/**
 * @private
 */
clockSync.prototype.startTick = function () {
  if (!this.tickId) {
    this.tickId = setInterval(function () {
      this.syncTime();
    }.bind(this), this.tickRate);
  }
};

clockSync.prototype.syncTime = function (userCallback) {
  function internalCallback(result, server) {
    var success = false;
    if (this.isOnline) {
      if (typeof result === 'number') {
        success = true;
        this.historyDetails.currentConsecutiveErrorCount = 0;
        this.historyDetails.isInErrorState = false;
      } else if (result instanceof Error) {
        // extract Error data
        var ed = {
          name: result.name,
          message: result.message,
          server: server,
          stack: result.stack,
          time: Date.now()
        };
        this.historyDetails.currentConsecutiveErrorCount++;
        if (this.historyDetails.errors.length === this.limit) {
          this.historyDetails.errors.shift();
        }
        this.historyDetails.errors.push(ed);
        this.historyDetails.isInErrorState = true;
        this.historyDetails.lastError = ed;
        this.historyDetails.lifetimeErrorCount++;
        this.historyDetails.maxConsecutiveErrorCount = Math.max(
          this.historyDetails.maxConsecutiveErrorCount,
          this.historyDetails.currentConsecutiveErrorCount
        );
      }
    }

    if (userCallback) {
      userCallback(success);
    }
  }

  this.getDelta(internalCallback.bind(this));
};

module.exports = clockSync;
