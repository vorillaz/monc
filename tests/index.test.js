var expect = require('chai').expect,
  monc = require('../lib/mongoose'),
  mongoose = require('mongoose'),
  async = require('async'),
  albumModel,
  artistModel,
  mongooseConnect = 'mongodb://127.0.0.1:27017/monced';
  wuAlbums = ["Enter the Wu-Tang (36 Chambers)",
    "Wu-Tang Forever", "The W", "Iron Flag", "Enter the Wu-Tang (36 Chambers): Instrumentals",
    "8 Diagrams", "Chamber Music", "Legendary Weapons", "A Better Tomorrow", "Once Upon a Time in Shaolin"
  ],
  wuMembers = ["RZA", "GZA", "Method Man", "Raekwon", "Ghostface Killah",
    "Inspectah Deck", "U-God", "Masta Killa", "Cappadonna"
  ],
  wuYears = [1993, 1997, 2000, 2001, 2007, 2007, 2009, 2011, 2014, 2015],
  oneExtraAlbum = {title : "WU IS FOR THE KIDS", year: 2100};


describe('monc', function() {
  before(function(done) {

    mongoose.connect(mongooseConnect);
    //set caching to 0.5 sec
    monc.install(mongoose, {
      maxAge: 500,
      debug: false,
      setFlag: true
    });
    artistModel = mongoose.model('artistModel', new mongoose.Schema({
      name: String
    }));
    albumModel = mongoose.model('albumModel', new mongoose.Schema({
      title: String,
      year: Number,
      artists:[artistModel]
    }));

    var albums = [];
    for (var i in wuAlbums) {
      albums.push({
        title: wuAlbums[i],
        year: wuYears[i]
      });
    }
    albumModel.create(albums);

    var artists = [];
    for (var i in wuMembers) {
      artists.push({
        name: wuMembers[i]
      });
    }
    artistModel.create(artists, done);


  });

  afterEach(function(done) {
    // wait for cache expiration
    setTimeout(function() {
      done();
    }, 500);
  });

  after(function(done) {
    //clear data
    async.waterfall([
        function(callback){
            //clean the albums
            albumModel.remove({}, function(err) {
              callback(null, 'next');
            });
        },
        function(arg1, callback){
          //clean the artists
          artistModel.remove({}, function(err) {
            callback(null, 'next');
          });
        }
      ], function (err, result) {
        mongoose.disconnect();
        done(err);
    });
  });

  it('should export an object ', function() {
    expect(monc).to.be.an('object');
  });

  it('should have cache() method attached to the Query prototype', function() {
    expect(albumModel.find({}).cache).to.be.a('function');
  });

  it('should have default options', function() {
    var query = albumModel.find({}).cache();
    expect(query.cacheDefaultOpts).to.exist;
    expect(query.__cached).to.exist;
    expect(query.__cleanCache).to.exist;
  });


  it('should not cache if cache() is not called', function(done) {
    albumModel.find({}).cache().exec(function(err) {
      if (err) {
        return done(err);
      }
      albumModel.find({}).exec(function(err, docs) {
        if (err) {
          return done(err);
        } else {
          expect(docs.comingFromCache).to.not.exist;
          done();
        }
      });
    });
  });

  it('should cache if cache() is called', function(done) {
    albumModel.find({}).cache().exec(function(err) {
      if (err) {
        return done(err);
      }
      albumModel.find({}).cache().exec(function(err, albums) {
        if (err) {
          return done(err);
        } else {
          expect(albums[0].comingFromCache).to.exist;
          done();
        }
      });
    });
  });

  it('should cache if cache("binkey") is called', function(done) {
    albumModel.find({}).cache("thisIsBinKey").exec(function(err) {
      if (err) {
        return done(err);
      }
      albumModel.find({}).cache("thisIsBinKey").exec(function(err, albums) {
        if (err) {
          return done(err);
        } else {
          expect(albums[0].comingFromCache).to.exist;
          done();
        }
      });
    });
  });


  it('should cache if cache(null) is called', function(done) {
    albumModel.find({}).cache(null).exec(function(err) {
      if (err) {
        return done(err);
      }
      albumModel.find({}).cache(null).exec(function(err, albums) {
        if (err) {
          return done(err);
        } else {
          expect(albums[0].comingFromCache).to.exist;
          done();
        }
      });
    });
  });


  it('should cache if cache({}) is called', function(done) {
    //clean all keys first
    albumModel.cleanAll();
    albumModel.find({}).cache({}).exec(function(err) {
      if (err) {
        return done(err);
      }
      albumModel.find({}).cache({}).exec(function(err, albums) {
        if (err) {
          return done(err);
        } else {
          expect(albums[0].comingFromCache).to.exist;
          done();
        }
      });
    });
  });

  it('should work with lean()', function(done) {
    albumModel.find({}).lean().cache().exec(function(err) {
      if (err) {
        return done(err);
      }
      albumModel.find({}).lean().cache().exec(function(err, albums) {
        if (err) {
          return done(err);
        } else {
          expect(albums[0].comingFromCache).to.exist;
          done();
        }
      });
    });
  });


  it('should work with findOne()', function(done) {
    albumModel.findOne({}).lean().cache().exec(function(err) {
      if (err) {
        return done(err);
      }
      albumModel.findOne({}).lean().cache().exec(function(err, singleAlbum) {
        if (err) {
          return done(err);
        } else {
          expect(singleAlbum).to.be.an('object');
          expect(singleAlbum.comingFromCache).to.exist;
          done();
        }
      });
    });
  });



  it('should keep an outdated copy before cache expiration', function(done) {

    albumModel.find({}).cleanAll().lean().cache().exec(function(err,albums) {
      if (err) {
        return done(err);
      }
      var initialLength = albums.length;

      var newWu = new albumModel(oneExtraAlbum);
      newWu.save(function (err) {
        if (err) {
          return done(err);
        }
        albumModel.find({}).cache().lean().exec(function(err, newAlbums) {
          if (err) {
            return done(err);
          } else {

            var newLength = newAlbums.length;
            //allthough we pushed a new object into the collection the cache retrieves the previous set
            expect(newAlbums[0].comingFromCache).to.exist;
            expect(initialLength).to.equal(newLength);
            done();
          }
        });
      });
    });
  });

  it('should directly return all the values from the cache', function(done) {
    async.waterfall([
        function(callback){
            //clean all the cache first
            albumModel.find({}).lean().cleanAll().exec(function(err, albums) {
              if (err) return done(err);
              callback(null, 'next');
            });
        },
        function(arg1, callback){
          albumModel.find({}).lean().cache("binKey1").exec(function(err, newAlbums) {
            if (err) return done(err);
            callback(null, 'next');
          });
        },
        function(arg1, callback){
          albumModel.find({}).lean().cache("binKey2").exec(function(err, newAlbums) {
            if (err) return done(err);
            callback(null, 'next');
          });
        },
        function(arg1, callback){
          albumModel.find({}).lean().cache("binKey3").exec(function(err, newAlbums) {
            if (err) return done(err);
            callback(null, 'next');
          });
        }
    ], function (err, result) {
        //3 iterations 3 objects into the cache
        //one more is the attached model's keys if this options is set
          
       expect(albumModel.allValues().length).to.be.within(3,4);
       done();
    });
  });

  it('should return the models name ', function(done) {
    expect("albumModel").to.be.equal(albumModel.getModelBinKey());
    done();
  });


  it('should retrieve Model\'s asscociated keys! ', function(done) {
    async.waterfall([
        function(callback){
            //clean all the cache first
            albumModel.find({}).lean().cleanAll().exec(function(err, albums) {
              if (err) return done(err);
              callback(null, 'next');
            });
        },
        function(arg1, callback){
          albumModel.find({}).lean().cache("binModelKey1").exec(function(err, newAlbums) {
            if (err) return done(err);
            callback(null, 'next');
          });
        },
        function(arg1, callback){
          albumModel.find({}).lean().cache("binModelKey2").exec(function(err, newAlbums) {
            if (err) return done(err);
            callback(null, 'next');
          });
        },
        function(arg1, callback){
          albumModel.find({}).lean().cache("binModelKey3").exec(function(err, newAlbums) {
            if (err) return done(err);
            callback(null, 'next');
          });
        },
        function(arg1, callback){
          albumModel.find({}).lean().cache("binModelKey4").exec(function(err, newAlbums) {
            if (err) return done(err);
            callback(null, 'next');
          });
        }
    ], function (err, result) {
        //3 iterations 3 objects into the cache
       expect(albumModel.assoc().length).to.be.equal(4);
       done();
    });
  });

  //this test should be placed last!

  it('should work even after removing the whole collection', function(done) {
      async.waterfall([
          function(callback){
              //clean all the cache objects first
              albumModel.find({}).lean().cleanAll().exec(function(err, albums) {
                if (err) return done(err);
                callback(null, 'next');
              });
          },
          function(arg1, callback){
            albumModel.find({}).lean().cache("binModelKey1").exec(function(err, newAlbums) {
              if (err) return done(err);
              callback(null, 'next');
            });
          },
          function(arg1, callback){
            albumModel.remove({}, function(err) {
              callback(null, 'next');
            });
          }
      ], function (err, result) {
          //3 iterations 3 objects into the cache
        albumModel.find({}).lean().cache("binModelKey1").exec(function(err, newAlbums) {
          if(err) done(err);
           expect(newAlbums[0].comingFromCache).to.exist;
           done();
       });

    });
  });






});
