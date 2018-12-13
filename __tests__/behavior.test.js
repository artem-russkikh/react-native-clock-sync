const clockSync = require('../index');

// react-native-ntp-client is mocked in __mocks__
const client = require('react-native-ntp-client');

// a 'mock' deterministic version of Date 'now'
let staticTimeMS = 0; // unix epoch
const origDateNow = Date.now.bind(global.Date);
const mockDateNow = jest.fn(() => {
  return staticTimeMS++;
});

describe('v1.1.0 behavior', () => {

  beforeAll(() => {
    // install mock Date.now
    global.Date.now = mockDateNow;
  });

  afterAll(() => {
    // restore original Date functions
    global.Date.now = origDateNow;
  });

  beforeEach(() => {
    client.__resetForTest();
  });

  test('mock date', () => {
    expect(Date.now()).toBe(0);
    expect(Date.now()).toBe(1);
    expect(Date.now()).toBe(2);
    expect(Date.now()).toBe(3);
    expect(Date.now()).toBe(4);
  });

  test('cycleServers true', () => {
    const config = {
      cycleServers: true,
      servers: [
        'foo.bar.com',
        {server: 'bar.baz.gov', port: 666},
        'a.b.c',
        'acb.xyz.def.uvw'
      ]
    };
    const cs = new clockSync(config);
    // 2 shifts -- idx 2
    cs.shiftServer();
    cs.shiftServer();
    expect(cs.currentIndex).toBe(2);
    expect(cs.historyDetails.currentServer.server).toBe(config.servers[2]);
    expect(cs.historyDetails.currentServer.port).toBe(cs.client.defaultNtpPort);
    // 3 more shifts -- idx 1
    cs.shiftServer();
    cs.shiftServer();
    cs.shiftServer();
    expect(cs.currentIndex).toBe(1);
    expect(cs.historyDetails.currentServer.server).toBe(config.servers[1].server);
    expect(cs.historyDetails.currentServer.port).toBe(config.servers[1].port);
  });

  test('cycleServers false', () => {
    const config = {
      cycleServers: false,
      servers: [
        'foo.bar.com',
        {server: 'bar.baz.gov', port: 666},
        'a.b.c',
        'acb.xyz.def.uvw'
      ]
    };
    const cs = new clockSync(config);
    // 2 shifts -- idx 2
    cs.shiftServer();
    cs.shiftServer();
    expect(cs.currentIndex).toBe(2);
    expect(cs.historyDetails.currentServer.server).toBe(config.servers[2]);
    expect(cs.historyDetails.currentServer.port).toBe(cs.client.defaultNtpPort);
    // 3 more shifts -- idx (config.servers.length - 1)
    var lastIdx = config.servers.length - 1;
    cs.shiftServer();
    cs.shiftServer();
    cs.shiftServer();
    expect(cs.currentIndex).toBe(lastIdx);
    expect(cs.historyDetails.currentServer.server).toBe(config.servers[lastIdx]);
    expect(cs.historyDetails.currentServer.port).toBe(cs.client.defaultNtpPort);
  });

  test('setOnline true; startOnline false', done => {
    const offset = -1000;
    client.__setOffsetMS(offset); // ensure mock ntp is slow
    const config = {
      startOnline: false
    };
    const cs = new clockSync(config);
    expect(cs.isOnline).toBe(false);
    expect(cs.historyDetails.deltas).toHaveLength(0); // no initial sync
    expect(cs.tickId).toBeNull();

    // 1st callback for offline delta time
    function cb(dt) {
      expect(dt).toBe(0);
      cs.setOnline(true); // will trigger 1st update to cs.historyDetails.deltas array
      cs.getDelta(cb2); // will trigger 2nd update to cs.historyDetails.deltas array
    }

    // 2nd callback for online delta time; fires 'test done'
    function cb2(dt) {
      expect(cs.isOnline).toBe(true);
      expect(cs.historyDetails.deltas).toHaveLength(2);
      expect(cs.tickId).not.toBeNull();
      expect(dt).toBeLessThanOrEqual(offset);
      done();
    }

    // start chain of callbacks by inspecting the offline delta time
    cs.getDelta(cb);
  });

  test('setOnline false; startOnline true', done => {
    const offset = -2000;
    client.__setOffsetMS(offset); // ensure mock ntp is slow
    const config = {
      startOnline: true
    };
    const cs = new clockSync(config);
    expect(cs.isOnline).toBe(true);
    expect(cs.historyDetails.deltas).toHaveLength(1); // 1 initial sync
    expect(cs.tickId).not.toBeNull();

    // 1st callback for online delta time
    function cb(dt) {
      expect(dt).toBeLessThanOrEqual(offset);
      cs.setOnline(false);
      cs.getDelta(cb2);
    }

    // 2nd callback for offline delta time; fires 'test done'
    function cb2(dt) {
      expect(cs.isOnline).toBe(false);
      expect(cs.historyDetails.deltas).toHaveLength(2); // initial sync + 1st getDelta call
      expect(cs.tickId).toBeNull();
      expect(dt).toBe(0);
      done();
    }

    // start chain of callbacks by inspecting the online delta time
    cs.getDelta(cb); // will push 1 update into delta
  });

  test('setOnline false; startOnline false', done => {
    const offset = -3000;
    client.__setOffsetMS(offset); // ensure mock ntp is slow
    const config = {
      startOnline: false
    };
    const cs = new clockSync(config);
    expect(cs.isOnline).toBe(false);
    expect(cs.historyDetails.deltas).toHaveLength(0);
    expect(cs.tickId).toBeNull();

    // 1st callback for offline delta time
    function cb(dt) {
      expect(dt).toBe(0);
      cs.setOnline(false); // should have no effect
      cs.getDelta(cb2);
    }

    // 2nd callback for offline delta time; fires 'test done'
    function cb2(dt) {
      expect(cs.isOnline).toBe(false);
      expect(cs.historyDetails.deltas).toHaveLength(0); // should still be empty
      expect(cs.tickId).toBeNull();
      expect(dt).toBe(0);
      done();
    }

    // start chain of callbacks by inspecting the online delta time
    cs.getDelta(cb);
  });

  test('setOnline true; startOnline true', done => {
    const offset = -4000;
    client.__setOffsetMS(offset); // ensure mock ntp is slow
    const config = {
      startOnline: true
    };
    const cs = new clockSync(config);
    expect(cs.isOnline).toBe(true);
    expect(cs.historyDetails.deltas).toHaveLength(1); // initial sync
    expect(cs.tickId).not.toBeNull();
    var tid = cs.tickId;

    // 1st callback for online delta time
    function cb(dt) {
      expect(dt).toBeLessThanOrEqual(offset);
      cs.setOnline(true); // should have no effect
      cs.getDelta(cb2); // adds 3rd update to delta
    }

    // 2nd callback for offline delta time; fires 'test done'
    function cb2(dt) {
      expect(cs.isOnline).toBe(true);
      expect(cs.historyDetails.deltas).toHaveLength(3);
      expect(cs.tickId).not.toBeNull();
      expect(cs.tickId).toBe(tid); // timer id should be the same
      expect(dt).toBeLessThanOrEqual(offset);
      done();
    }

    // start chain of callbacks by inspecting the online delta time
    cs.getDelta(cb); // adds 2nd update to delta
  });

  test('getTime method', () => {
    const config = {
      startOnline: false
    };
    const cs = new clockSync(config);
    expect(cs.historyDetails.deltas).toHaveLength(0);
    // pre-fill delta array
    cs.historyDetails.deltas = [
      {dt:5000},
      {dt:10000},
      {dt:5000},
      {dt:2500}
    ]; // avg === 5625
    const now_ish = Date.now();
    const time = cs.getTime();
    // time should be AT LEAST 5625 GREATER THAN now_ish
    expect(time - now_ish).toBeGreaterThanOrEqual(5625);
  });

  test('computeDeltaAndUpdateHistory method', () => {
    const config = {
      startOnline: false
    };
    const cs = new clockSync(config);
    expect(cs.historyDetails.deltas).toHaveLength(0); // empty delta array
    cs.computeDeltaAndUpdateHistory(new Date());
    expect(cs.historyDetails.deltas).toHaveLength(1); // delta updated once
    expect(cs.historyDetails.deltas[0]).toEqual(expect.objectContaining({
      dt: expect.any(Number),
      ntp: expect.any(Number)
    }));
    expect(cs.historyDetails.deltas[0].ntp).not.toBe(0);
    cs.computeDeltaAndUpdateHistory(new Date(Date.now() - 50000));
    expect(cs.historyDetails.deltas).toHaveLength(2); // delta updated once more
    expect(cs.historyDetails.deltas[1]).toEqual(expect.objectContaining({
      dt: expect.any(Number),
      ntp: expect.any(Number)
    }));
    expect(cs.historyDetails.deltas[1].dt).not.toBe(0);
    expect(cs.historyDetails.deltas[1].ntp).not.toBe(0);
    expect(cs.historyDetails.deltas[1].dt).not.toBe(cs.historyDetails.deltas[0].dt);
    expect(cs.historyDetails.deltas[1].ntp).not.toBe(cs.historyDetails.deltas[0].ntp);
  });

  test('syncTime method', () => {
    const cb = jest.fn(x => x);
    const config = {
      cycleServers: true,
      servers: [
        'good.ok.server',
        client.MOCK_FAILING_SERVER
      ],
      startOnline: false
    };
    const cs = new clockSync(config);

    // offline behavior
    cs.syncTime(cb);
    expect(cb.mock.calls.length).toBe(1);
    expect(cb.mock.results[0].value).toBe(false);
    expect(cs.historyDetails.deltas).toHaveLength(0);
    expect(cs.historyDetails.errors).toHaveLength(0);
    expect(cs.historyDetails.currentConsecutiveErrorCount).toBe(0);
    expect(cs.historyDetails.isInErrorState).toBe(false);
    expect(cs.historyDetails.lastSyncTime).toBeNull();
    expect(cs.historyDetails.lastNtpTime).toBeNull();
    expect(cs.historyDetails.lastError).toBeNull();
    expect(cs.historyDetails.lifetimeErrorCount).toBe(0);
    expect(cs.historyDetails.maxConsecutiveErrorCount).toBe(0);

    // online behavior - no errors
    cs.setOnline(true); // creates 1st delta
    cs.syncTime(cb); // creates 2nd delta
    expect(cb.mock.calls.length).toBe(2);
    expect(cb.mock.results[1].value).toBe(true);
    expect(cs.historyDetails.deltas).toHaveLength(2);
    expect(cs.historyDetails.deltas[0]).toEqual(expect.objectContaining({
      dt: expect.any(Number),
      ntp: expect.any(Number)
    }));
    expect(cs.historyDetails.errors).toHaveLength(0);
    expect(cs.historyDetails.currentConsecutiveErrorCount).toBe(0);
    expect(cs.historyDetails.isInErrorState).toBe(false);
    expect(cs.historyDetails.lastSyncTime).not.toBeNull();
    expect(cs.historyDetails.lastNtpTime).not.toBeNull();
    expect(cs.historyDetails.lastError).toBeNull();
    expect(cs.historyDetails.lifetimeErrorCount).toBe(0);
    expect(cs.historyDetails.maxConsecutiveErrorCount).toBe(0);

    let lastSyncTime = cs.historyDetails.lastSyncTime;
    let lastNtpTime = cs.historyDetails.lastNtpTime;

    // online behavior - errors
    cs.shiftServer(); // manually advance to the bad server
    cs.syncTime(cb); // creates error
    expect(cb.mock.calls.length).toBe(3);
    expect(cb.mock.results[2].value).toBe(false);
    expect(cs.historyDetails.deltas).toHaveLength(2); // no change
    expect(cs.historyDetails.errors).toHaveLength(1);
    expect(cs.historyDetails.errors[0]).toEqual(expect.objectContaining({
      name: expect.any(String),
      message: expect.any(String),
      server: expect.objectContaining({
        server: config.servers[1], /* server that failed */
        port: client.defaultNtpPort
      }),
      stack: expect.any(String),
      time: expect.any(Number)
    }));
    expect(cs.historyDetails.currentConsecutiveErrorCount).toBe(1);
    expect(cs.historyDetails.isInErrorState).toBe(true);
    expect(cs.historyDetails.lastSyncTime).toBe(lastSyncTime); // no change
    expect(cs.historyDetails.lastNtpTime).toBe(lastNtpTime); // no change
    expect(cs.historyDetails.lastError).toEqual(cs.historyDetails.errors[0]);
    expect(cs.historyDetails.lifetimeErrorCount).toBe(1);
    expect(cs.historyDetails.maxConsecutiveErrorCount).toBe(1);

    // sync again, on good server
    cs.syncTime(cb);
    expect(cb.mock.calls.length).toBe(4);
    expect(cb.mock.results[3].value).toBe(true);
    expect(cs.historyDetails.deltas).toHaveLength(3);
    expect(cs.historyDetails.errors).toHaveLength(1); // no change
    expect(cs.historyDetails.currentConsecutiveErrorCount).toBe(0);
    expect(cs.historyDetails.isInErrorState).toBe(false);
    expect(cs.historyDetails.lastSyncTime).not.toBe(lastSyncTime);
    expect(cs.historyDetails.lastNtpTime).not.toBe(lastNtpTime);
    expect(cs.historyDetails.lifetimeErrorCount).toBe(1); // no change
    expect(cs.historyDetails.maxConsecutiveErrorCount).toBe(1); // no change
  });

  describe('timer-based behavior', () => {

    beforeEach(() => {
      jest.useFakeTimers();
    });

    test('getHistory method; deltas array', () => {
      const config = {
        history: 5,
        startOnline: false,
        syncDelay: 5
      };
      const cs = new clockSync(config);
      expect(setInterval).not.toBeCalled();
      let h = cs.getHistory();
      expect(h).toEqual(expect.objectContaining({
        deltas: expect.any(Array)
      }));
      expect(h.deltas).toHaveLength(0);
      cs.setOnline(true);
      h = cs.getHistory();
      expect(h.deltas).toHaveLength(1);
      cs.setOnline(false);
      // advance by 1 tick
      jest.advanceTimersByTime(config.syncDelay * 1000);
      h = cs.getHistory();
      expect(h.deltas).toHaveLength(1); // no new updates
      cs.setOnline(true);
      // advance ticks beyond history limit
      jest.advanceTimersByTime(config.syncDelay * 1000 * (config.history + 2));
      h = cs.getHistory();
      expect(h.deltas).toHaveLength(config.history);
    });

    test('getHistory method; deltas array values', () => {
      const offset = -3000;
      client.__setOffsetMS(offset); // ensure mock ntp is slow
      // 1.1.0  default startOnline true
      const config = {
        history: 5,
        syncDelay: 5
      };
      const cs = new clockSync(config);
      expect(setInterval).toBeCalled();
      let h = cs.getHistory();
      expect(h).toEqual(expect.objectContaining({
        deltas: expect.any(Array)
      }));
      expect(h.deltas).toHaveLength(1);
      expect(h.deltas[0]).toEqual(expect.objectContaining({
        dt: expect.any(Number),
        ntp: expect.any(Number)
      }));
      expect(h.deltas[0].dt).not.toBe(0);
      expect(h.deltas[0].dt).toBeLessThanOrEqual(offset);

      // make sure ntp times are different even when test execution runs really fast
      client.__setOffsetMS(0);
      client.__useJitter(true);

      // advance ticks beyond history limit
      jest.advanceTimersByTime(config.syncDelay * 1000 * (config.history + 2));
      h = cs.getHistory();
      expect(h.deltas).toHaveLength(config.history);
      let prevNtp = 999999;
      h.deltas.forEach(d => {
        expect(d).toEqual(expect.objectContaining({
          dt: expect.any(Number),
          ntp: expect.any(Number)
        }));
        expect(d.dt).not.toBe(0);
        expect(d.ntp).not.toBe(prevNtp);
        prevNtp = d.ntp;
      });

    });

    test('getHistory method; details', () => {
      client.__setOffsetMS(0);
      client.__useJitter(true);
      const config = {
        cycleServers: true,
        history: 5,
        servers: [
          'ok.fake.server',
          {server: client.MOCK_FAILING_SERVER, port: 666},
          {server: client.MOCK_FAILING_SERVER, port: 456},
          'good.fake.server'
        ],
        startOnline: false,
        syncDelay: 5
      };
      const cs = new clockSync(config);
      expect(setInterval).not.toBeCalled();
      let h = cs.getHistory();

      // validate the shape of the history object
      expect(h).toEqual(expect.objectContaining({
        currentConsecutiveErrorCount: 0,
        currentServer: expect.objectContaining({
          server: config.servers[0],
          port: client.defaultNtpPort
        }),
        deltas: expect.any(Array),
        errors: expect.any(Array),
        isInErrorState: false,
        lastSyncTime: null,
        lastNtpTime: null,
        lastError: null,
        lifetimeErrorCount: 0,
        maxConsecutiveErrorCount: 0
      }));
      expect(h.deltas).toHaveLength(0);

      // single update via setOnline
      cs.setOnline(true);
      h = cs.getHistory();
      expect(h.deltas).toHaveLength(1);
      expect(h.deltas[0]).toEqual(expect.objectContaining({
        dt: expect.any(Number),
        ntp: expect.any(Number)
      }));
      expect(h.errors).toHaveLength(0);
      expect(h.currentConsecutiveErrorCount).toBe(0);
      expect(h.isInErrorState).toBe(false);
      expect(h.lastSyncTime).not.toBeNull();
      expect(h.lastNtpTime).not.toBeNull();
      expect(h.lastError).toBeNull();
      expect(h.lifetimeErrorCount).toBe(0);
      expect(h.maxConsecutiveErrorCount).toBe(0);

      let lastSyncTime = h.lastSyncTime;
      let lastNtpTime = h.lastNtpTime;

      // trigger an error:
      // manually shift to bad server
      cs.shiftServer();
      expect(cs.historyDetails.currentServer.server).toBe(config.servers[1].server);
      // advance 2 ticks (should have 2 errors)
      jest.advanceTimersByTime(config.syncDelay * 1000 * 2);
      h = cs.getHistory();
      expect(cs.historyDetails.currentServer.server).toBe(config.servers[3]); // server should have advanced 2 times
      expect(h.deltas).toHaveLength(1); // last 2 syncs were error, no update to deltas
      expect(h.errors).toHaveLength(2);
      // 1st error
      expect(h.errors[0]).toEqual(expect.objectContaining({
        name: expect.any(String),
        message: expect.any(String),
        server: expect.objectContaining({
          server: config.servers[1].server, /* server that failed */
          port: config.servers[1].port
        }),
        stack: expect.any(String),
        time: expect.any(Number)
      }));
      // 2nd error
      expect(h.errors[1]).toEqual(expect.objectContaining({
        name: expect.any(String),
        message: expect.any(String),
        server: expect.objectContaining({
          server: config.servers[2].server, /* server that failed */
          port: config.servers[2].port
        }),
        stack: expect.any(String),
        time: expect.any(Number)
      }));
      expect(h.currentConsecutiveErrorCount).toBe(2);
      expect(h.isInErrorState).toBe(true);
      expect(h.lastSyncTime).toBe(lastSyncTime); // no change
      expect(h.lastNtpTime).toBe(lastNtpTime); // no change
      expect(h.lastError).toEqual(h.errors[1]); // same properties
      expect(h.lifetimeErrorCount).toBe(2);
      expect(h.maxConsecutiveErrorCount).toBe(2);

      // current server is good, advance ticks by one more than limit
      jest.advanceTimersByTime(config.syncDelay * 1000 * config.history);
      h = cs.getHistory();
      expect(cs.historyDetails.currentServer.server).toBe(config.servers[3]); // server should not have advanced
      // deltas should have populated
      expect(h.deltas).toHaveLength(config.history); // should be at limit
      expect(h.lastSyncTime).not.toBe(lastSyncTime);
      expect(h.lastNtpTime).not.toBe(lastNtpTime);
      // error flags should be clear
      expect(h.currentConsecutiveErrorCount).toBe(0);
      expect(h.isInErrorState).toBe(false);
      // errors should not have updated
      expect(h.errors).toHaveLength(2); // no change
      expect(h.lastError).toEqual(h.errors[1]); // no change
      expect(h.lifetimeErrorCount).toBe(2); // no change
      expect(h.maxConsecutiveErrorCount).toBe(2); // no change

      let lastDelta = h.deltas[config.history - 1];
      lastSyncTime = h.lastSyncTime;
      lastNtpTime = h.lastNtpTime;

      // manually advance to cause 4 more errors (pushing over limit)
      // 2 shifts (cycleServers true) should get us back to the 1st bad server
      cs.shiftServer();
      cs.shiftServer();
      expect(cs.historyDetails.currentServer.server).toBe(config.servers[1].server);
      // advance 2 ticks (2 errors)
      jest.advanceTimersByTime(config.syncDelay * 1000 * 2);
      // back at last good server, manually shift again
      cs.shiftServer();
      cs.shiftServer();
      expect(cs.historyDetails.currentServer.server).toBe(config.servers[1].server);
      // advance 2 ticks (2 more errors)
      jest.advanceTimersByTime(config.syncDelay * 1000 * 2);
      h = cs.getHistory();
      // no more deltas should have populated
      expect(h.deltas).toHaveLength(config.history); // should be at limit
      expect(h.lastSyncTime).toBe(lastSyncTime); // no change
      expect(h.lastNtpTime).toBe(lastNtpTime); // no change
      // error flags should be set again
      expect(h.currentConsecutiveErrorCount).toBe(4);
      expect(h.isInErrorState).toBe(true);
      // errors should have updated
      expect(h.errors).toHaveLength(config.history); // should be at limit
      expect(h.lastError).toEqual(h.errors[config.history - 1]);
      expect(h.lifetimeErrorCount).toBe(6);
      expect(h.maxConsecutiveErrorCount).toBe(4);

    });

    test('interval with startOnline false -> true -> false', () => {
      const config = {
        startOnline: false
      };
      const cs = new clockSync(config);
      expect(setInterval).not.toBeCalled();
      cs.setOnline(true);
      expect(setInterval).toHaveBeenCalledTimes(1);
      cs.setOnline(false);
      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(clearInterval).toBeCalled();
    });

    test('interval with startOnline true -> false -> true', () => {
      // 1.1.0 startOnline default true
      const cs = new clockSync();
      expect(setInterval).toBeCalled();
      cs.setOnline(false);
      expect(clearInterval).toBeCalled();
      expect(setInterval).toHaveBeenCalledTimes(1);
      cs.setOnline(true);
      expect(setInterval).toHaveBeenCalledTimes(2);
    });

    test('interval callback invocation', () => {
      // 1.1.0 startOnline default true
      const config = {
        syncDelay: 5
      };
      const cs = new clockSync(config);
      const spy = jest.spyOn(cs, 'getDelta');
      expect(setInterval).toBeCalled();
      expect(spy).not.toBeCalled(); // missed 1st call in constructor
      jest.advanceTimersByTime(config.syncDelay * 1000);
      expect(spy).toBeCalled();
    });

    test('ntp error handled; cycleServers false', () => {
      // 1.1.0 startOnline default true, cycleServers false
      const config = {
        servers: [
          client.MOCK_FAILING_SERVER,
          'foo.bar.com'
        ],
        syncDelay: 5
      };
      const cs = new clockSync(config); // construction should cause a shiftServer
      expect(setInterval).toBeCalled();
      expect(cs.currentIndex).toBe(1);
      expect(cs.historyDetails.currentServer.server).toBe(config.servers[1]);
      jest.advanceTimersByTime(config.syncDelay * 1000); // another syncTime should cause shiftServer to hold at final server
      expect(cs.currentIndex).toBe(1);
      expect(cs.historyDetails.currentServer.server).toBe(config.servers[1]);
    });

    test('ntp error handled; cycleServers true', () => {
      // 1.1.0 startOnline default true
      const config = {
        cycleServers: true,
        servers: [
          client.MOCK_FAILING_SERVER,
          client.MOCK_FAILING_SERVER,
          client.MOCK_FAILING_SERVER
        ],
        syncDelay: 5
      };
      const cs = new clockSync(config); // construction should cause a shiftServer
      const spy = jest.spyOn(cs, 'shiftServer'); // NOTE: shiftServer was called once before we started inspecting it
      expect(setInterval).toBeCalled();
      expect(cs.currentIndex).toBe(1);
      expect(cs.historyDetails.currentServer.server).toBe(config.servers[1]);
      jest.advanceTimersByTime(config.syncDelay * 1000 * 2); // another 2 syncTime(s)
      expect(spy.mock.calls.length).toBe(2);
      expect(cs.currentIndex).toBe(0); // should have wrapped around
      expect(cs.historyDetails.currentServer.server).toBe(config.servers[0]);
    });

  });

});
