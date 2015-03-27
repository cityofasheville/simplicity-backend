#Simplicity app - Backend

The simplicity backend powers the [simplicity ui](https://github.com/cityofasheville/simplicity-ui) and [simplicity app](http://cityofasheville.github.io/simplicity-ui)

##What the backend accomplishes.
* Processes data into the format the simplicity ui expects **TODO**.
  * still using old method via create-overlays.sh  and sql files in sql/ directory.
* Verifies correct schema for data **TODO**.
* Compiles spatial queries in advance **TODO**.
* Checks data consistency to ensure simplicity app will work properly.
  * Framework in place
  * Does Nothing
* Runs database maintenance routines i.e. reindex, vacuum, etc .

##Installing
```sh
$ git clone https://github.com/cityofasheville/simplicity-backend.git
$ cd simplicity-backend
$ npm install
```

##Setup

###database connection
```sh
$ cp db-sample.yml config/db.yml
```
**Warning:** naming this file anything but db.yml will push the database configuration including the password to github on a git push.

edit `config/db.yml` and update with your settings.

```sh
$ cp datatests-sample.yml config/db.yml
```

#####example database configuration
of course change to match your postgres settings.
```yaml
host: 192.162.0.1
database: postgres
user: postgres
password: postgres
```

####maintenance configuration
```sh
$ cp maintenance-sample.yml config/maintenance.yml
```

edit `config/maintenance.yml` and update with your settings.

#####example maintenance configuration
```yaml
sql:
- name: reindex postgres.table1
  text: REINDEX TABLE postgres.table1;
  values:
- name: VACUUM postgres.table1
  text: VACUUM ANALYZE postgres.table1;
  values:
```

####Data Tests Configuration
```sh
$ cp datatests-sample.yml config/datatests.yml
```

edit `config/maintenance.yml` and update with your settings.

###*Rule:*!  
* The SQL statement must have one field that returns a boolean named exactly "check".
* The SQL statement must return one row.

#####Example Data Tests Configuration
```yaml
sql:
- name: count table1
  text: SELECT count(*) > $1 as check FROM postgres.table1;
  values: [1000000]
- name: count table2
  text: SELECT count(*) = $1 as check FROM postgres.table2;
  values: [12345]
```

##Running
```

Usage: simplicity-backend [options]

 Options:

   -h, --help                 output usage information
   -V, --version              output the version number
   -d, --databaseconn <file>  PostGres database connection file <file> default is config/db.yml
   -m, --maintenance <file>   maintenance configuration file <file>
   -t, --datatest <file>      data test configuration file <file>
```
running:

```sh
$ node simplicity-backend.js -d config/db.yml -t config/datatests.yml
```

returns:

```
count table1 FAILED.
count table2 PASSED.
```

##Software
* PostGres 9.2
  * PG extentions PostGIS 2
  * PG extentions fuzzystrmatch
  * PG extentions hstore
  * PG extentions pg_trgm
  * PG extentions plpgsql
  * PG extentions postgis_topology
* ArcGIS Server 10.2.2
  * ArcGIS SDE - for use in ArcGIS Server only
  * ESRI based Geocoders
* Node.js
  * "pg": "~4.3.0"
  * "yamljs": "~0.2.1"
  * "nodemailer": "~1.3.2"
  * "pg-cursor": "~1.0.0"
  * "commander": "~2.7.1"

##License

The MIT License (MIT)

Copyright (c) 2015

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
