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

//gets duration based on start and end time milliseconds
var msToTime = function (duration) {
    'use strict';
    var milliseconds = duration,
        seconds = parseInt((duration / 1000) % 60),
        minutes = parseInt((duration / ( 1000 * 60)) % 60),
        hours = parseInt((duration / ( 1000 * 60 * 60)) % 24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

var on_queryMessages = function (current, rowcount, arr, secarr) {

    //first pass starting
    if (rowcount === 0) {
        console.log(' ');
        console.log('    Starting: ' + arr[rowcount]);
    }

    //called when completed;
    console.log('    Completed: ' + current.name);
    if (typeof secarr != "undefined") {
        console.log('    ' + secarr[rowcount]);
    }
    console.log(' ');


    rowcount = rowcount + 1;
    //if not last call add starting of next one
    if (rowcount > 0 && rowcount < arr.length) {
        console.log('    Starting: ' + arr[rowcount]);
    }

    return rowcount;

};

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

    var dataTests_queryConfig
    var dataTests_check = true;
    var dataTests_checkRun = false;
    var dataTests_count;

    var dataTests_array = [];
    var dataTests_resultsArray = [];
    var dataTests_rowcount = 0;

    var dataTestsSuccess_queryConfig;

    //varrables for dataTestsSuccess
    var dataTestsSucesss_array = [];
    var dataTestsSuccess_rowcount = 0;

    //generic error callback for client,queries
    var dataTests_connectionError = function (err) {
        'use strict';
        if (err) {
            console.error("Connection Error: %s", err);
        }
        return err;
    };

    //data test drain callback when all maintenace queries finish
    var dataTests_clientDrain = function () {
        'use strict';
        dataTests_client.end();
    };

    //generic error callback for client,queries
    var dataTests_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Client Error: %s", err);
            dataTests_check = false;
        }
        return err;
    };

    //when client ends
    var dataTests_clientEnd = function (result) {
        'use strict';
        console.log('Tests Complete.');

        //all tests completed and one of them failed
        if (!dataTests_check) {

            //something failed
            console.log('FAILED test(s) for: ' + dataTests_YAML.testname + '.');
            console.log('Failed a test!  Cache will not be built! Please see the log for details');

            //time
            endTime = new Date().getTime()
            var aTime = endTime - startTime;
            var  timeMessage = msToTime(aTime);
            console.log('completed in ' + timeMessage);
            console.log(' ');
        }

        //all tests completed and succesfull
        if (dataTests_check && !dataTests_checkRun) {
            console.log('PASSED all tests for: ' + dataTests_YAML.testname + '.');
            dataTestsSuccess();
        }

        return result;
    };


    //generic error callback for client,queries
    var dataTests_queryError = function (err) {
        'use strict';
        if (err) {
            console.error("Query Error: %s", err);
            dataTests_check = false;
        }
        return err;
    };

    /**
      query on row method.
      for data tests when a row exists named check
      we use that to determine a pass or fail.
      when we encounter any fail we change the Tests state to fail with
      dataTests_check.
    **/
    var dataTests_queryRow = function (row, result) {
        'use strict';
        if (row.hasOwnProperty('check')) {
            if (row.check) {
                dataTests_resultsArray.push('PASSED');
            } else {
                dataTests_resultsArray.push('FAILED');
                dataTests_check = false;
            }
        } else {
            return;
        }
    };

    //when query ends
    var dataTests_queryEnd = function (result) {
        'use strict';
        dataTests_rowcount = on_queryMessages(this, dataTests_rowcount, dataTests_array, dataTests_resultsArray);
    };


    //data tests functionå
    var dataTests = function () {
        'use strict';
        var id;

        //open client and connection for Buidling Buffers
        dataTests_client = new pg.Client(dataBaseConnectionObject)
            .on('drain', dataTests_clientDrain)
            .on('error', dataTests_clientError)
            .on('end', dataTests_clientEnd);

        //connect
        dataTests_client.connect(dataTests_connectionError);

        console.log(' ');
        console.log('Running Test(s) for  ' + dataTests_YAML.testname);

        for (id in dataTests_Obj) {
            if (dataTests_Obj.hasOwnProperty(id)) {

                dataTests_queryConfig = dataTests_Obj[id];

                dataTests_array.push(dataTests_queryConfig.name);

                dataTests_client.query(dataTests_queryConfig)
                    .on('error', dataTests_queryError)
                    .on('row', dataTests_queryRow)
                    .on('end', dataTests_queryEnd);
            }
        }
    };

    //data test sucessfull drain callback when all maintenace queries finish
    var dataTestsSuccess_clientDrain = function () {
        'use strict';
        dataTestsSuccess_client.end();
    };

    //generic error callback for client,queries
    var dataTestsSuccess_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Client Error: %s", err);
        }
        return err;
    };

    //generic error callback for client,queries
    var dataTestsSuccess_connectionError = function (err) {
        'use strict';
        if (err) {
            console.error("Connection Error: %s", err);
        }
        return err;
    };

    //when client ends
    var dataTestsSuccess_clientEnd = function (result) {
        'use strict';

        endTime = new Date().getTime()

        var aTime = endTime - startTime;
        var  timeMessage = msToTime(aTime);
        console.log('completed Data Test in ' + timeMessage);
        console.log(' ');

        return result;
    };

    //data tests successful query row callback
    var dataTestsSuccess_queryRow = function (row, result) {
        'use strict';
        return row;
    };

    //generic error callback for client,queries
    var dataTestsSuccess_queryError = function (err) {
        'use strict';
        if (err) {
            console.error("Query Error: %s", err);
        }
        return err;
    };

    //when query ends
    var dataTestsSuccess_queryEnd = function (result) {
        'use strict';
        dataTestsSuccess_rowcount = on_queryMessages(this, dataTestsSuccess_rowcount, dataTestsSucesss_array);
    };

    //data tests success full run these queries
    var dataTestsSuccess = function () {
        'use strict';
        var id;
        var dataTests_successCommands = dataTests_YAML.onsuccess;

        console.log('');
        console.log('Running Data Push for ' + dataTests_YAML.testname);

        //open client and connection for Buidling Buffers
        dataTestsSuccess_client = new pg.Client(dataBaseConnectionObject)
            .on('drain', dataTestsSuccess_clientDrain)
            .on('error', dataTestsSuccess_clientError)
            .on('end', dataTestsSuccess_clientEnd);

        //connect
        dataTestsSuccess_client.connect(dataTestsSuccess_connectionError);


        for (id in dataTests_successCommands) {
            if (dataTests_successCommands.hasOwnProperty(id)) {
                dataTests_checkRun = true;

                dataTestsSuccess_queryConfig = dataTests_successCommands[id];

                dataTestsSucesss_array.push(dataTestsSuccess_queryConfig.name);

                dataTestsSuccess_client.query(dataTestsSuccess_queryConfig)
                    .on('error', dataTestsSuccess_queryError)
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

    //varrables for maintenance_queryEnd
    var maintenance_rowcount = 0;
    var maintenance_array = [];

    //maintence error callback
    var maintenance_connectionError = function (err) {
        'use strict';
        if (err) {
            console.error("Connection Error: %s", err);
        }
        return err;
    };

    //maintence drain callback when all maintenace queries finish
    var maintenance_clientDrain = function () {
        'use strict';
        maintenance_client.end();
    };

    //maintence error callback
    var maintenance_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Client Error: %s", err);
        }
        return err;
    };

    //when client ends
    var maintenance_clientEnd = function (result) {
        'use strict';
        endTime = new Date().getTime()

        var aTime = endTime - startTime;
        var  timeMessage = msToTime(aTime);
        console.log('Completed Maintenance in ' + timeMessage + '.');
        console.log(' ');

        return result;
    };

    //maintence error callback
    var maintenance_queryError = function (err) {
        'use strict';
        if (err) {
            console.error("Query Error: %s", err);
        }
        return err;
    };


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

        maintenance_rowcount = on_queryMessages(this, maintenance_rowcount, maintenance_array);

    };

    /*
      main function for runnong sql based maintenace
    */
    var maintenance = function () {
        'use strict';
        var id;

        console.log(' ');
        console.log('Running Maintenance ');

        //open client and connection for Buidling Buffers
        maintenance_client = new pg.Client(dataBaseConnectionObject)
            .on('drain', maintenance_clientDrain)
            .on('error', maintenance_clientError)
            .on('end', maintenance_clientEnd);

        //connect
        maintenance_client.connect(maintenance_connectionError);

        for (id in maintenance_Obj) {
            if (maintenance_Obj.hasOwnProperty(id)) {

                maintenance_queryConfig = maintenance_Obj[id];

                maintenance_array.push(maintenance_queryConfig.name);

                maintenance_client.query(maintenance_queryConfig)
                    .on('error', maintenance_queryError)
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
    var BuildBuffer_array = [];
    var buildBuffer_rowcount = 0;

    //varrables for buildCache
    var buildCache_rowcount = 0;
    var buildCache_startname = '';
    var buildCache_dot = '';
    var buildCache_complete = '';


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

    //Build Buffer error callback
    var buildBuffer_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Error: %s", err);
        }
        return err;
    };

    var buildBuffer_clientDrain = function () {
        'use strict';
         buildBuffer_client.end();
    };

    //when Buffer query ends
    var buildBuffer_clientEnd = function (result) {
        'use strict';
        console.log('Building Buffers Complete.');
        //bufferCheck();
    };

    /**
      Build Buffer query on row method.
    **/
    var buildBuffer_queryRow = function (row, result) {
        'use strict';
        return row;
    };

    //when Buffer query ends
    var buildBuffer_queryEnd = function (result) {
        'use strict';
        buildBuffer_rowcount = on_queryMessages(this, buildBuffer_rowcount, BuildBuffer_array);
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
            .on('error', buildBuffer_clientError)
            .on('end', buildBuffer_clientEnd);

        //connect
        buildBuffer_client.connect(buildBuffer_connectError);

        console.log('  Building Buffers...');
        buildBuffer_rowcount = 0;
        buildBuffer_count = buildBuffer_Obj.length;

        //build controls - buffers
        for (id in buildBuffer_Obj) {
            if (buildBuffer_Obj.hasOwnProperty(id)) {
                buildBuffer_queryConfig = buildBuffer_Obj[id];

                BuildBuffer_array.push(buildBuffer_queryConfig.name);

                buildBuffer_query = buildBuffer_client.query(buildBuffer_queryConfig)
                    .on('error', buildBuffer_queryError)
                    .on('row', buildBuffer_queryRow)
                    .on('end', buildBuffer_queryEnd);

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
        console.log('completed Build of Cache in ' + timeMessage);
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
        if (buildCache_rowcount === 0) {
            buildCache_startname = this.name;
            buildCache_rowcount = 1;
        }

        /**
          iterate the count when we return the first query
          this insures that the percent complete is progresses for each
          N inserts into the cache.
        **/
        if (buildCache_startname === this.name) {

            if (buildCache_rowcount > 1) {
                console.log('  Processing of ' + buildcacheIncrement + ' locations complete. ' + buildCache_complete + '% completed');
                console.log('');
            }
            buildCache_rowcount += buildcacheIncrement;

            //calculate the percent complete
            buildCache_complete = ((buildCache_rowcount / cnt) * 100).toFixed(2);
            buildCache_dot = '';
            if (buildCache_rowcount < 2) {
                console.log('  Processing of first ' + buildcacheIncrement + ' locations.');
            } else {
                console.log('  Processing of next ' + buildcacheIncrement + ' locations.');
            }
        } else {
          buildCache_dot = buildCache_dot + '.';
        }

        //messages for showing progress
        console.log('    ' + this.name + '...' + result.rowCount + ' row(s) returned.');

    };

    //build the data cache
    var buildCache = function (cnt) {
        'use strict';
        buildCache_rowcount = 0;
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
