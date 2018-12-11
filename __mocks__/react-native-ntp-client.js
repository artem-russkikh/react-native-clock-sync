// __mocks__/react-native-ntp-client.js
'use strict';

const client = jest.genMockFromModule('react-native-ntp-client');

// a fake NTP server domain that triggers the error callback in 'getNetworkTime'
const MOCK_FAILING_SERVER = 'FAIL.FAIL.FAIL';

// internal value to mock an NTP server's delta time in ms
var __offset_ms = 0;

// custom method to allow tests to set a server delta time
// can be +/- (values in milliseconds)
function __setOffsetMs(ms) {
  __offset_ms = ms;
}

// custom getNetworkTime that simply calls callback
function getNetworkTime(s, p, cb) {
  if (cb) {
    if (s === MOCK_FAILING_SERVER) {
      cb(new Error('Mock Error'), null);
    } else {
      cb(null, new Date( Date.now() + __offset_ms ));
    }
  }
}

/**** mocked API ****/
client.MOCK_FAILING_SERVER = MOCK_FAILING_SERVER;
client.__setOffsetMs = __setOffsetMs;
// overrides
client.getNetworkTime = getNetworkTime;

module.exports = client;
