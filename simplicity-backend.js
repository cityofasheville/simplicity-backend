var yaml = require('yamljs');
var pg = require('pg');
var program = require('commander');
var cnt = 0;
pg.defaults.poolsize = 10;

//args
program
    .version('0.0.1')
    .usage('[options] ')
    .option('-d, --databaseconn <file>', 'PostGres database connection file <file> default is config/db.yml', String, 'config/db.yml')
    .option('-m, --maintenance <file>', 'maintenance configuration file <file>', String)
    .option('-t, --datatest <file>', 'data test configuration file <file>', String)
    .option('-c, --buildcache <file>', 'data test configuration file <file>', String)
    .parse(process.argv);

/**
  Load yaml file for database connection using YAML.load
  do not change the name of database connection file db.yml
  or it will be pushed to gitHub :-(
**/
var dataBaseConnectionObject = yaml.load(program.databaseconn);

/**
_____        _          _______        _
|  __ \      | |        |__   __|      | |
| |  | | __ _| |_ __ _     | | ___  ___| |_ ___
| |  | |/ _` | __/ _` |    | |/ _ \/ __| __/ __|
| |__| | (_| | || (_| |    | |  __/\__ \ |_\__ \
|_____/ \__,_|\__\__,_|    |_|\___||___/\__|___/


  data tests passed as argument?
  if so run the data testests
  the argiument must be a yaml file
**/
if (program.datatest) {

    //objects
    var dataTests_YAML = yaml.load(program.datatest);
    var dataTests_Obj = dataTests_YAML.tests;

    //clients for data data tests
    var dataTests_client;
    var dataTestsSuccess_client;

    var datatestcheck = true;
    var checkrun = false;

    //data test drain callback when all maintenace queries finish
    var dataTests_drain = function () {
        'use strict';
        dataTests_client.end();

        //all tests completed and one of them failed
        if (checkrun) {
            console.log(dataTests_YAML.testname + ' Test Results: ' + datatestcheck);
            console.log('Failed a test!  Cache will not be built! Please see the log for details');
        }

        //all tests completed and succesfull
        if (datatestcheck && !checkrun) {
            console.log(dataTests_YAML.testname + ' Test Results: ' + datatestcheck);
            dataTestsSuccess();
        }
    };

    //generic error callback for client,queries
    var dataTests_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Error: %s", err);
        }
        return err;
    };

    /**
      query on row method.
      for data tests when a row exists named check
      we use that to determine a pass or fail.
      when we encounter any fail we change the Tests state to fail with
      datatestcheck.
    **/
    var dataTests_queryRow = function (row, result) {
        'use strict';
        if (row.hasOwnProperty('check')) {
            if (row.check) {
                console.log('  ' + this.name + ' PASSED.');
            } else {
                console.log('  ' + this.name + ' FAILED.');
                datatestcheck = false;
            }
        } else {
            return;
        }
    };

    //varrables for dataTests_queryEnd
    var dataTests_rowcount = 0;
    var dataTests_complete = '';
    var dataTests_first = true;

    //when query ends
    var dataTests_queryEnd = function (result) {
        'use strict';

        //if (dataTests_first) {
        //  dataTests_first = false;
        //    console.log(dataTests_YAML.testname + ' Running Data check.');
        //}
        //calculate the percent complete
        //dataTests_complete = ((dataTests_rowcount / dataTests_YAML.tests.length) * 100).toFixed(2);

        //messages for showing progress
        //console.log('  Running ' + this.name + ' ' + dataTests_complete + '% completed');
        //dataTests_rowcount = dataTests_rowcount + 1;

        return result;
    };

    //data tests functionå
    var dataTests = function () {
        'use strict';

        //open client and connection for Checking buffers
        dataTests_client = new pg.Client(dataBaseConnectionObject);
        dataTests_client.on('drain', dataTests_drain);
        dataTests_client.connect(dataTests_clientError);

        var id;
        var dataTests_queryConfig;
        console.log('Running Test ' + dataTests_YAML.testname)
        for (id in dataTests_Obj) {
            if (dataTests_Obj.hasOwnProperty(id)) {

                dataTests_queryConfig = dataTests_Obj[id];

                dataTests_client.query(dataTests_queryConfig, dataTests_clientError)
                    .on('row', dataTests_queryRow)
                    .on('end', dataTests_queryEnd);
            }
        }
    };

    //data test sucessfull drain callback when all maintenace queries finish
    var dataTestsSuccess_drain = function () {
        'use strict';
        dataTestsSuccess_client.end();
    };

    //generic error callback for client,queries
    var dataTestsSuccess_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Error: %s", err);
        }
        return err;
    };

    //data tests successful query row callback
    var dataTestsSuccess_queryRow = function (row, result) {
        'use strict';
        return row;
    };

    //varrables for dataTestsSuccess_queryEnd
    var dataTestsSuccess_rowcount = 0;
    var dataTestsSuccess_complete = '';
    var dataTestsSuccess_first = true;

    //when query ends
    var dataTestsSuccess_queryEnd = function (result) {
        'use strict';

        if (dataTestsSuccess_first) {
            dataTestsSuccess_first = false;
            console.log('');
            console.log('Running Data Push for ' + dataTests_YAML.testname);
        }
        //calculate the percent complete
        dataTestsSuccess_complete = ((dataTestsSuccess_rowcount / dataTests_YAML.onsuccess.length) * 100).toFixed(2);

        //messages for showing progress
        console.log('  Running ' + this.name + ' ' + dataTestsSuccess_complete + '% completed');
        dataTestsSuccess_rowcount = dataTestsSuccess_rowcount + 1;
    };

    //data tests success full run these queries
    var dataTestsSuccess = function() {
      'use strict';

      //open client and connection for Checking buffers
      dataTestsSuccess_client = new pg.Client(dataBaseConnectionObject);
      dataTestsSuccess_client.on('drain', dataTestsSuccess_drain);
      dataTestsSuccess_client.connect(dataTestsSuccess_clientError);

      var sqlcommands = dataTests_YAML.onsuccess;
      var id;

      for (id in sqlcommands) {
          if (sqlcommands.hasOwnProperty(id)) {
              checkrun = true;
              dataTestsSuccess_client.query(sqlcommands[id], dataTestsSuccess_clientError)
                  .on('row', dataTestsSuccess_queryRow)
                  .on('end', dataTestsSuccess_queryEnd);
          }
      }
    };

    //run data tests
    dataTests();
}

