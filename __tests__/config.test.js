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
    expect(cs.verboseHistory).toBe(false);
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
    expect(cs.verboseHistory).toBe(false);
    expect(cs.getTime()).toBeGreaterThan(0);
  });

  test('initialize misc. history config values', () => {
    function make(config) {
      return () => (new clockSync(config));
    }
    // errors
    expect( make( {history: -300} )).toThrow();
    expect( make( {history: -12} )).toThrow();
    expect( make( {history: '-300'} )).toThrow();
    // invalid, set to default
    let c = make({history: 'one'})();
    expect(c.limit).toBe(10);
    c = make({history: 0})();
    expect(c.limit).toBe(10);
    c = make({history: '0'})();
    expect(c.limit).toBe(10);
    c = make({history: '-0.9'})(); // special case. gets truncated to an int -0
    expect(c.limit).toBe(10);
    // valid
    c = make({history: '15'})();
    expect(c.limit).toBe(15);
    c = make({history: 250})();
    expect(c.limit).toBe(250);
    c = make({history: 25.670})(); // floats are truncated
    expect(c.limit).toBe(25);
  });

  test('initialize misc. syncDelay config values', () => {
    function make(config) {
      return () => (new clockSync(config));
    }
    // errors
    expect( make( {syncDelay: -300} )).toThrow();
    expect( make( {syncDelay: -12} )).toThrow();
    expect( make( {syncDelay: '-300'} )).toThrow();
    expect( make( {syncDelay: '-0.9'} )).toThrow();
    // invalid, set to default
    const def = 300 * 1000;
    let c = make({syncDelay: 'one'})();
    expect(c.tickRate).toBe(def);
    c = make({syncDelay: 0})();
    expect(c.tickRate).toBe(def);
    c = make({syncDelay: '0'})();
    expect(c.tickRate).toBe(def);
    // valid
    c = make({syncDelay: '15'})();
    expect(c.tickRate).toBe(15 * 1000);
    c = make({syncDelay: 250})();
    expect(c.tickRate).toBe(250 * 1000);
    c = make({syncDelay: 25.670})();
    expect(c.tickRate).toBe(25.670 * 1000);
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

    test('v1.1.0 API additions; cycleServers, startOnline, verboseHistory, getIsOnline', () => {
      const config = {
        cycleServers: true,
        startOnline: false,
        verboseHistory: true
      };
      const cs = new clockSync(config);
      expect(cs.cycleServers).toBe(config.cycleServers);
      expect(cs.isOnline).toBe(config.startOnline);
      expect(cs.getIsOnline()).toBe(false);
      expect(cs.delta).toHaveLength(0); // no initial sync
      expect(cs.verboseHistory).toBe(true);
    });

  });

});
