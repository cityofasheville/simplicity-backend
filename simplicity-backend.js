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

function msToTime(duration) {
    var milliseconds = duration
       , seconds = parseInt((duration/1000)%60)
       , minutes = parseInt((duration/(1000*60))%60)
       , hours = parseInt((duration/(1000*60*60))%24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

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
    var startTime = new Date().getTime();
    var endTime;

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
        if (!datatestcheck) {
            console.log('FAILED test(s) for: ' + dataTests_YAML.testname + '.');
            console.log('Failed a test!  Cache will not be built! Please see the log for details');
        }

        //all tests completed and succesfull
        if (datatestcheck && !checkrun) {
            console.log('PASSED all tests for: ' + dataTests_YAML.testname + '.');
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
                console.log('  PASSED: ' + this.name);
            } else {
                console.log('  FAILED: ' + this.name);
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
        console.log('Running Test ' + dataTests_YAML.testname);

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

        if (dataTestsSuccess_rowcount === dataTests_YAML.onsuccess.length) {
            endTime = new Date().getTime()

            var aTime = endTime - startTime;
            var  timeMessage = msToTime(aTime);
            console.log('Completd Data test in ' + timeMessage);
            console.log(' ');
        }
    };

    //data tests success full run these queries
    var dataTestsSuccess = function () {
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
    var startTime = new Date().getTime();
    var endTime;

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

            endTime = new Date().getTime()

            var aTime = endTime - startTime;
            var  timeMessage = msToTime(aTime);
            console.log('Completed Maintenance in ' + timeMessage + '.');
            console.log(' ');
        }
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
    var startTime = new Date().getTime();
    var endTime;
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
    var buildBuffer_query;

    //controling variables
    var buildcacheIncrement = buildcache_YAML.increment;
    var buildcacheSleep = buildcache_YAML.sleep;
    var buildcacheDistances;
    var buildcacheCheckPass = true;
    var buildBuffer_queryConfig;
    var buildBuffer_count;
    var BuildBuffer_ar = [];

    //varrables for buildCache_queryEnd
    var rowcount = 0;
    var startname = '';
    var dot = '';
    var complete = '';

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
        console.log('');
        console.log('Checking Addresses');
        //check row count
        if (row.count) {
            cnt = row.count;

            //must have more that one address to work
            if (cnt <  1) {
                console.error('Building a cache requires more than one record in the address table.');
            } else {
                console.log('  Total address count: ' + cnt + ', Looks okay.');
                console.log('Address Check Complete');
                console.log('');
                console.log('Starting to build Buffers.');
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

    var buildBuffer_end = function () {
        'use strict';
        console.log(' ');
        console.log('Completd Buidling of Buffers');

        //rowcount = 99999;
        //BuildBuffer_ar = [];
        buildBuffer_client.end();
        //bufferCheck();
    }

    //Build Buffer error callback
    var buildBuffer_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Error: %s", err);
        }
        return err;
    };

    var buildBuffer_queryDrain = function () {
        'use strict';
         console.log('Query Drain.');
    };

    var buildBuffer_clientDrain = function () {
        'use strict';
         buildBuffer_client.end();
         //buildBuffer_end();
    };

    /**
      Build Buffer query on row method.
    **/
    var buildBuffer_queryRow = function (row, result) {
        'use strict';
        console.log('row.');
        return row;
    };

    //when Buffer query ends
    var buildBuffer_clientEnd = function (result) {
        'use strict';
        console.log('Building Buffers Complete.');
    }

    //when Buffer query ends
    var buildBuffer_queryEnd = function (result) {
        'use strict';
        //console.log('Query End.');
        //console.log('    Build: ' + this.name);
        //console.log('Query End.');


        //if (rowcount === 99999) {
        //  return result;
        //}

        if (rowcount === 0){
          console.log(' ');
          console.log('    Starting: ' + BuildBuffer_ar[rowcount])
      }

        rowcount = rowcount + 1;
        console.log('    Completed: ' + this.name);
        //console.log(' ');

        if (rowcount > 0 && rowcount < BuildBuffer_ar.length-1){
          console.log(' ');
          console.log('    Starting: ' +BuildBuffer_ar[rowcount])
        }
        //return result;
    };

    //generic error callback for client,queries
    var buildBuffer_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Client Error: %s", err);
        }
        return err;
    };

    //generic error callback for client,queries
    var buildBuffer_queryError = function (err) {
        'use strict';
        if (err) {
            console.error("Query Error: %s", err);
        }
        return err;
    };

    //generic error callback for client,queries
    var buildBuffer_connectError = function (err) {
        'use strict';
        if (err) {
            console.error("Connection Error: %s", err);
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
        buildBuffer_client = new pg.Client(dataBaseConnectionObject)
            .on('drain', buildBuffer_clientDrain)
            .on('error',buildBuffer_clientError)
            .on('end',buildBuffer_clientEnd);

        //connect
        buildBuffer_client.connect(buildBuffer_connectError);

        console.log('  Building Buffers...');
        rowcount = 0;
        buildBuffer_count = buildBuffer_Obj.length;

        //build controls - buffers
        for (id in buildBuffer_Obj) {
            if (buildBuffer_Obj.hasOwnProperty(id)) {
                buildBuffer_queryConfig = buildBuffer_Obj[id];

                BuildBuffer_ar.push(buildBuffer_queryConfig.name);

                buildBuffer_query = buildBuffer_client.query(buildBuffer_queryConfig)
                    .on('error',buildBuffer_queryError)
                    .on('row',buildBuffer_queryRow)
                    .on('end',buildBuffer_queryEnd);

            }
        }

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
            console.log('PASSED All Tests, Okay to building Cache!');
            console.log(' ');
            console.log('Starting to Build Cache');
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
                console.log('  ' + this.name + ' PASSED.');
            } else {
                console.log('  ' + this.name + ' FAILED.');
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
        console.log('');
        console.log('Testing Buffer Data.');

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


    //generic error callback for client,queries
    var buildCache_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Error: %s", err);
        }
        return err;
    };

    var buildCache_end = function () {
        endTime = new Date().getTime()
        var aTime = endTime - startTime;
        sleep(1000);
        var  timeMessage = msToTime(aTime);
        console.log('Completd Build of Cache in ' + timeMessage);
    }

    //when all cache buidling queroes end kill the client connection
    var buildCache_Drain = function () {
        'use strict';
        buildCache_client.end();
        buildCache_end();
        return;
    };

    //build cache query row callback
    var buildCache_queryRow = function (row, result) {
        'use strict';
        return row;
    };


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

            if (rowcount > 1) {
                console.log('  Processing of ' + buildcacheIncrement + ' locations complete. ' + complete + '% completed');
                console.log('');
            }
            rowcount += buildcacheIncrement;

            //calculate the percent complete
            complete = ((rowcount / cnt) * 100).toFixed(2);
            dot = '';
            if (rowcount < 2) {
                console.log('  Processing of first ' + buildcacheIncrement + ' locations.');
            } else {
                console.log('  Processing of next ' + buildcacheIncrement + ' locations.');
            }
        } else {
            dot = dot + '.';
        }

        //messages for showing progress
        console.log('    ' + this.name + '...' + result.rowCount + ' row(s) returned.');

    };

    //build the data cache
    var buildCache = function (cnt) {
        'use strict';
        rowcount = 0;
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


pg.end();