//maintenance passed as argument?
/*
__  __       _       _
|  \/  |     (_)     | |
| \  / | __ _ _ _ __ | |_ ___ _ __   __ _ _ __   ___ ___
| |\/| |/ _` | | '_ \| __/ _ \ '_ \ / _` | '_ \ / __/ _ \
| |  | | (_| | | | | | ||  __/ | | | (_| | | | | (_|  __/
|_|  |_|\__,_|_|_| |_|\__\___|_| |_|\__,_|_| |_|\___\___|

*/
if (program.maintenance) {

    //load maintenance yaml
    var maintenance_YAML = yaml.load(program.maintenance);

    //clients for data maintenace
    var maintenance_client;

    //objects
    var maintenance_Obj = maintenance_YAML.sql;
    var maintenance_queryConfig;

    //maintence drain callback when all maintenace queries finish
    var maintenance_drain = function () {
        'use strict';
        maintenance_client.end();
    };

    //maintence error callback
    var maintenance_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Error: %s", err);
        }
        return err;
    };

    //varrables for maintenance_queryEnd
    var rowcount = 0;
    var startname = '';
    var complete = '';

    //maintenance query row callback
    var maintenance_queryRow = function (row, result) {
        'use strict';
        return row;
    };


    /**
      query end callback for maintenance
      provides feedback about progress and status of build
    **/
    var maintenance_queryEnd = function (result) {
        'use strict';
        if (rowcount === 0) {
            console.log('');
            console.log("Begining Maintenance.");
        }
        //calculate the percent complete
        startname = this.name;
        complete = ((rowcount / maintenance_Obj.length) * 100).toFixed(2);

        //messages for showing progress
        console.log('  Running ' + this.name + ' ' + complete + '% completed');
        rowcount = rowcount + 1;

        if (rowcount === maintenance_Obj.length) {
            console.log("Completed Maintenance.");
        }
        //c
    };

    /*
      main function for runnong sql based maintenace
    */
    var maintenance = function () {
        'use strict';

        //open client and connection for maintenance
        maintenance_client = new pg.Client(dataBaseConnectionObject);
        maintenance_client.on('drain', maintenance_drain);
        maintenance_client.connect(maintenance_clientError);

        var id;

        for (id in maintenance_Obj) {
            if (maintenance_Obj.hasOwnProperty(id)) {
                maintenance_queryConfig = maintenance_Obj[id];
                maintenance_client.query(maintenance_queryConfig, maintenance_clientError)
                    .on('row', maintenance_queryRow)
                    .on('end', maintenance_queryEnd);
            }
        }
    };

    //run  maintenance();
    maintenance();

}


