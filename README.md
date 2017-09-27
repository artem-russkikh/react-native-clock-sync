# react-native-clock-sync
Sync clock across mobile devices using NTP. Compatible with React Native. Based on https://www.npmjs.com/package/@smarterservices/smarterclock

Used to ensure the time used is in sync across distributed systems. The sync is achived by the following process:

* Fetches the time from an NTP server.
* Adjusts for network latency and transfer time
* Computes the delta between the NTP server and the system clock and stores the delta for later use.
* Uses all the stored deltas to get the average time drift from UTC.

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

* ```syncDelay``` (number) : The time (in seconds) between each call to an NTP server to get the latest UTC timestamp. Defaults to 300 (which is 5 minutes).
* ```history``` (number): The nubmer of delta values that should be maintained and used for calculating your local time drift.  Defaults to 10.
* ```servers``` (array) : An array of NTP servers to use when looking up time.  Each value in the array should be an object with the keys ```server``` and ```port```.  Defaults to pool.ntp.org.

```javascript
{
  "syncDelay" : 60,
  "history": 10,
  "servers" : [{"server": "pool.ntp.org", "port": 123}]
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

### getTime()

Returns unix timestamp based on delta values between server and your local time. This is the time that can be used instead of ```new Date().getTime()```

#### Example

```javascript
clock.getTime();
```

### syncTime()

An on-demand method that will force a sync with an NTP server.

```javascript
clock.syncTime();
```
