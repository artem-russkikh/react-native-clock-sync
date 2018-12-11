# react-native-clock-sync
Sync clock across mobile devices using NTP. Compatible with React Native. Based on https://www.npmjs.com/package/@smarterservices/smarterclock

Used to ensure the time used is in sync across distributed systems. The sync is achieved by the following process:

* Fetches the time from an NTP server.
* Adjusts for network latency and transfer time
* Computes the delta between the NTP server and the system clock and stores the delta for later use.
* Uses all the stored deltas to get the average time drift from UTC.
* Allows for specifying multiple NTP servers as backups in case of network errors.

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

* ```syncDelay``` (number) : The time (in seconds) between each call to an NTP server to get the latest UTC timestamp. Defaults to `300` (which is 5 minutes).
* ```history``` (number) : The number of delta values that should be maintained and used for calculating your local time drift. Defaults to `10`.
* ```startOnline``` (boolean) : A flag to prevent attempting network activity upon clockSync instantiation. Defaults to `true`. (immediate NTP server fetch attempt)

```javascript
{
  "syncDelay" : 60,
  "history": 10,
  "startOnline": false,
  ...
}
```

##### Server Options

* ```cycleServers``` (boolean) : A flag to allow for 'wrapping around' back to the beginning of the servers list (if > 1 are specified). Upon a network error, clockSync will attempt to use the next server in the list. Defaults to `false` (advance to last item and remain there regardless of additional errors encountered)
* ```servers``` (array) : An optional array of NTP servers to use when looking up time. If no *servers* key exists in the *config* object, the default NTP configuration will be  `pool.ntp.org` at port `123`. Otherwise, Items in the array may be in **any** of the following forms (mixed values are allowed):
 * (string) `"ntp.server.name"` - when a single string value is provided, it will be automatically associated with the default port number `123`
 * (object) with the keys ```server``` and ```port```. Only `server` is **required**. If `port` is omitted, it will be defaulted to `123`. Server values must be strings. Port values must be numbers.

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
    "pool.npt.org"
  ]
}

// formats can be mixed
{
  "servers": [
    "foo.bar.baz", /* default port */
    {"server": "a.b.c"}, /* default port */
    "x.y.z", /* default port */
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

### getIsOnline()

Returns the current `boolean` network status of the clockSync instance. `false` indicates that no network activity will be performed/NTP servers will not be contacted.

### getTime()

Returns unix timestamp based on delta values between server and your local time. This is the time that can be used instead of ```new Date().getTime()```

#### Example

```javascript
clock.getTime();
```

### setOnline(boolean)

Sets the current (per-instance) network status. Passing an argument of `true` (if the current status is `false`) will cause the instance to immediately attempt an NTP fetch, and resume the internal update timer at a frequency determined by the `syncDelay` config parameter (or its default). Conversely, passing `false` (when current is `true`) Immediately stops the internal timer and prevents any further network activity. **NOTE:** Calling this method with an argument that matches the instance's current network state results in a no-op.

#### Offline behavior

When set to *offline*, calls to `getTime()` will return the current device time adjusted by whatever values are currently in the history. (or no adjustment if the history is empty/NTP has never been fetched)

Calls to `syncTime()` are effectively a no-op in offline mode. No NTP fetch will be performed, and no updates to the local time history will be made.

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

### syncTime()

An on-demand method that will force a sync with an NTP server. Will not sync or update when *offline*.

```javascript
clock.syncTime();
```
