var yaml = require('yamljs');
var pg = require('pg');
var Cursor = require('pg-cursor');

// Load yaml file using YAML.load
// do not change the name of database connection file db.yml
// or it will be pushed to gitHub :-(
var dbObj = yaml.load('config/db.yml');

var dataTests = yaml.load('config/dataTests.yml');
var dataTestsObj = dataTests.sql;

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
    console.log(row);
};

var queryEnd = function (result) {
    'use strict';
    console.log(result.rowCount + ' rows were received');
};

client = new pg.Client(dbObj);
client.on('drain', client.end.bind(client));
client.connect(clientError);

for (sql in maintenanceObj) {
    if (maintenanceObj.hasOwnProperty(sql)) {
        queryConfig = maintenanceObj[sql];
        query = client.query(queryConfig, clientError)
            .on('row', queryRow)
            .on('end', queryEnd);
          }
}

pg.end();