//buildcache data passed as argument?
/*
____        _ _     _    _____           _
|  _ \      (_) |   | |  / ____|         | |
| |_) |_   _ _| | __| | | |     __ _  ___| |__   ___
|  _ <| | | | | |/ _` | | |    / _` |/ __| '_ \ / _ \
| |_) | |_| | | | (_| | | |___| (_| | (__| | | |  __/
|____/ \__,_|_|_|\__,_|  \_____\__,_|\___|_| |_|\___|
*/
if (program.buildcache) {
    //Load build cache yaml
    var buildcache_YAML = yaml.load(program.buildcache);

    //objects
    var buildCache_Obj = buildcache_YAML.buildcache;
    var buildCacheCount_Obj = buildcache_YAML.count;
    var buildBuffer_Obj = buildcache_YAML.buffer;
    var buildCheck_Obj = buildcache_YAML.buffercheck;

    //clients for each step of building the cache
    var buildCacheCount_client;
    var bufferCheck_client;
    var buildBuffer_client;
    var buildCache_client;

    //controling variables
    var buildcacheIncrement = buildcache_YAML.increment;
    var buildcacheSleep = buildcache_YAML.sleep;
    var buildcacheDistances;
    var buildcacheCheckPass = true;

    //Cache Count error callback
    var  buildCacheCount_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Error: %s", err);
        }
        return err;
    };

    //when all cache buildCacheCount queries end kill the client connection
    var buildCacheCount_drain = function () {
        'use strict';
        buildCacheCount_client.end();
        return;
    };

    /**
      query row callback for buildCacheCount
    **/
    var buildCacheCount_queryRow = function (row, result) {
        'use strict';

        //check row count
        if (row.count) {
            cnt = row.count;

            //must have more that one address to work
            if (cnt <  1) {
                console.error('Building a cache requires more than one record in the address table.');
            } else {
                console.log('total address count: ' + cnt);
                //if more than 1 address build the buffer layer
                buildBuffer();
            }

        } else {
            //the query to check the number of addresses must have an integer field named count
            console.error('Must have a column named count!');
        }
    };

    //when query ends
    var buildCacheCount_queryEnd = function (result) {
        'use strict';
        return result;
    };

    //should be only one sql statement here so assume [0]
    var buildCacheCount = function () {
        'use strict';

        //open client and connection for Checking buffers
        buildCacheCount_client = new pg.Client(dataBaseConnectionObject);
        buildCacheCount_client.on('drain', buildCacheCount_drain);
        buildCacheCount_client.connect(buildCacheCount_clientError);

        /**
          start the cache building process
        **/
        buildCacheCount_client.query(buildCacheCount_Obj[0], buildCacheCount_clientError)
            .on('row', buildCacheCount_queryRow)
            .on('end', buildCacheCount_queryEnd);

    };

    //Buffer check error callback
    var bufferCheck_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Error: %s", err);
        }
        return err;
    };

    //buffer checks when all queries finish
    var bufferCheck_drain = function () {
        'use strict';
        bufferCheck_client.end();

        /**
          veify checks completed successfully and if so
          build the cache.
        **/
        if (buildcacheCheckPass) {
            console.log('PASSED All Tests, building Cache!');
            buildCache(cnt);
        } else {
            console.log('Failed a test!  Cache will not be built! Please see the log for details.');
        }
    };

    /**
      query on row method.
      for building Cache when a row exists named check
      we use that to determine a pass or fail.
      when we encounter any fail we change the Tests state to fail with
      datatestcheck.
    **/
    var bufferCheck_queryRow = function (row, result) {
        'use strict';
        if (row.hasOwnProperty('check')) {
            if (row.check) {
                console.log(this.name + ' PASSED.');
            } else {
                console.log(this.name + ' FAILED.');
                buildcacheCheckPass = false;
            }
        } else {
            return false;
        }
    };

    //when a buffer check query ends
    var bufferCheck_queryEnd = function (result) {
        'use strict';
        return result;
    };

    /*
    ``check the buffers
      runs data tests on buffer layers
      ensures data is okay for buffering and will give good results
      to simplicity
    */
    var bufferCheck = function () {
        'use strict';
        var id;

        //open client and connection for Checking buffers
        bufferCheck_client = new pg.Client(dataBaseConnectionObject);
        bufferCheck_client.on('drain', bufferCheck_drain);
        bufferCheck_client.connect(bufferCheck_clientError);

        //check the buffers
        for (id in buildCheck_Obj) {
            if (buildCheck_Obj.hasOwnProperty(id)) {

                //send the sql statements to check the buffers
                bufferCheck_client.query(buildCheck_Obj[id], bufferCheck_clientError)
                    .on('row', bufferCheck_queryRow)
                    .on('end', bufferCheck_queryEnd);
            }
        }
    };

    //Build Buffer error callback
    var buildBuffer_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Error: %s", err);
        }
        return err;
    };

    var buildBuffer_drain = function () {
        'use strict';
        buildBuffer_client.end();
        bufferCheck();
    };

    /**
      Build Buffer query on row method.
    **/
    var buildBuffer_queryRow = function (row, result) {
        'use strict';
        return;
    };


    //when Buffer query ends
    var buildBuffer_queryEnd = function (result) {
        'use strict';
        return result;
    };

    //generic error callback for client,queries
    var buildBuffer_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Error: %s", err);
        }
        return err;
    };

    /*
      build the buffer layer
      the buffer layer is used to find all the topics near a location or
      address.
    */
    var buildBuffer = function () {
        'use strict';
        var id;

        //open client and connection for Buidling Buffers
        buildBuffer_client = new pg.Client(dataBaseConnectionObject);
        buildBuffer_client.on('drain', buildBuffer_drain);
        buildBuffer_client.connect(buildBuffer_clientError);

        console.log('Building Buffers...');

        //build controls - buffers
        for (id in buildBuffer_Obj) {
            if (buildBuffer_Obj.hasOwnProperty(id)) {
                buildBuffer_client.query(buildBuffer_Obj[id], buildBuffer_clientError)
                    .on('row', buildBuffer_queryRow)
                    .on('end', buildBuffer_queryEnd);
            }
        }
    };


    //generic error callback for client,queries
    var buildCache_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Error: %s", err);
        }
        return err;
    };

    //when all cache buidling queroes end kill the client connection
    var buildCache_Drain = function () {
        'use strict';
        buildCache_client.end();
        return;
    };

    //build cache query row callback
    var buildCache_queryRow = function (row, result) {
        'use strict';
        return row;
    };

    //varrables for buildCache_queryEnd
    var rowcount = 0;
    var startname = '';
    var dot = '';
    var complete = '';

    /**
      query end callvacl for buidling the data cache
      provides feedback about progress and status of build
    **/
    var buildCache_queryEnd = function (result) {
        'use strict';

        //small stall to increase performance on inserts.
        sleep(buildcacheSleep);

        /**
          Capture the first named query for iterating the inserted count
          we will derice the percent complete from this.
        **/
        if (rowcount === 0) {
            startname = this.name;
            rowcount = 1;
        }

        /**
          iterate the count when we return the first query
          this insures that the percent complete is progresses for each
          N inserts into the cache.
        **/
        if (startname === this.name) {

            rowcount += buildcacheIncrement;

            //calculate the percent complete
            complete = ((rowcount / cnt) * 100).toFixed(2);
            dot = '';
            console.log('Processing next ' + buildcacheIncrement + ' locations, ' + complete + '% completed' + dot);
        } else {
            dot = dot + '.';
        }

        //messages for showing progress
        console.log('  ' + this.name + '...' + result.rowCount + ' row(s) returned.  ');
    };

    //build the data cache
    var buildCache = function (cnt) {
        'use strict';
        var i = 0,
            id,
            theDistance,
            theName,
            buildCache_queryConfig;

        //openclient and connection for buidling cache
        buildCache_client = new pg.Client(dataBaseConnectionObject);
        buildCache_client.on('drain', buildCache_Drain);
        buildCache_client.connect(buildCache_clientError);

        /*
          loop count of all locations or addresses
          in groups of N.  N Determined by buildcacheIncrement
        */
        for (i = 0; i < cnt; i += buildcacheIncrement) {
            for (id in buildCache_Obj) {
                if (buildCache_Obj.hasOwnProperty(id)) {

                    buildcacheDistances =  buildCache_Obj[id].values.join();

                    /*
                      check if distance is [0], this indicates
                      that now distances are used.  So we need to handle
                      the passing of parameters a little different
                    */
                    if (parseInt(buildcacheDistances) === 0) {
                        //passes int of 0
                        buildcacheDistances = 0;
                    } else {
                        //passes an array of numerics values
                        buildcacheDistances =  buildCache_Obj[id].values;
                    }

                    theDistance = buildcacheDistances;
                    theName = buildCache_Obj[id].name;

                    //build config for query
                    buildCache_queryConfig = {
                        name: theName,
                        text: buildCache_Obj[id].text,
                        values: [buildcacheIncrement, i, theDistance]
                    };

                    /*
                      send query for building cache in groups of N
                      N is determeined by buildcacheIncrement
                    */
                    buildCache_client.query(buildCache_queryConfig, buildCache_clientError)
                        .on('row', buildCache_queryRow)
                        .on('end', buildCache_queryEnd);
                }
            }
        }
    };

    //run build cache
    buildCacheCount();
}

//sleep function
//short rest to allow for sql insert to complete
//found that this actuall increases the speed of inserts
var sleep = function (milliSeconds) {
    'use strict';
    var startTime = new Date().getTime(); // get the current time

    //Loop till time change in millisecons matches what was passed in
    while (new Date().getTime() < startTime + milliSeconds) {
    }
};

pg.end();
