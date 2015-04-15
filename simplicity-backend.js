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

var sql;
var client;
var successClient;
var query;
var checkQuery;
var queryConfig = {};

/**
  data tests passed as argument?
  if so run the data testests
  the argiument must be a yaml file
**/
if (program.datatest) {
    var dataTests = yaml.load(program.datatest);
    var dataTestsObj = dataTests.tests;
    var datatestcheck = true;
    var checkrun = false;
}

//maintenance passed as argument?
if (program.maintenance) {
    var maintenance = yaml.load(program.maintenance);
    var maintenanceObj = maintenance.sql;
}

//buildcache data passed as argument?
if (program.buildcache) {
    var buildcacheYAML = yaml.load(program.buildcache);

    //objects
    var buildcacheObj = buildcacheYAML.buildcache;
    var buildcacheCntObj = buildcacheYAML.count;
    var buildcacheCntrlObj = buildcacheYAML.buffer;
    var buildcacheChecksObj = buildcacheYAML.buffercheck;

    //clients for each step of building the cache
    var bufferCheck_client;
    var buildBuffer_client;
    var buildCache_client;

    //controling variables
    var buildcacheIncrement = buildcacheYAML.increment;
    var buildcacheSleep = buildcacheYAML.sleep;
    var buildcacheDistances;
    var buildcacheCheckPass = true;
}

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
    for (id in buildcacheChecksObj) {
        if (buildcacheChecksObj.hasOwnProperty(id)) {

            //send the sql statements to check the buffers
            bufferCheck_client.query(buildcacheChecksObj[id], bufferCheck_clientError)
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

/**
  Build Buffer query on row method.
**/
var buildBuffer_queryRow = function (row, result) {
    'use strict';
    if (row.hasOwnProperty('check')) {
        if (row.check) {
            console.log(this.name + ' PASSED.');
        } else {
            console.log(this.name + ' FAILED.');
            datatestcheck = false;
        }
    } else {
        return;
    }
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
    buildBuffer_client.on('drain', buildBuffer_Drain);
    buildBuffer_client.connect(buildBuffer_clientError);

    console.log('Building Buffers...');

    //build controls - buffers
    for (id in buildcacheCntrlObj) {
        if (buildcacheCntrlObj.hasOwnProperty(id)) {
            buildBuffer_client.query(buildcacheCntrlObj[id], buildBuffer_clientError)
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
      iterate the count when we return the first named query
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
        buildCacheConfig;

    //openclient and connection for buidling cache
    buildCache_client = new pg.Client(dataBaseConnectionObject);
    buildCache_client.on('drain', buildCache_Drain);
    buildCache_client.connect(buildCache_clientError);

    /*
      loop count of all locations or addresses
      in groups of N.  N Determined by buildcacheIncrement
    */
    for (i = 0; i < cnt; i += buildcacheIncrement) {
        for (id in buildcacheObj) {
            if (buildcacheObj.hasOwnProperty(id)) {

                buildcacheDistances =  buildcacheObj[id].values.join();

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
                    buildcacheDistances =  buildcacheObj[id].values;
                }

                theDistance = buildcacheDistances;
                theName = buildcacheObj[id].name;

                //build config for query
                buildCacheConfig = {
                    name: theName,
                    text: buildcacheObj[id].text,
                    values: [buildcacheIncrement, i, theDistance]
                };

                /*
                  send query for building cache in groups of N
                  N is determeined by buildcacheIncrement
                */
                buildCache_client.query(buildCacheConfig, buildCache_clientError)
                    .on('row', buildCache_queryRow)
                    .on('end', buildCache_queryEnd);
            }
        }
    }
};

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

//generic error callback for client,queries
var clientError = function (err) {
    'use strict';
    if (err) {
        console.error("Error: %s", err);
    }
    return err;
};


//when query ends
var queryEnd = function (result) {
    'use strict';
    return result;
};

var successDrain = function () {
    'use strict';
    successClient.end();
};








/**
  query on row method.
  for data tests when a row exists named check
  we use that to determine a pass or fail.
  when we encounter any fail we change the Tests state to fail with
  datatestcheck.
**/
var queryRow = function (row, result) {
    'use strict';
    if (row.hasOwnProperty('check')) {
        if (row.check) {
            console.log(this.name + ' PASSED.');
        } else {
            console.log(this.name + ' FAILED.');
            datatestcheck = false;
        }
    } else {
        return;
    }
};



/**
  On Row event for the Building  data proccesing jobs
**/
var queryBuildRow = function (row, result) {
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



var buildBuffer_Drain = function () {
    'use strict';
    buildBuffer_client.end();
    bufferCheck();
};

/**
    drain for main client.
    when this is a data test this will spawn a new client to
    handle the sql for updateing the production table
**/
var clientDrain = function () {
    'use strict';
    client.end();
    if (program.datatest) {
        if (!checkrun) {
            console.log(dataTests.testname + ' Test Results: ' + datatestcheck);
        }
        if (datatestcheck && !checkrun) {
            console.log(dataTests.testname + ' Test Results: ' + datatestcheck);
            var sqlcommands = dataTests.onsuccess;
            var sql;
            for (sql in sqlcommands) {
                if (sqlcommands.hasOwnProperty(sql)) {
                    successClient = new pg.Client(dataBaseConnectionObject);
                    successClient.on('drain', successDrain);
                    successClient.connect(clientError);
                    //console.log(sqlcommands[sql]);
                    checkrun = true;
                    successClient.query(sqlcommands[sql], clientError)
                        .on('row', queryRow)
                        .on('end', queryEnd);
                }
            }
        }
    }
};






client = new pg.Client(dataBaseConnectionObject);
client.on('drain', clientDrain);
client.connect(clientError);

//build process
if (program.buildcache) {

    //should be only one sql statement here so assume [0]
    queryConfig = buildcacheCntObj[0];
    /**
      start the cache building process
    **/
    query = client.query(queryConfig, clientError)
        .on('row', queryBuildRow)
        .on('end', queryEnd);
}

//data tests
if (program.datatest) {
    for (sql in dataTestsObj) {
        if (dataTestsObj.hasOwnProperty(sql)) {
            queryConfig = dataTestsObj[sql];
            query = client.query(queryConfig, clientError)
                .on('row', queryRow)
                .on('end', queryEnd);
        }
    }
}

//maintenance routines
if (program.maintenance) {
    for (sql in maintenanceObj) {
        if (maintenanceObj.hasOwnProperty(sql)) {
            queryConfig = maintenanceObj[sql];
            query = client.query(queryConfig, clientError)
                .on('row', queryRow)
                .on('end', queryEnd);
        }
    }
}

//time query to ensure end client ends
query = client.query('SELECT NOW()', clientError);
pg.end();
