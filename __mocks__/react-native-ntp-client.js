// __mocks__/react-native-ntp-client.js
'use strict';

const client = jest.genMockFromModule('react-native-ntp-client');

// a fake NTP server domain that triggers the error callback in 'getNetworkTime'
const MOCK_FAILING_SERVER = 'FAIL.FAIL.FAIL';
const MAX_ABS_JITTER_MS = 500;

// internal value to mock an NTP server's delta time in ms
let __offset_ms = 0;

// custom method to allow tests to set a server delta time
// can be +/- (values in milliseconds)
function __setOffsetMS(ms) {
  __offset_ms = ms;
}

let __jitter = false;

// jitter used to simulate random delta between local and ntp times
// typically shouldn't use jitter when offset !== 0
function __useJitter(j) {
  __jitter = j;
}

function __reset() {
  __offset_ms = 0;
  __jitter = false;
}

// custom getNetworkTime that simply calls callback
// after generating a time value, or error
function getNetworkTime(s, p, cb) {
  if (cb) {
    if (s === MOCK_FAILING_SERVER) {
      cb(new Error('Mock Error'), null);
    } else {
      let jitter = 0;
      if (__jitter) {
        jitter = Math.floor(Math.random() * ((MAX_ABS_JITTER_MS * 2) + 1)) - MAX_ABS_JITTER_MS;
      }
      cb(null, new Date( Date.now() + jitter + __offset_ms ));
    }
  }
}

/**** mocked API ****/
client.MOCK_FAILING_SERVER = MOCK_FAILING_SERVER;
client.__setOffsetMS = __setOffsetMS;
client.__useJitter = __useJitter;
client.__resetForTest = __reset;
// overrides
client.getNetworkTime = getNetworkTime;

module.exports = client;
