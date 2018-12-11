const clockSync = require('../index');

// react-native-ntp-client is mocked in __mocks__
const client = require('react-native-ntp-client');

describe('Configuration parsing and behavior', () => {

  test('initialize default clockSync instance (undef config)', () => {
    const cs = new clockSync();
    expect(cs.currentIndex).toEqual(0);
    expect(cs.currentServer).toMatchObject({
      server: 'pool.ntp.org',
      port: 123
    });
    expect(cs.cycleServers).toBe(false);
    expect(cs.isOnline).toBe(true);
    expect(cs.tickId).not.toBeNull();
    expect(cs.tickRate).toBe(300000);
    expect(cs.delta).toHaveLength(1); // due to mock
    expect(cs.limit).toBe(10);
    expect(cs.getTime()).toBeGreaterThan(0);
  });

  test('initialize default clockSync instance (empty config)', () => {
    const cs = new clockSync({});
    expect(cs.currentIndex).toEqual(0);
    expect(cs.currentServer).toMatchObject({
      server: 'pool.ntp.org',
      port: 123
    });
    expect(cs.cycleServers).toBe(false);
    expect(cs.isOnline).toBe(true);
    expect(cs.tickId).not.toBeNull();
    expect(cs.tickRate).toBe(300000);
    expect(cs.delta).toHaveLength(1); // due to mock
    expect(cs.limit).toBe(10);
    expect(cs.getTime()).toBeGreaterThan(0);
  });

  describe('initialize clockSync instance with VALID server configs',  () => {

    test('array of string servers', () => {
      const validConfig = {
        servers: [
          'foo.bar.com',
          'bar.baz.gov',
          'a.b.c',
          'acb.xyz.def.uvw'
        ]
      };
      const cs = new clockSync(validConfig);
      expect(cs.currentIndex).toEqual(0);
      expect(cs.currentServer).toMatchObject({
        server: 'foo.bar.com',
        port: 123
      });
      expect(cs.cycleServers).toBe(false);
      expect(cs.isOnline).toBe(true);
      expect(cs.tickId).not.toBeNull();
      expect(cs.tickRate).toBe(300000);
      expect(cs.delta).toHaveLength(1); // due to mock
      expect(cs.limit).toBe(10);
      expect(cs.getTime()).toBeGreaterThan(0);
    });

    test('array of server-only objects', () => {
      const validConfig = {
        servers: [
          {server: 'foo.bar.com'},
          {server: 'bar.baz.gov'},
          {server: 'a.b.c'},
          {server: 'acb.xyz.def.uvw'}
        ]
      };
      const cs = new clockSync(validConfig);
      expect(cs.currentIndex).toEqual(0);
      expect(cs.currentServer).toMatchObject({
        server: 'foo.bar.com',
        port: 123
      });
      expect(cs.cycleServers).toBe(false);
      expect(cs.isOnline).toBe(true);
      expect(cs.tickId).not.toBeNull();
      expect(cs.tickRate).toBe(300000);
      expect(cs.delta).toHaveLength(1); // due to mock
      expect(cs.limit).toBe(10);
      expect(cs.getTime()).toBeGreaterThan(0);
    });

    test('array of server & port objects', () => {
      const validConfig = {
        servers: [
          {server: 'foo.bar.com', port: 123},
          {server: 'bar.baz.gov', port: 567},
          {port: 999, server: 'a.b.c'},
          {port: 1337, server: 'acb.xyz.def.uvw'}
        ]
      };
      const cs = new clockSync(validConfig);
      expect(cs.currentIndex).toEqual(0);
      expect(cs.currentServer).toMatchObject({
        server: 'foo.bar.com',
        port: 123
      });
      expect(cs.cycleServers).toBe(false);
      expect(cs.isOnline).toBe(true);
      expect(cs.tickId).not.toBeNull();
      expect(cs.tickRate).toBe(300000);
      expect(cs.delta).toHaveLength(1); // due to mock
      expect(cs.limit).toBe(10);
      expect(cs.getTime()).toBeGreaterThan(0);
    });

    test('array of mixed-value server config data', () => {
      const validConfig = {
        servers: [
          'foo.bar.com',
          {server: 'bar.baz.gov', port: 567},
          {server: 'a.b.c'},
          {port: 1337, server: 'acb.xyz.def.uvw'}
        ]
      };
      const cs = new clockSync(validConfig);
      expect(cs.currentIndex).toEqual(0);
      expect(cs.currentServer).toMatchObject({
        server: 'foo.bar.com',
        port: 123
      });
      expect(cs.cycleServers).toBe(false);
      expect(cs.isOnline).toBe(true);
      expect(cs.tickId).not.toBeNull();
      expect(cs.tickRate).toBe(300000);
      expect(cs.delta).toHaveLength(1); // due to mock
      expect(cs.limit).toBe(10);
      expect(cs.getTime()).toBeGreaterThan(0);
    });

  });

  describe('initialize clockSync instance with INVALID server configs', () => {

    test('undefined servers array', () => {
      const invalidConfig = {
        servers: undefined
      };
      function make() {
        return new clockSync(invalidConfig)
      }
      expect(make).toThrow();
    });

    test('empty servers array', () => {
      const invalidConfig = {
        servers: []
      };
      function make() {
        return new clockSync(invalidConfig)
      }
      expect(make).toThrow();
    });

    test('bad string in servers array', () => {
      const invalidConfig = {
        servers: [
          'foo.bar.com', /* good */
          ''/* bad */
        ]
      };
      function make() {
        return new clockSync(invalidConfig)
      }
      expect(make).toThrow();
    });

    test('bad empty object in servers array', () => {
      const invalidConfig = {
        servers: [
          {server: 'foo.bar.com'}, /* good */
          {}/* bad */
        ]
      };
      function make() {
        return new clockSync(invalidConfig)
      }
      expect(make).toThrow();
    });

    test('invalid object in servers array 1', () => {
      const invalidConfig = {
        servers: [
          {server: 'foo.bar.com'}, /* good */
          {wrongKey: 'a.b.c', port: 123}/* bad */
        ]
      };
      function make() {
        return new clockSync(invalidConfig)
      }
      expect(make).toThrow();
    });

    test('invalid object in servers array 2', () => {
      const invalidConfig = {
        servers: [
          {server: 'foo.bar.com'}, /* good */
          {server: 'a.b.c', port: '123'}/* bad */
        ]
      };
      function make() {
        return new clockSync(invalidConfig)
      }
      expect(make).toThrow();
    });

    test('invalid value in (mixed format) servers array', () => {
      const invalidConfig = {
        servers: [
          'foo.bar.com', /* good */
          {server: 'a.b.c', port: 567}, /* good */
          {server: 'x.y.z'}, /* good */
          {} /* bad */
        ]
      };
      function make() {
        return new clockSync(invalidConfig)
      }
      expect(make).toThrow();
    });

  })

  describe('initialize with misc. config values', () => {

    test('original API; syncDelay, history', () => {
      const config = {
        syncDelay: 60,
        history: 5
      };
      const cs = new clockSync(config);
      expect(cs.tickRate).toBe(config.syncDelay * 1000);
      expect(cs.limit).toBe(config.history);
      expect(cs.delta).toHaveLength(1); // default initial sync
    });

    test('v1.1.0 API additions; cycleServers, startOnline, getIsOnline', () => {
      const config = {
        cycleServers: true,
        startOnline: false
      };
      const cs = new clockSync(config);
      expect(cs.cycleServers).toBe(config.cycleServers);
      expect(cs.isOnline).toBe(config.startOnline);
      expect(cs.getIsOnline()).toBe(false);
      expect(cs.delta).toHaveLength(0); // no initial sync
    });

  });

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

  });

});
