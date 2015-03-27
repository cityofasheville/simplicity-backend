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
    .parse(process.argv);

// Load yaml file using YAML.load
// do not change the name of database connection file db.yml
// or it will be pushed to gitHub :-(
//may move this as argument 1
var dbObj = yaml.load(program.databaseconn);

//pass as argument?
if (program.datatest) {
    var dataTests = yaml.load(program.datatest);
    var dataTestsObj = dataTests.test;
    var datatestcheck = true;
}
//pass as argument?
if (program.maintenance) {
    var maintenance = yaml.load(program.maintenance);
    var maintenanceObj = maintenance.sql;
}
var sql;
var client;
var query;
var queryConfig = {};

var clientError = function (err) {
    'use strict';
    if (err) {
        console.error("Error: %s", err);
    }
};

var queryRow = function (row, result) {
    'use strict';
    if (dataTests.testname) {
        console.log(dataTests.testname);
        console.log(dataTests.staggingTable);
        console.log(dataTests.productionTable);
    }
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

var queryEnd = function (result) {
    'use strict';
    //console.log(this.name + '...' + result.rowCount + ' row(s) returned.');
    //console.log('');
};

var clientDrain = function () {
    'use strict';
    console.log(datatestcheck);
    client.end();
};

client = new pg.Client(dbObj);
client.on('drain', clientDrain);
client.connect(clientError);

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
