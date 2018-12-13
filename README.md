# react-native-clock-sync
Sync clock across mobile devices using NTP. Compatible with React Native. Based on https://www.npmjs.com/package/@smarterservices/smarterclock

Used to ensure the time used is in sync across distributed systems. The sync is achieved by the following process:

* Fetches the time from an NTP server.
* Adjusts for network latency and transfer time
* Computes the delta between the NTP server and the system clock and stores the delta for later use.
* Uses all the stored deltas to get the average time drift from UTC.
* Allows for specifying multiple NTP servers as backups in case of network errors.
* Ability to get historical details on (un)successful syncs, errors, and raw time values
* Ability to take instance 'offline' (effectively pausing network activity)

## Getting Started
Install the module:

```
npm install react-native-clock-sync --save
```

Link native dependencies of [react-native-udp](https://github.com/tradle/react-native-udp#install):

```
react-native link react-native-udp
```

## Usage

Import the module into your codebase

```javascript
import clockSync from 'react-native-clock-sync'
```

Create an instance of the clock object passing in the required params. See the options section below for options that can be used.

```javascript
var options = {};

// create a new instance
var clock = new clockSync(options);

// get the current unix timestamp
var currentTime = clock.getTime();

console.log(currentTime);
```

## Options

The clock constructor can accept the following options.  **all options are optional**

##### Basic Options

* `syncDelay` (+number) : The time (in seconds) between each call to an NTP server to get the latest UTC timestamp. Defaults to `300` (which is 5 minutes) if not present, zero, or supplied value is not a number. **Supplied value must be > 0**
* `history` (+int) : The number of delta values that should be maintained and used for calculating your local time drift. Defaults to `10` if not present, zero, or supplied value is not a number. **Supplied value must be > 0**
* `startOnline` (boolean) : A flag to control network activity upon clockSync instantiation. Defaults to `true`. (immediate NTP server fetch attempt)

```javascript
{
  "syncDelay" : 60,
  "history": 10,
  "startOnline": false,
  ...
}
```

##### Server Options

* `cycleServers` (boolean) : A flag to allow for 'wrapping around' back to the beginning of the servers list (if > 1 are specified). Upon a network error, clockSync will attempt to use the next server in the list until it reaches the end. When `cycleServers === true`, it will wrap back to the first item and move through the list again. Defaults to `false` (advance to last item and remain there regardless of additional errors encountered)
* `servers` (array) : An optional array of NTP servers to use when looking up time. If no *servers* key exists in the *config* object, the default NTP configuration will be  `pool.ntp.org` at port `123`. Otherwise, items in the array may be in **any** of the following forms (mixed values are allowed):
 * (string) `"ntp.server.name"` - when a single string value is provided, it will be automatically associated with the default port number `123`
 * (object) with the keys `server` and `port`. Only `server` is **required**. If `port` is omitted, it will be defaulted to `123`. Server values must be strings. Port values must be numbers.

These are some examples of acceptable server configurations:
```javascript
{
  "cycleServers": true,
  "servers" : [{"server": "pool.ntp.org", "port": 123}]
}

// all default port
{
  "servers": [
    "foo.bar.com",
    "baz.bat.qux",
    "pool.ntp.org"
  ]
}

// formats may be mixed
{
  "servers": [
    "foo.bar.baz",        /* default port */
    {"server": "a.b.c"},  /* default port */
    "x.y.z",              /* default port */
    {"server": "aaa.bbb.ccc", "port": 456} /* fully specified */
  ]
}
```



## Example

```javascript
  import clockSync from 'react-native-clock-sync'
  var clock = new clockSync({});

  var syncTime = clock.getTime();
  console.log('SyncTime:' + syncTime);

  setInterval(function() {
    var localTime = new Date().getTime();
    var syncTime = clock.getTime();
    var drift = parseInt(localTime) - parseInt(syncTime);

    console.log('SyncTime:' + syncTime + ' vs LocalTime: ' + localTime + ' Difference: ' + drift + 'ms');
  }, 5000);
```

## Methods

### getHistory()

Returns an `Object` of historical details generated as *clockSync* runs. It includes several fields that can be used to determine the behavior of a running *clockSync* instance. Each call represents an individual 'snapshot' of the current *clockSync* instance. History is not updated when instance is *offline*.

#### Fields

* `currentConsecutiveErrorCount` (int) : Count of current string of errors since entering an error state (`isInErrorState === true`). Resets to `0` upon successful sync.
* `currentServer` (object) : Object containing server info of the server that will be used for the next sync. Props are:
 * `server` (string) : the NTP server name
 * `port` (int) : the NTP port
* `deltas` (array&lt;object&gt;) : This array will contain a 'rolling' list of raw time values returned from each successful NTP server sync wrapped in a simple object with the following keys: (**note:** array length is limited to `config.history`; oldest at `index 0`)
 * `dt` (+/- int) : The calculated delta (in ms) between local time and the value returned from NTP.
 * `ntp` (int) : The unix epoch-relative time (in ms) returned from the NTP server. (raw value returned from server) **note**: ```ntp + -1(dt) = local time of sync```  
* `errors` (array&lt;object&gt;) : This array will contain a 'rolling' list of any errors that have occurred during sync attempts. (**note:** array length is limited to `config.history`; oldest at `index 0`). The object contains typical fields found in JS `Error`s as well as additional information.
 * `name` (string) : JavaScript Error name
 * `message` (string) : JavaScript Error message
 * `server` (object) : The server that encountered the sync error. Same keys as `currentServer` object. (possibly different values)
 * `stack` (string) : JavaScript Error stack trace (if available)
 * `time` (int) : The **local** unix epoch-relative timestamp when error was encountered (in ms)
* `isInErrorState` (boolean) : Flag indicating if the last attempted sync was an error (`true`) Resets to `false` upon successful sync.
* `lastSyncTime` (int) : The **local** unix epoch-relative timestamp of last successful sync (in ms)
* `lastNtpTime` (int) : The **NTP** unix epoch-relative timestamp of the last successful sync (raw value returned from server)
* `lastError` (object) : The error info of the last sync error that was encountered. Object keys are same as objects in the `errors` array.
* `lifetimeErrorCount` (int) : A running total of all errors encountered since *clockSync* instance was created.
* `maxConsecutiveErrorCount` (int) : Greatest number of errors in a single error state (before a successful sync).

#### Example

```javascript
// sample return value of getHistory
// dummy values, actual types
{
  currentConsecutiveErrorCount: 1,
  currentServer: {
    server: 'good.fake.server',
    port: 123
  },
  deltas: [
    {
      dt: -169,
      ntp: 1544681340812
    },
    {
      dt: 487,
      ntp: 1544681470828
    }
  ],
  errors: [
    {
      name: 'Error',
      message: 'Mock Error',
      server: {
        server: 'FAIL.FAIL.FAIL',
        port: 456
      },
      stack: 'Error: Mock Error\n    at Object.getNetworkTime (/Users/xyz/rnative/react-native-clock-sync/__mocks__/react-native-ntp-client.js:37:10)\n    at clockSync.getNetworkTime [as getDelta] (/Users/xyz/rnative/react-native-clock-sync/index.js:103:17)\n    at clockSync.getDelta (/Users/xyz/rnative/react-native-clock-sync/index.js:226:8)\n ... (rest of stack omitted for brevity)',
      time: 1544681598417
    },
    {
      name: 'Error',
      message: 'Mock Error',
      server: {
        server: 'FAIL.FAIL.FAIL',
        port: 666
      },
      stack: 'Error: Mock Error...(rest of stack omitted for brevity)',
      time: 1544681706941
    }
  ],
  isInErrorState: true,
  lastSyncTime: 1544681470341,
  lastNtpTime: 1544681470828,
  lastError: {
    name: 'Error',
    message: 'Mock Error',
    server: {
      server: 'FAIL.FAIL.FAIL',
      port: 666
    },
    stack: 'Error: Mock Error\n    at Object.getNetworkTime (/Users/xyz/rnative/react-native-clock-sync/__mocks__/react-native-ntp-client.js:37:10)\n    at clockSync.getNetworkTime [as getDelta] (/Users/xyz/rnative/react-native-clock-sync/index.js:103:17)\n    at clockSync.getDelta (/Users/xyz/rnative/react-native-clock-sync/index.js:226:8)\n ... (rest of stack omitted for brevity)',
    time: 1544681598417
  },
  lifetimeErrorCount: 6,
  maxConsecutiveErrorCount: 2
}

```

### getIsOnline()

Returns the current `boolean` network status of the clockSync instance. `false` indicates that no network activity will be performed/NTP servers will not be contacted.

### getTime()

Returns unix timestamp based on delta values between server and your local time. This is the time that can be used instead of ```new Date().getTime()```

#### Example

```javascript
clock.getTime();
```

### setOnline(boolean)

Sets the current (per-instance) network status. Passing an argument of `true` (if the current status is `false`) will cause the instance to immediately attempt an NTP fetch, and resume the internal update timer at a frequency determined by the `syncDelay` config parameter (or its default). Conversely, passing `false` (when current is `true`) immediately stops the internal timer and prevents any further network activity. **NOTE:** Calling this method with an argument that matches the instance's current network state results in a no-op.

#### Offline behavior

When set to *offline*, calls to `getTime()` will return the current device time adjusted by whatever values are currently in the history. (or no adjustment if the history is empty/NTP has never been fetched)

Calls to `syncTime()` are effectively a no-op in offline mode. No NTP fetch will be performed, and no updates to the local time history will be made (to prevent polluting the running average drift).

#### Example

When dealing with mobile development, it is sometimes necessary to respond to changes in network availability. `setOnline` provides a convenient 'hook' to do so, preventing unnecessary errors and timeouts.

React Native allows for watching device network status. Which can be used with `setOnline` like so:

```javascript
import clockSync from 'react-native-clock-sync';
import { NetInfo } from 'react-native';

// start in offline state
const config = {
  startOnline: false
};

const clock = new clockSync(config);

// this handler will receive the device's network status
function handleConnectivityChange = isConnected => {
  clock.setOnline(isConnected);
}

// register handler with react-native
NetInfo.isConnected.addEventListener('connectionChange', handleConnectivityChange);
```

**NOTE:** The example above does not account for rapid changes in network state. You may wish to add additional handling to 'de-bounce' such changes. Also, remember to remove the listener and set your clockSync instance to *offline* when done (un-mounting components, shutting down, etc.)

### syncTime( *[callback]* )

An on-demand method that will force a sync with an NTP server. Will not sync or update when *offline*.

**NOTE:** You generally do not need to invoke a manual sync since *clockSync* automatically runs sync according to the specified `syncDelay` interval (or its default).

An optional callback function may be supplied to monitor completion/failure of the requested sync. Callback will accept a single `boolean` parameter that indicates success or failure of the requested sync. Callback will always be given `false` when instance is *offline*.

```javascript
clock.syncTime();
```

or

```javascript
function cb(success) {
  console.log("sync was" + (success ? "" : " not") + " a success");
}

clock.syncTime(cb);
```
