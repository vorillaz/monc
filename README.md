Monc - the ultimate MongoDB cache module

# Installation
Monc is quite easy to install and configure.

Using NPM
```bash
npm install monc --save
```


## Getting started
Monc should be configured to work along with Mongoose.

```javascript
var monc = require('monc'),
    mongoose = require('mongoose'),
    options  = {};

//Configure monc
monc.install(mongoose, options);
```

Monc is all set and ready to work.

## Options
* `max` The maximum size of the cache, checked by applying the length
  function to all values in the cache.  Not setting this is kind of
  silly, since that's the whole purpose of this lib, but it defaults
  to `Infinity`.
* `maxAge` Maximum age in ms.  Items are not pro-actively pruned out
  as they age, but if you try to get an item that is too old, it'll
  drop it and return undefined instead of giving it to you.
* `setFlag` : `boolean`. This option allows Monc module to attach a `comingFromCache` property on
  each document retrieved from the cache
* `canLog`: `boolean`. This option allows Monc module to log information values on the console.
* `modelValues`: `boolean` . This option allows Monc module to keep a record with each cache object saved per Model.

## Monc API

Monc attaches several useful methods both on Models and Query operations

### Query methods

`.cache(binKey)` This chainable method stores or retrieves a set of documents.
The binKey is optional.

```javascript
var test = mongoose.model('testModel');
test.find({}).lean().cache().exec(function(err, docs) {
  //docs are saved into the cache  
});

test.find({}).lean().cache().exec(function(err, docs) {
  //docs mapped to binkey:  "helloThere" are retrieved from Cache
});

test.find({}).lean().exec(function(err, docs) {
  //docs are retrieved from the db
});

test.find({}).lean().cache("helloCache").exec(function(err, docs) {
  //docs are saved into the cache, mapped to "helloCache"
});

```

`.clean(binKey)` Removes the stored objects.
The binKey is optional.
```javascript
  var test = mongoose.model('testModel');
  test.find({}).cleanAll().cache("helloCache").exec(function(err, docs) {
    //Firsty the cache is reset
    //afterwards docs are saved into the cache, mapped to "helloCache"
  });
```

`.cleanAll()` Resets the whole cache.
```javascript
  var test = mongoose.model('testModel');
  test.find({}).cleanAll().cache("helloCache").exec(function(err, docs) {
    //Firsty the cache is reset
    //afterwards docs are saved into the cache, mapped to "helloCache"
  });
```

`.cleanMultiple([binkeys])` Resets all the associated values maped
```javascript
  var test = mongoose.model('testModel');
  test.find({}).cleanMultiple(["binkey1","binkey2"]).cache("helloCache").exec(function(err, docs) {
    //Firsty binkey1 and binkey2 are removed from the cache
    //afterwards docs are saved into the cache, mapped to "helloCache"
  });
```
### Model methods

Since fetching Mongoose queries could be hard and inefficient Monc attaches useful methods on the Models as well.


`.cleanAll()` Resets the whole cache.
```javascript
  var test = mongoose.model('testModel');
  test.cleanAll();
```

`.cleanMultiple([binkeys])` Resets all the associated values maped
```javascript
  var test = mongoose.model('testModel');
  test.cleanMultiple(["binkey1","binkey2"]);
    //Firsty binkey1 and binkey2 are removed from the cache
    //afterwards docs are saved into the cache, mapped to "helloCache"
```


`.allValues()` Grab all the values stored into the cache.
```javascript
  var test = mongoose.model('testModel');
  test.allValues().map(function(v,i){
    console.log("stored", v)
  });
```

`.dump()` Grab all the values and matched keys stored into the cache.
```javascript
  var test = mongoose.model('testModel');
  test.dump().map(function(v,i){
   console.log("key", v["k"]);
   console.log("value", v["v"]);
  })
```

`.getDir(key)` Directly grab the associated stored object.
```javascript
  var test = mongoose.model('testModel');
  test.setDir("key",[{"hello" : "world"}]);
  test.getDir("key").map(function(v,i){
   console.log("key", v["k"]);
   console.log("value", v["v"]);
  })
```

`.setDir(key,val)` Directly store an object to cached.
```javascript
  var test = mongoose.model('testModel');
  test.setDir("key",{"hello" : "world"});

  test.dump().map(function(v,i){
   console.log("key", v["k"]); // key
   console.log("value", v["v"]); //{"hello" : "world"}
  })
```

`.getModelBinKey()` Each Model has a unique identifier, using `.getModelBinKey()` method you may retrieve it .
```javascript
  var test = mongoose.model('testModel');
  console.log(test.getModelBinKey())
```

`.assoc()` One of the best methods provided. Each Query store into the cache is associated with the parent Model. Using `assoc()` you can retrieve the active keys that are mapped with the given model . This method requires the `modelValues` set to true.
```javascript
  var test = mongoose.model('testModel');
  test.find({}).cache("helloCache").exec(function(err, docs) {});
  test.find({}).cache("helloCache1").exec(function(err, docs) {});

  test.assoc().map(function(v,i){
   console.log(v); // ["helloCache", "helloCache1"]
   //get the value !!

   console.log(test.getDir(v));
  })
```


`.assocObj()` Retrieve the associated stored objects and keys mapped to the parent Model. This method requires the `modelValues` set to true.
```javascript
  var test = mongoose.model('testModel');
  test.find({}).cache("helloCache").exec(function(err, docs) {});
  test.find({}).cache("helloCache1").exec(function(err, docs) {});

  test.assocObj().map(function(v,i){
   console.log(v); //keys and objects
  })
```

## Running tests
Tests are powered by Mocha and Chai
There are a bunch of them provided. Run them by.

```bash
  npm install
  npm test
```


>There are only two hard things in Computer Science: cache invalidation and naming things. -- Phil Karlton
