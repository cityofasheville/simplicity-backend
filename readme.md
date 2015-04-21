#Simplicity app - Backend

The simplicity backend powers the [simplicity ui](https://github.com/cityofasheville/simplicity-ui) and [simplicity app](http://cityofasheville.github.io/simplicity-ui)

##What the backend accomplishes.
* Processes data into the format the simplicity ui expects..
* Verifies correct schema for data **TODO**.
* Completes spatial queries in advance.
* Checks data consistency to ensure simplicity app will work properly.
  * Framework in place.
  * Will not push data from hold tables to production tables until data checks PASS
* Runs database maintenance routines i.e. reindex, vacuum, etc .
  * Framework in place

##Installing
```sh
$ git clone https://github.com/cityofasheville/simplicity-backend.git
$ cd simplicity-backend
$ npm install
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
   -c, --buildcache <file>    data test configuration file <file>
```

##Setup

####Database Connection Setup & Configuration
[Database Base Configuration](database_configuration.md)

####Maintenance Setup & Configuration
[Maintenance Configuration](Maintenance_configuration.md)

####Data Tests Setup & Configuration
[Data Tests Configuration](datatests_configuration.md)


####Build Data Cache Setup & Configuration
[Build Data Cache Configuration](buildcache_configuration.md)

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
