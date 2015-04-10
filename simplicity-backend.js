var yaml = require('yamljs');
var pg = require('pg');
var Cursor = require('pg-cursor');
var program = require('commander');

//args
program
    .version('0.0.1')
    .usage('[options] ')
    .option('-d, --databaseconn <file>', 'PostGres database connection file <file> default is config/db.yml', String, 'config/db.yml')
    .option('-m, --maintenance <file>', 'maintenance configuration file <file>', String)
    .option('-t, --datatest <file>', 'data test configuration file <file>', String)
    .option('-c, --buildcache <file>', 'data test configuration file <file>', String)
    .parse(process.argv);

// Load yaml file using YAML.load
// do not change the name of database connection file db.yml
// or it will be pushed to gitHub :-(
//may move this as argument 1
var dbObj = yaml.load(program.databaseconn);


//data tests passed as argument?
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
    var buildcacheINC = buildcache.increment;
}

var sql;
var client;
var successClient;
var query;
var checkQuery;
var queryConfig = {};

var clientError = function (err) {
    'use strict';
    if (err) {
        console.error("Error: %s", err);
    }
};

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
        console.log();
    }
};

var queryBuildRow = function (row, result) {
    'use strict';
    if (row.count) {
        var cnt = row.count;
        if (cnt <  1) {
           console.error('Building cache requires results from the count query.');
        }else {
           console.log('total address count: ' + cnt);
           buildCache(cnt);
        }

    }else {
        console.error('Must have a column named count!');
    }
};

var buildCache = function(cnt) {
  successClient = new pg.Client(dbObj);
  successClient.on('drain', successDrain);
  successClient.connect(clientError);
  for (sql in buildcacheObj) {
      if (buildcacheObj.hasOwnProperty(sql)) {
          console.log(buildcacheObj[sql]);
          console.log('break');
          successClient.query(buildcacheObj[sql], clientError)
              .on('row', queryRow)
              .on('end', queryEnd);
      }
  }
}

var queryEnd = function (result) {
    'use strict';
    console.log(this.name + '...' + result.rowCount + ' row(s) returned.');
    //console.log('');
};

var successDrain = function () {
  'use strict';
  successClient.end();
};

//drain for main client.
//when this is a data test this will spawn a new client to
//handle the sql for updateing the production table
var clientDrain = function () {
    'use strict';
    client.end();
    if (program.datatest) {
        if (!checkrun) {
            console.log(dataTests.testname + ' Test Results: ' + datatestcheck);
        }
        if (datatestcheck && !checkrun) {
            console.log(dataTests.testname + ' Test Results: ' + datatestcheck);
            var sqlcommands = dataTests.onsuccess
            for (sql in sqlcommands) {
                if (sqlcommands.hasOwnProperty(sql)) {
                    successClient = new pg.Client(dbObj);
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

//rollback function
var rollback = function (client, done) {
    'use strict';
    client.query('ROLLBACK', clientError);
    client.end();
};

client = new pg.Client(dbObj);
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

//maintenance scripts
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
