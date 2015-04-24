var yaml = require('yamljs');
var pg = require('pg');
var program = require('commander');
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
        minutes = parseInt((duration / (1000 * 60)) % 60),
        hours = parseInt((duration / (1000 * 60 * 60)) % 24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
};

var on_queryMessages = function (current, rowcount, arr, secarr) {
    'use strict';

    //first pass starting
    if (rowcount === 0) {
        console.log(' ');
        console.log('    Starting: ' + arr[rowcount]);
    }

    //called when completed;
    console.log('    Completed: ' + current.name);

    if (typeof secarr !== "undefined") {
        console.log('    ' + secarr[rowcount]);
    }
    console.log(' ');

    rowcount = rowcount + 1;
    var percentComplete = ((rowcount / arr.length ) * 100).toFixed(2);
    console.log('    Percent Completed: %' + percentComplete);
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

    //date tests varriables
    var dataTests_queryConfig;
    var dataTests_check = true;
    var dataTests_checkRun = false;
    var dataTests_array = [];
    var dataTests_resultsArray = [];
    var dataTests_rowcount = 0;


    //varrables for dataTestsSuccess
    var dataTestsSuccess_queryConfig;
    var dataTestsSucesss_array = [];
    var dataTestsSuccess_rowcount = 0;

    //generic error callback for client,queries
    var dataTests_connectionError = function (err) {
        'use strict';
        if (err) {
            console.error("Connection Error: %s", err);
            dataTests_check = false;
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
            endTime = new Date().getTime();
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
            dataTests_resultsArray.push('FAILED');
            dataTests_check = false;
        } else {

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
            dataTests_resultsArray.push('FAILED');
            dataTests_check = false;
        }
    };

    //when query ends
    var dataTests_queryEnd = function (result) {
        'use strict';
        if (result.rowCount = 0) {
          dataTests_resultsArray.push('FAILED');
          dataTests_check = false;
        }
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

        endTime = new Date().getTime();

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
        endTime = new Date().getTime();

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
        console.log('Starting the Running of Maintenance job.');

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
    var buildCacheBuffer_Obj = buildcache_YAML.buffer;
    var buildCacheCheck_Obj = buildcache_YAML.buffercheck;

    //clients for each step of building the cache
    var buildCacheCount_client;
    var buildCacheCheck_client;
    var buildCacheBuffer_client;
    var buildCache_client;
    var buildCacheBuffer_query;

    //controling variables
    var buildcacheIncrement = buildcache_YAML.increment;
    var buildcacheSleep = buildcache_YAML.sleep;
    var buildcacheDistances;
    var buildcacheCheckPass = true;

    //varriables for buildCacheCount
    var buildCacheCount_queryConfig;
    var buildCacheCount_array = [];
    var buildCacheCount_resultsArray = [];
    var buildCacheCount_rowcount = 0;
    var buildCacheCount_check = true;
    var buildCacheCount_checkRun = false;

    //varriables for buildCacheBuffer
    var buildCacheBuffer_queryConfig;
    var buildCacheBuffer_array = [];
    var buildCacheBuffer_rowcount = 0;

    //varriables for buildCacheCount
    var buildCacheCheck_queryConfig;
    var buildCacheCheck_array = [];
    var buildCacheCheck_resultsArray = [];
    var buildCacheCheck_rowcount = 0;
    var buildCacheCheck_check = true;
    var buildCacheCheck_checkRun = false;


    //varriables for buildCacheBuffer
    var buildCache_queryConfig;
    var buildCache_array = [];
    var buildCache_resultsArray = [];
    var buildCache_rowcount = 0;
    var buildcacheIncrement_Count = 0;

    //varrables for buildCache
    var buildCache_startname = '';
    var buildCache_complete = '';

    var buildCache_locationCount = 0;

    //Cache Count error callback
    var  buildCacheCount_connectionError = function (err) {
        'use strict';
        if (err) {
            console.error("Connection Error: %s", err);
        }
        return err;
    };


    //Cache Count error callback
    var  buildCacheCount_queryError = function (err) {
        'use strict';
        if (err) {
            console.error("Query Error: %s", err);
        }
        return err;
    };

    //when all cache buildCacheCount queries end kill the client connection
    var buildCacheCount_clientDrain = function () {
        'use strict';
        buildCacheCount_client.end();
        return;
    };

    //Cache Count error callback
    var  buildCacheCount_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Client Error: %s", err);
        }
        return err;
    };

    //when client ends
    var buildCacheCount_clientEnd = function (result) {
        'use strict';

        //console.log(' Address Count Test Complete.');

        //all tests completed and one of them failed
        if (!buildCacheCount_check) {

            //something failed
            console.log('    FAILED test(s) for: ' + buildCacheCount_queryConfig.name + '.');
            console.log('    Failed a test!  Cache will not be built! Please see the log for details');

            //time
            endTime = new Date().getTime();
            var aTime = endTime - startTime;
            var  timeMessage = msToTime(aTime);

            console.log(' ');
            console.log('  Testing addresses Complete.');
            console.log('Completed in ' + timeMessage);
            console.log(' ');
        }

        //all tests completed and succesfull
        if (buildCacheCount_check && !buildCacheCount_checkRun) {
            console.log('    PASSED all tests for: ' + buildCacheCount_queryConfig.name + '.');

            console.log('');
            console.log('  Testing addresses Complete.');
            buildCacheBuffer();
        }

        return result;

    };

    /**
      query row callback for buildCacheCount
    **/
    var buildCacheCount_queryRow = function (row, result) {
        'use strict';

        if (row.hasOwnProperty('check')) {
            if (row.check) {
                buildCacheCount_resultsArray.push('PASSED');
                if (row.hasOwnProperty('count')) {
                    buildCache_locationCount = row.count;
                }
            } else {
                buildCacheCount_resultsArray.push('FAILED');
                buildCacheCount_check = false;
            }
        } else {
            return;
        }

    };

    //when query ends
    var buildCacheCount_queryEnd = function (result) {
        'use strict';
        buildCacheCount_rowcount = on_queryMessages(this, buildCacheCount_rowcount, buildCacheCount_array, buildCacheCount_resultsArray);
        return result;
    };

    //should be only one sql statement here so assume [0]
    var buildCacheCount = function () {
        'use strict';

        console.log(' ');
        console.log('Starting Building Data Cache.');

        console.log(' ');
        console.log('  Testing addresses.');

        //open client and connection for Buidling Buffers
        buildCacheCount_client = new pg.Client(dataBaseConnectionObject)
            .on('drain', buildCacheCount_clientDrain)
            .on('error', buildCacheCount_clientError)
            .on('end', buildCacheCount_clientEnd);

        //connect
        buildCacheCount_client.connect(buildCacheCount_connectionError);

        //get count of locations or address
        buildCacheCount_queryConfig = buildCacheCount_Obj[0];

        //add cache array
        buildCacheCount_array.push(buildCacheCount_queryConfig.name);

        /**
          start count of locations
        **/
        buildCacheCount_client.query(buildCacheCount_queryConfig)
            .on('error', buildCacheCount_queryError)
            .on('row', buildCacheCount_queryRow)
            .on('end', buildCacheCount_queryEnd);
    };

    //Build Buffer error callback
    var buildCacheBuffer_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Error: %s", err);
        }
        return err;
    };

    var buildCacheBuffer_clientDrain = function () {
        'use strict';
        buildCacheBuffer_client.end();
    };

    //when Buffer query ends
    var buildCacheBuffer_clientEnd = function (result) {
        'use strict';
        console.log('  Building Buffers Complete.');
        buildCacheCheck();
    };

    /**
      Build Buffer query on row method.
    **/
    var buildCacheBuffer_queryRow = function (row, result) {
        'use strict';
        return row;
    };

    //when Buffer query ends
    var buildCacheBuffer_queryEnd = function (result) {
        'use strict';
        buildCacheBuffer_rowcount = on_queryMessages(this, buildCacheBuffer_rowcount, buildCacheBuffer_array);
    };

    //generic error callback for client,queries
    var buildCacheBuffer_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Client Error: %s", err);
        }
        return err;
    };

    //generic error callback for client,queries
    var buildCacheBuffer_queryError = function (err) {
        'use strict';
        if (err) {
            console.error("Query Error: %s", err);
        }
        return err;
    };

    //generic error callback for client,queries
    var buildCacheBuffer_connectionError = function (err) {
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
    var buildCacheBuffer = function () {
        'use strict';
        var id;

        console.log('  Building Buffers...');

        //open client and connection for Buidling Buffers
        buildCacheBuffer_client = new pg.Client(dataBaseConnectionObject)
            .on('drain', buildCacheBuffer_clientDrain)
            .on('error', buildCacheBuffer_clientError)
            .on('end', buildCacheBuffer_clientEnd);

        //connect
        buildCacheBuffer_client.connect(buildCacheBuffer_connectionError);

        //build controls - buffers
        for (id in buildCacheBuffer_Obj) {
            if (buildCacheBuffer_Obj.hasOwnProperty(id)) {

                buildCacheBuffer_queryConfig = buildCacheBuffer_Obj[id];

                buildCacheBuffer_array.push(buildCacheBuffer_queryConfig.name);

                buildCacheBuffer_client.query(buildCacheBuffer_queryConfig)
                    .on('error', buildCacheBuffer_queryError)
                    .on('row', buildCacheBuffer_queryRow)
                    .on('end', buildCacheBuffer_queryEnd);

            }
        }

    };

    //Buffer check error callback
    var buildCacheCheck_connectionError = function (err) {
        'use strict';
        if (err) {
            console.error("Connection Error: %s", err);
        }
        return err;
    };


    //Buffer check error callback
    var buildCacheCheck_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Client Error: %s", err);
        }
        return err;
    };


    //buffer checks when all queries finish
    var buildCacheCheck_clientDrain = function () {
        'use strict';
        buildCacheCheck_client.end();
    };

    //when client ends
    var buildCacheCheck_clientEnd = function (result) {
        'use strict';

        //all tests completed and one of them failed
        if (!buildCacheCheck_check) {

            //something failed
            console.log('  FAILED test(s) for: ' + buildCacheBuffer_queryConfig.name + '.');
            console.log('  Failed a test!  Cache will not be built! Please see the log for details');

            //time
            endTime = new Date().getTime();
            var aTime = endTime - startTime;
            var  timeMessage = msToTime(aTime);
            console.log('completed in ' + timeMessage);
            console.log(' ');
        }

        //all tests completed and succesfull
        if (buildCacheCheck_check && !buildCacheCheck_checkRun) {
            console.log('    PASSED all tests for: ' + buildCacheBuffer_queryConfig.name + '.');
            console.log('');
            console.log('  Testing Buffers Complete.');
            buildCache();
        }

        return result;
    };

    //Buffer check error callback
    var buildCacheCheck_queryError = function (err) {
        'use strict';
        if (err) {
            console.error("Query Error: %s", err);
        }
        return err;
    };

    /**
      query on row method.
      for building Cache when a row exists named check
      we use that to determine a pass or fail.
      when we encounter any fail we change the Tests state to fail with
      datatestcheck.
    **/
    var buildCacheCheck_queryRow = function (row, result) {
        'use strict';
        if (row.hasOwnProperty('check')) {
            if (row.check) {
                buildCacheCheck_resultsArray.push('PASSED');
            } else {
                buildCacheCheck_resultsArray.push('FAILED');
                buildCacheCheck_check = false;
            }
        } else {
            return;
        }

    };

    //when a buffer check query ends
    var buildCacheCheck_queryEnd = function (result) {
        'use strict';
        buildCacheCheck_rowcount = on_queryMessages(this, buildCacheCheck_rowcount, buildCacheCheck_array, buildCacheCheck_resultsArray);
        return result;
    };

    /*
    ``check the buffers
      runs data tests on buffer layers
      ensures data is okay for buffering and will give good results
      to simplicity
    */
    var buildCacheCheck = function () {
        'use strict';
        var id;

        //console.log('');
        console.log('  Testing Buffer Data.');

        //open client and connection for Buidling Buffers
        buildCacheCheck_client = new pg.Client(dataBaseConnectionObject)
            .on('drain', buildCacheCheck_clientDrain)
            .on('error', buildCacheCheck_clientError)
            .on('end', buildCacheCheck_clientEnd);

        //connect
        buildCacheCheck_client.connect(buildCacheCheck_connectionError);

        //check the buffers
        for (id in buildCacheCheck_Obj) {
            if (buildCacheCheck_Obj.hasOwnProperty(id)) {

                //buffer checks query config
                buildCacheCheck_queryConfig = buildCacheCheck_Obj[id];

                buildCacheCheck_array.push(buildCacheCheck_queryConfig.name);

                //send the sql statements to check the buffers
                buildCacheCheck_client.query(buildCacheCheck_queryConfig)
                    .on('error', buildCacheCheck_queryError)
                    .on('row', buildCacheCheck_queryRow)
                    .on('end', buildCacheCheck_queryEnd);
            }
        }
    };


    //generic error callback for client,queries
    var buildCache_connectionError = function (err) {
        'use strict';
        if (err) {
            console.error("Connection Error: %s", err);
        }
        return err;
    };

    //when all cache buidling queroes end kill the client connection
    var buildCache_clientDrain = function () {
        'use strict';
        buildCache_client.end();
        return;
    };

    //generic error callback for client,queries
    var buildCache_clientError = function (err) {
        'use strict';
        if (err) {
            console.error("Client Error: %s", err);
        }
        return err;
    };

    //when client ends
    var buildCache_clientEnd = function (result) {
        'use strict';
        endTime = new Date().getTime();

        var aTime = endTime - startTime;
        var  timeMessage = msToTime(aTime);
        console.log('  Completed Building Cache');
        console.log(' ');
        console.log('Completed Cache in ' + timeMessage + '.');
        console.log(' ');

        return result;
    };

    //generic error callback for client,queries
    var buildCache_queryError = function (err) {
        'use strict';
        if (err) {
            console.error("Query Error: %s", err);
        }
        return err;
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
        var start_proccess_batch_message = '';
        var end_process_batch_message = '';
        var end_process_layer_message = '';
        var complete_message = '';

        buildCache_complete = ((buildCache_rowcount / buildCache_locationCount) * 100).toFixed(2);

        //small stall to increase performance on inserts.
        sleep(buildcacheSleep);

        /**
          Capture the first named query for iterating the inserted count
          we will derice the percent complete from this.
        **/
        if (buildCache_rowcount === 0) {
            buildCache_startname = this.name;
        }

        end_process_layer_message =  'Processed: ' + result.rowCount + ' row(s) in '  + this.name + '.\n';

        if (buildCache_startname === this.name) {
            if (buildCache_rowcount > 1) {
                buildcacheIncrement_Count += buildcacheIncrement;
                end_process_batch_message   = '\n      Finished Batch Processing ' + buildcacheIncrement + ' Locations.';
            }

            if (buildCache_rowcount > 2) {
                start_proccess_batch_message  = '\n      Batch Processing Next ' + buildcacheIncrement + ' Locations.';
            }
        }

        complete_message = end_process_layer_message + end_process_batch_message + start_proccess_batch_message;
        buildCache_resultsArray.push(complete_message);
        buildCache_rowcount = on_queryMessages(this, buildCache_rowcount, buildCache_array, buildCache_resultsArray);

    };

    //build the data cache
    var buildCache = function () {
        'use strict';

        var i = 0,
            id,
            theDistance,
            theName,
            buildCache_queryConfig;

        console.log('  Building Cache...');
        console.log(' ');
        console.log('      Batch Processing First 100 Locations');

        //open client and connection for Buidling Buffers
        buildCache_client = new pg.Client(dataBaseConnectionObject)
            .on('drain', buildCache_clientDrain)
            .on('error', buildCache_clientError)
            .on('end', buildCache_clientEnd);

        //open connection
        buildCache_client.connect(buildCache_connectionError);

        /*
          loop count of all locations or addresses
          in groups of N.  N Determined by buildcacheIncrement
        */
        for (i = 0; i < buildCache_locationCount; i += buildcacheIncrement) {
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


                    buildCache_array.push(buildCache_queryConfig.name);

                    /*
                      send query for building cache in groups of N
                      N is determeined by buildcacheIncrement
                    */
                    buildCache_client.query(buildCache_queryConfig)
                        .on('error', buildCache_queryError)
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
