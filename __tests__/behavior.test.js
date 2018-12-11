const clockSync = require('../index');

// react-native-ntp-client is mocked in __mocks__
const client = require('react-native-ntp-client');

describe('v1.1.0 behavior', () => {

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
    expect(cs.currentServer.server).toBe(config.servers[2]);
    expect(cs.currentServer.port).toBe(cs.client.defaultNtpPort);
    // 3 more shifts -- idx 1
    cs.shiftServer();
    cs.shiftServer();
    cs.shiftServer();
    expect(cs.currentIndex).toBe(1);
    expect(cs.currentServer.server).toBe(config.servers[1].server);
    expect(cs.currentServer.port).toBe(config.servers[1].port);
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
    expect(cs.currentServer.server).toBe(config.servers[2]);
    expect(cs.currentServer.port).toBe(cs.client.defaultNtpPort);
    // 3 more shifts -- idx (config.servers.length - 1)
    var lastIdx = config.servers.length - 1;
    cs.shiftServer();
    cs.shiftServer();
    cs.shiftServer();
    expect(cs.currentIndex).toBe(lastIdx);
    expect(cs.currentServer.server).toBe(config.servers[lastIdx]);
    expect(cs.currentServer.port).toBe(cs.client.defaultNtpPort);
  });

  test('setOnline true; startOnline false', done => {
    client.__setOffsetMs(-1000); // ensure mock ntp is slow
    const config = {
      startOnline: false
    };
    const cs = new clockSync(config);
    expect(cs.isOnline).toBe(false);
    expect(cs.delta).toHaveLength(0); // no initial sync
    expect(cs.tickId).toBeNull();

    // 1st callback for offline delta time
    function cb(dt) {
      expect(dt).toBe(0);
      cs.setOnline(true); // will trigger 1st update to cs.delta array
      cs.getDelta(cb2); // will trigger 2st update to cs.delta array
    }

    // 2nd callback for online delta time; fires 'test done'
    function cb2(dt) {
      expect(cs.isOnline).toBe(true);
      expect(cs.delta).toHaveLength(2);
      expect(cs.tickId).not.toBeNull();
      expect(dt).toBeLessThanOrEqual(-1000);
      done();
    }

    // start chain of callbacks by inspecting the offline delta time
    cs.getDelta(cb);
  });

  test('setOnline false; startOnline true', done => {
    client.__setOffsetMs(-2000); // ensure mock ntp is slow
    const config = {
      startOnline: true
    };
    const cs = new clockSync(config);
    expect(cs.isOnline).toBe(true);
    expect(cs.delta).toHaveLength(1); // 1 initial sync
    expect(cs.tickId).not.toBeNull();

    // 1st callback for online delta time
    function cb(dt) {
      expect(dt).toBeLessThanOrEqual(-2000);
      cs.setOnline(false);
      cs.getDelta(cb2);
    }

    // 2nd callback for offline delta time; fires 'test done'
    function cb2(dt) {
      expect(cs.isOnline).toBe(false);
      expect(cs.delta).toHaveLength(2); // initial sync + 1st getDelta call
      expect(cs.tickId).toBeNull();
      expect(dt).toBe(0);
      done();
    }

    // start chain of callbacks by inspecting the online delta time
    cs.getDelta(cb); // will push 1 update into delta
  });

  test('setOnline false; startOnline false', done => {
    client.__setOffsetMs(-2000); // ensure mock ntp is slow
    const config = {
      startOnline: false
    };
    const cs = new clockSync(config);
    expect(cs.isOnline).toBe(false);
    expect(cs.delta).toHaveLength(0);
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
      expect(cs.delta).toHaveLength(0); // should still be empty
      expect(cs.tickId).toBeNull();
      expect(dt).toBe(0);
      done();
    }

    // start chain of callbacks by inspecting the online delta time
    cs.getDelta(cb);
  });

  test('setOnline true; startOnline true', done => {
    client.__setOffsetMs(-3000); // ensure mock ntp is slow
    const config = {
      startOnline: true
    };
    const cs = new clockSync(config);
    expect(cs.isOnline).toBe(true);
    expect(cs.delta).toHaveLength(1); // initial sync
    expect(cs.tickId).not.toBeNull();
    var tid = cs.tickId;

    // 1st callback for online delta time
    function cb(dt) {
      expect(dt).toBeLessThanOrEqual(-3000);
      cs.setOnline(true); // should have no effect
      cs.getDelta(cb2); // adds 3rd update to delta
    }

    // 2nd callback for offline delta time; fires 'test done'
    function cb2(dt) {
      expect(cs.isOnline).toBe(true);
      expect(cs.delta).toHaveLength(3);
      expect(cs.tickId).not.toBeNull();
      expect(cs.tickId).toBe(tid); // timer id should be the same
      expect(dt).toBeLessThanOrEqual(-3000);
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
    expect(cs.delta).toHaveLength(0);
    // pre-fill delta array
    cs.delta = [
      5000,
      10000,
      5000,
      2500
    ]; // avg === 5625
    const now_ish = Date.now();
    const time = cs.getTime();
    // time should be AT LEAST 5625 GREATER THAN now_ish
    expect(time - now_ish).toBeGreaterThanOrEqual(5625);
  });

  test('computeDelta method', () => {
    const config = {
      startOnline: false
    };
    const cb = jest.fn(x => x);
    const cs = new clockSync(config);
    expect(cs.delta).toHaveLength(0); // empty delta array
    cs.computeDelta(null, false, cb); // no compute, no update, invoke callback
    expect(cs.delta).toHaveLength(0); // no updates
    expect(cb.mock.results[0].value).toBe(0); // callback value 0
    cs.computeDelta(new Date(), true, null); // compute a dt, update true, no callback
    expect(cs.delta).toHaveLength(1); // delta updated once
    expect(cb.mock.calls.length).toBe(1); // callback not called again
    cs.computeDelta(new Date(Date.now() - 5000), false, cb); // compute a dt, no update, invoke callback
    expect(cs.delta).toHaveLength(1); // delta unchanged
    expect(cb.mock.calls.length).toBe(2); // callback called again
    expect(cb.mock.results[1].value).toBeLessThanOrEqual(-5000); // neg delta
  });

  describe('timer-based behavior', () => {

    beforeEach(() => {
      jest.useFakeTimers();
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
      expect(cs.currentServer.server).toBe(config.servers[1]);
      jest.advanceTimersByTime(config.syncDelay * 1000); // another syncTime should cause shiftServer to hold at final server
      expect(cs.currentIndex).toBe(1);
      expect(cs.currentServer.server).toBe(config.servers[1]);
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
      expect(cs.currentServer.server).toBe(config.servers[1]);
      jest.advanceTimersByTime(config.syncDelay * 1000 * 2); // another 2 syncTime(s)
      expect(spy.mock.calls.length).toBe(2);
      expect(cs.currentIndex).toBe(0); // should have wrapped around
      expect(cs.currentServer.server).toBe(config.servers[0]);
    });

  });

});
