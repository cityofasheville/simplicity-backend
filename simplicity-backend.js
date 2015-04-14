var yaml = require('yamljs');
var pg = require('pg');
var Cursor = require('pg-cursor');
var program = require('commander');
var cnt = 0;
pg.defaults.poolsize = 25;

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
    var buildcache = yaml.load(program.buildcache);
    var buildcacheObj = buildcache.sql;
    var buildcacheCntObj = buildcache.count;
    var buildcacheCntrlObj = buildcache.control;
    var buildcacheINC = buildcache.increment;
    var buildcacheSleep = buildcache.sleep;
    var buildcacheDistances = buildcache.distances;
    var buildcacheChecksObj = buildcache.controlcheck;
    var checkpass = true;
}

//sleep function
//short rest to allow for sql insert to complete
//found that this actuall increases the speed of inserts
var sleep = function (milliSeconds) {
    'use strict';
    var startTime = new Date().getTime(); // get the current time
    while (new Date().getTime() < startTime + milliSeconds) {
    }
};

var sql;
var client;
var successClient;
var query;
var checkQuery;
var queryConfig = {};

//generic error callback for client,queryies
var clientError = function (err) {
    'use strict';
    if (err) {
        console.error("Error: %s", err);
    }
};


var scCE = function (err) {
    'use strict';
    if (err) {
        console.error("Error: %s", err);
    }
};

//when query ends
var queryEnd = function (result) {
    'use strict';
};

var successDrain = function () {
    'use strict';
    successClient.end();
};


var sd = function () {
    'use strict';
    successClientc.end();
};


var scqr = function (row, result) {
    'use strict';
};

var rowcount = 0;
var startname = '';
var dot = '';
var complete = '';
/**
  query for buidling the data cache ends
**/
var scend = function (result) {
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
    if (startname === this.name){

        rowcount += buildcacheINC;
        //calculate the percent complete
        complete = ((rowcount/cnt) * 100).toFixed(2);
        dot = '';
        console.log('Processing next ' + buildcacheINC + ' locations, ' + complete + '% completed' + dot);
    } else {
        dot = dot + '.';
    }



    //messages for showing progress
    console.log('  ' + this.name + '...' + result.rowCount + ' row(s) returned.  ' );
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
        //console.log();
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

var BufferDrain = function () {
    'use strict';
    sc.end();
    buildCache(cnt);
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
                    console.log(sqlcommands[sql]);
                    checkrun = true;
                    successClient.query(sqlcommands[sql], clientError)
                        .on('row', queryRow)
                        .on('end', queryEnd);
                }
            }
        }
    }
};


var checkControl = function () {
    'use strict';
    successClient = new pg.Client(dataBaseConnectionObject);
    successClient.on('drain', successDrain);
    successClient.connect(clientError);
    //build controls - buffers
    var sql;
    for (sql in buildcacheChecksObj) {
        if (buildcacheChecksObj.hasOwnProperty(sql)) {
            console.log('***check***');
            console.log(buildcacheChecksObj[sql]);
            console.log('***');
            successClient.query('select now();', clientError)
                .on('row', queryRow)
                .on('end', queryEnd);
        }
    }
};

var sc;
var buildBuffer = function () {
    'use strict';
    sc = new pg.Client(dataBaseConnectionObject);
    sc.on('drain', BufferDrain);
    sc.connect(clientError);
    //build controls - buffers
    for (sql in buildcacheCntrlObj) {
        //sc.query(buildcacheCntrlObj[sql], scCE)
        sc.query('SELECT NOW();', scCE)
            .on('row', queryRow)
            .on('end', queryEnd);
    }
};

var successClientc;
//build the data cache
var buildCache = function (cnt) {
    'use strict';

    successClientc = new pg.Client(dataBaseConnectionObject);
    successClientc.on('drain', sd);
    successClientc.connect(clientError);
    var i = 0;
    var sqlbc;
    var dist;
    var theDist;
    var theName;
    var bcConfig;

    for (i = 0; i < cnt; i += buildcacheINC) {
        //console.log('break-' + i);
        //sleep(buildcacheSleep);

        for (sqlbc in buildcacheObj) {
            if (buildcacheObj.hasOwnProperty(sqlbc)) {
                //console.log(buildcacheDistances)

                buildcacheDistances =  buildcacheObj[sqlbc].distances.join();
                if ( parseInt(buildcacheDistances) === 0 )  {
                    buildcacheDistances = 0;
                } else {
                  buildcacheDistances =  buildcacheObj[sqlbc].distances;
                }

                        theDist = buildcacheDistances;
                        theName = buildcacheObj[sqlbc].name;
                        //console.log(buildcacheDistances[dist]);
                        //console.log(buildcacheObj[sqlbc].text);
                        bcConfig = {
                                      acount: cnt,
                                      ai: i,
                                      name: theName ,
                                      text: buildcacheObj[sqlbc].text,
                                      values: [buildcacheINC,i,theDist]
                                    };
                        //console.log(bcConfig);
                        successClientc.query(bcConfig, clientError)
                           .on('row', scqr)
                           .on('end', scend);
                    //}
                //}
            }
        }
    }
};


//rollback function
var rollback = function (client, done) {
    'use strict';
    client.query('ROLLBACK', clientError);
    client.end();
};

client = new pg.Client(dataBaseConnectionObject);
client.on('drain', clientDrain);
client.connect(clientError);

//build process
if (program.buildcache) {
    queryConfig = buildcacheCntObj[0];
    console.log(queryConfig);
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
