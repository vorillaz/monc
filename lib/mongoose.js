
exports.install = module.exports.install = function(mongoose, options, Aggregate) {
  var _this = mongoose;

  //TODO USE Memcached and Redis
  var _cacheModule = require('lru-cache');

  _this.Query.prototype.cacheDefaultOpts = _this.cacheDefaultOpts = { max: 500, maxAge: 1000 * 60 * 60 };
  _this.Query.prototype.__cached = _this.__cached = false;
  _this.Query.prototype.__cleanCache = _this.__cleanCache = false;

  _this.shouldAttach = options.setFlag ? true : false;
  _this.canLog = options.debug || false;
  _this.__log = _this.canLog ? console.log : function() {};
  _this.__attachModelValues = options.modelValues || true;
  _this.cacheMod = _cacheModule(options || _this.cacheDefaultOpts);
  _this.modelBinKey = "";



  //store default declarations
  var originalFuns = {
		execFind: mongoose.Query.prototype.execFind,
		exec: mongoose.Query.prototype.exec
	};
  //helper functions

  _this.setKey = function(key,thisRef){
    _this.modelBinKey = thisRef.model.modelName;
    if(key){
      if(key.constructor == String) return key;
      else return JSON.stringify(key);
    }else{
        return _this.generateBin(thisRef);
      }
  }

  //cache flag setter
  _this.cache = function(binKey){
    this.__cached = true;
    this.__binKey = _this.setKey(binKey,this);
    return this;
  };

  //clean a specific query
  _this.cleanCache = function(binKey){
    this.__cleanCache = true;
    this.__binKey = _this.setKey(binKey,this);
    _this.cacheMod.del(this.__binKey);
    _this.__log('Deleting cache  ' + this.__binKey );
    return this;
  };

  //clean all the sored data!
  _this.cleanAll = function(){
    if(_this.canLog){
       _this.cacheMod.forEach(function(value,key,cache){
         _this.__log('Deleting cache in loop key ->  ' + key );
       });
     }
     _this.cacheMod.reset();
     return this;
  }

  _this.cleanMultiple = function(arr){
    if(arr.construct == Array){
      arr.forEach(function(value,key){
        _this.__log('Deleting cache in key ->  ' + key );
        _this.cacheMod.del(key);
      });
    }
    return this;
  }


  _this.generateBin = function(refQuery){
    if (refQuery._pipeline) {
			return _this.generateBinAggregate(refQuery);
		}

    var newBinKey = JSON.stringify({
        model: refQuery.model.modelName,
        query: refQuery._conditions,
        fields: refQuery._fields || {},
        options: refQuery.options
    });
    _this.__log('Generating cache bin key for ' + newBinKey );
    return newBinKey;
  };

  _this.generateBinAggregate = function(refQueryAggr) {
    var newBinKey =  JSON.stringify({
			model: refQueryAggr._model.modelName,
			pipeline: refQueryAggr._pipeline,
			options: refQueryAggr.options
		});
    _this.__log('Generating cache bin key for ' + newBinKey );
    return newBinKey;
	};



  //execution alteration
  _this.execAlter = function(caller, args) {
    if(!this.__cached){
      return originalFuns[caller].apply(this, args);
    }

    var cachedObj = _this.cacheMod.get(this.__binKey);
    if(cachedObj){
      _this.__log('Cache hit -> ', this.__binKey);
      for (var i = 0; i < args.length; i++) {
				if (typeof args[i] === 'function') {
          args[i](null, cachedObj);
					break;
				}
			}
      return this;
    }

    var setCache = function(err, obj) {
      if (!err && obj!= null) {
        _this.__log('Save to cache with binkey ', key);
        //array or object
        if(obj instanceof Array && _this.shouldAttach){
          obj.map(function(v,i){ v.comingFromCache = true; })
        }else if(_this.shouldAttach){
          obj.comingFromCache = true;
        }

        _this.cacheMod.set(key, obj);
        //each time cache is set

        //an associated array is saved binded to Model's names ;)
        //if(var modelCache = _this.cacheMod.get(key))
        if(_this.__attachModelValues) _this.attachModelValues(key);

      }
      this.apply(this, arguments);
    };

    var key = this.__binKey;
    //no cache generate and store
    for (var i = 0; i < args.length; i++) {
			if (typeof args[i] !== 'function')
				continue;
      args[i] = (setCache).bind(args[i]);
		}
    return originalFuns[caller].apply(this, args);

  };
  _this.attachModelValues = function(key){
    var alreadyThereCached = _this.cacheMod.get(_this.modelBinKey) || [];
    //remove staled data!
    alreadyThereCached = _this.removeStaled(alreadyThereCached);
    //attach
    alreadyThereCached.push(key);
    _this.__log('Updating Model\'s cache');
    _this.cacheMod.set(_this.modelBinKey, alreadyThereCached);
  }

  _this.removeStaled = function(checkIfStaled){
    _this.__log('Removing staled data from model\'s cache ' );
    return checkIfStaled.filter(function(v,i){
      return _this.cacheMod.get(v);
    });
  }

  _this.assoc = function(){
    _this.__log('Retrieving Model\'s associated keys' );
    return _this.cacheMod.get(_this.modelBinKey) || [];
  }


  _this.assocObj = function(){
    _this.__log('Retrieving Model\'s associated objects' );
    var keys = _this.cacheMod.get(_this.modelBinKey) || [];
    return _this.cacheMod.get(keys);
  }

  _this.allValues = function(){
    _this.__log('Retrieving all cache values' );
    return _this.cacheMod.values();
  }

  _this.dump = function(){
    _this.__log('Dumping whole cache' );
    return _this.cacheMod.dump();
  }

  _this.setDir = function(key,obj){
    _this.__log('Directly setting cache for' + key );
    return _this.cacheMod.set(key, obj);
  }
  _this.getDir = function(key){
    _this.__log('Cache hit -> ' + key );
    return _this.cacheMod.get(key);
  }
  _this.cleanFirst = function(binKey){
    this.__binKey = _this.setKey(binKey,this);
    return this;
  }
  _this.getModelBinKey = function(){
    _this.__log('Return  ' + this.modelName );
    return this.modelName;
  };



  //register helpers and alterations
  _this.Query.prototype.cache = _this.cache;
  _this.Query.prototype.cleanCache = _this.cleanCache;


  //map the utility functions to the Model and the query prototype!
  _this.Query.prototype.clean = _this.cleanFirst;
  _this.Model.cleanAll = _this.Query.prototype.cleanAll = _this.cleanAll;
  _this.Model.cleanMultiple = _this.Query.prototype.cleanMultiple = _this.cleanMultiple;
  _this.Model.allValues  = _this.allValues;
  _this.Model.dump  = _this.dump;
  _this.Model.setDir  = _this.setDir;
  _this.Model.getDir  = _this.getDir;

  _this.Model.getModelBinKey = _this.getModelBinKey;
  _this.Model.assoc = _this.assoc;
  _this.Model.assocObj = _this.assocObj;
  //extend default proto
  _this.Query.prototype.exec = function(arg1, arg2) {
		return _this.execAlter.call(this, 'exec', arguments);
	};
  return this;
};
