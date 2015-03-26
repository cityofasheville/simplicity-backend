var yaml = require('yamljs');
var pg = require('pg');
var Cursor = require('pg-cursor');

// Load yaml file using YAML.load
// do not change the name of database connection file db.yml
// or it will be pushed to gitHub :-(
//may move this as argument 1
var dbObj = yaml.load('config/db.yml');

//pass as argument?
var dataTests = yaml.load('config/dataTests.yml');
var dataTestsObj = dataTests.sql;

//pass as argument?
var maintenance = yaml.load('config/maintenance.yml');
var maintenanceObj = maintenance.sql;

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
    if (row.hasOwnProperty('check')) {
        if (row.check) {
            console.log(this.name + ' PASSED.');
        } else {
            console.log(this.name + ' FAILED.');
        }

    }


};

var queryEnd = function (result) {
    'use strict';
    //console.log(this.name + '...' + result.rowCount + ' row(s) returned.');
    console.log('');
};

client = new pg.Client(dbObj);
client.on('drain', client.end.bind(client));
client.connect(clientError);

// for (sql in maintenanceObj) {
//     if (maintenanceObj.hasOwnProperty(sql)) {
//         queryConfig = maintenanceObj[sql];
//         query = client.query(queryConfig, clientError)
//             .on('row', queryRow)
//             .on('end', queryEnd);
//           }
// }

for (sql in dataTestsObj) {
    if (dataTestsObj.hasOwnProperty(sql)) {
        queryConfig = dataTestsObj[sql];
        query = client.query(queryConfig, clientError)
            .on('row', queryRow)
            .on('end', queryEnd);
    }
}

pg.end();
