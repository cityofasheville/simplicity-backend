#Build Data Cache Configuration
[Back to main](../readme.md)

####Build Cache Configuration
```sh
$ cp config/buildcache_sample.yml config/buildcache.yml
```

edit `config/buildcache.yml` and update with your settings.

*Assumes there is a view that takes care of buffers with all the distances already*

In this sample 2264 is the projection of NC State Plane.  Adjust the the Projection code to match your projection code.

#####Sample view DDL
```sql
CREATE OR REPLACE VIEW postgres.locations_view_hold  AS
 	SELECT
 	  st_transform(ST_Buffer(st_transform(shape, 2264),1320),4326)::geometry shape,
 	  1320::numeric(10,4) as distance,
 	  objectid,
 	  locationid
 	FROM postgres.locations_table1_hold
       UNION
	SELECT
	  st_transform(ST_Buffer(st_transform(shape, 2264),660),4326)::geometry shape,
	  660::numeric(10,4) as distance,
	  objectid,
    locationid
	FROM postgres.locations_table1_hold
      UNION
	SELECT
	  st_transform(ST_Buffer(st_transform(shape, 2264),330),4326)::geometry shape,
	  330::numeric(10,4) as distance,
	  objectid,
    locationid
	FROM postgres.locations_table1_hold
      UNION
	SELECT
	  st_transform(ST_Buffer(st_transform(shape, 2264),165),4326)::geometry shape,
	  165::numeric(10,4) as distance,
	  objectid,
    locationid
	FROM postgres.locations_table1_hold
      UNION
	SELECT
	  st_transform(ST_Buffer(st_transform(shape, 2264),82.5),4326)::geometry shape,
	  82.5::numeric(10,4) as distance,
	  objectid,
    locationid
	FROM postgres.locations_table1_hold;
```

#####Example Build Cache Configuration
count - counts the number of locations or addresses in the location table

####*Buffer Count Rules:*  
* The SQL statement must have two fields.
  * One that returns a boolean named exactly "check"..
  * One that reuturns an integer named exaclty "count".
* The SQL statement must return one row.

increment - number of locationids to process at a time.  With limited testing an increment of 100 to seems to have results

sleep - in some cases depending on server resources I have seen the process time actually improve by increaseing this. around 1 - 3 seconds seems to work best.  the number is milliseconds. So 1 second is 1000.

buffer - this is used to create the buffer layer.  Data will process once this section is complete

buffercheck - quick check to make sure buffer data is valid and was created successfully. Data will not process until checks are passed.

####*Buffer Check Rule:*  
* The SQL statement must have one field that returns a boolean named exactly "check".
* The SQL statement must return one row

buildcache - SQL statments to collect data for each buffer.  Needs distances in values to create entries for each distance.  The distances must exist in the buffer layer.  **Note:** in the section buildcache a [0] in the values for the indicates no buffers used.

```yaml
increment: 100
sleep: 0
count:
- name: count
  text: SELECT count(*) > $1 as check, count(*)  as count FROM postgres.locations_table1_hold;
  values:
control:
- name: truncate buffers
  text: TRUNCATE table postgres.locations_buffers_cache_hold;
  values:
- name: create buffers
  text: INSERT INTO postgres.locations_buffers_cache_hold (SELECT (row_number() OVER (ORDER BY (SHAPE)))::integer as objectid, distance, locationid, shape FROM postgres.postgres ORDER BY distance DESC);
  values:
- name: vaucum buffers
  text: VACUUM ANALYZE postgres.locations_buffers_cache_hold
  values:
- name: reindex buffers
  text: REINDEX TABLE postgres.locations_buffers_cache_hold;
  values:
- name: clear cache
  text: TRUNCATE TABLE postgres.data_cache_hold;
  values:
- name: Resequence Cache HOLD
  text: ALTER SEQUENCE postgres.data_cache_hold_objectid_seq RESTART WITH 1;;
  values:
- name: ReIndex City Limits Shapes
  text: REINDEX INDEX postgres.city_limits_hold_shape;
  values:
- name: ReIndex Crime Shapes
  text: REINDEX INDEX postgres.crime_hold_shape;
  values:
- name: ReIndex Permit Shapes
  text: REINDEX INDEX postgres.permits_hold_shape;
  values:
- name: vaucum cache
  text: VACUUM ANALYZE postgres.data_cache_hold;
  values:
buffercheck:
- name: check buffers
  text: select now();
  values:
- name:  count distances
  text: select now():
  values:
buildcache:
- name: Crime
  text: INSERT INTO postgres.locations_buffers_cache_hold (SELECT DISTINCT avw.locationid, 'CRIME'::varchar(150) as type, avw.distance as distance, (SELECT string_agg(tp,',')::text FROM (SELECT b.crimeid::text as tp FROM postgres.crime_hold_shape b WHERE st_contains(avw.shape,b.shape )) as hold)::text as data,''::text datajson FROM postgres.locations_buffers_cache_hold AS avw LEFT JOIN postgres.locations_buffers_cache_hold buf ON buf.locationid = avw.locationid LEFT JOIN postgres.crime_hold_shape addr ON addr.locationid = buf.locationid WHERE avw.distance = ANY($3::numeric[]) and avw.locationid in (select locationid from postgres.crime_hold_shape order by locationid limit $1 offset $2))
  values: [82.5000,660.0000,1320.0000,330.0000,65.0000]
- name: Permits
  text: INSERT INTO postgres.locations_buffers_cache_hold (SELECT DISTINCT avw.locationid,'PERMITS'::varchar(150) as type, avw.distance as distance, (SELECT string_agg(tp,',')::text FROM (SELECT DISTINCT b.apn::text as tp FROM postgres.permits_hold b WHERE st_contains(avw.shape,b.shape) ) as hold)::text as data, ''::text datajson FROM postgres.locations_buffers_cache_hold AS avw LEFT JOIN postgres.locations_buffers_cache_hold buf ON buf.locationid = avw.locationid LEFT JOIN postgres.crime_hold_shape addr ON addr.locationid = buf.locationid WHERE avw.distance = ANY($3::numeric[]) and avw.locationid in (select locationid from postgres.crime_hold_shape order by locationid limit $1 offset $2))
  values: [82.5000,660.0000,1320.0000,330.0000,65.0000]
- name: Address In City
  text: INSERT INTO postgres.locations_buffers_cache_hold (SELECT DISTINCT civx.locationid, 'ADDRESS IN CITY'::varchar(150) as type,$3::numeric(38,8) as distance,CASE WHEN (SELECT string_agg(tp,',')::text FROM (SELECT b.jurisdiction_type::text as tp FROM postgres.city_limits_hold_shape b WHERE st_intersects(addr.shape,b.shape))  as hold)::varchar(255) like '%Asheville Corporate Limits%' THEN 'YES' ELSE 'NO' END as data FROM postgres.property_hold as a LEFT JOIN postgres.pinnum_centerline_xref_view_hold civx ON civx.pinnum = a.pinnum LEFT JOIN postgres.locations_table1_hold addr ON addr.locationid = civx.locationid WHERE addr.locationid in (select distinct locationid from postgres.locations_table1_hold order by locationid limit $1 offset $2));
  values: [0]
```

####running:

```sh
$ node simplicity-backend.js -d config/db.yml -c config/buildcache.yml
```

####returns:

```
Starting Building Data Cache.

  Testing addresses.

    Starting: Count Address
    Completed: Count Address
    PASSED

    PASSED all tests for: Count Address.

  Testing addresses Complete.
  Building Buffers...

    Starting: ReIndex Zoning Overlays Shapes
    Completed: ReIndex Zoning Overlays Shapes

    Starting: Create View
    Completed: Create View

    Starting: truncate buffers
    Completed: truncate buffers

    Starting: create buffers
    Completed: create buffers

    Starting: vacuum buffers
    Completed: vacuum buffers

    Starting: vaucum cache
    Completed: vaucum cache

  Building Buffers Complete.
  Testing Buffer Data.

    Starting: check buffers
    Completed: check buffers
    PASSED

    Starting: count distances
    Completed: count distances
    PASSED

    PASSED all tests for: vaucum cache.

  Testing Buffers Complete.
  Building Cache...

      Batch Processing First 100 Locations....

    Starting: Crime
    Completed: Crime
    Processed: 400 row(s) in Crime.


    Starting: Permits
    Completed: Permits
    Processed: 400 row(s) in Permits.


    Starting: Address In City
    Completed: Address In City
    Processed: 93 row(s) in Address In City.


    Starting: Zoning
    Completed: Zoning
    Processed: 93 row(s) in Zoning.


    Starting: Zoning Overlays
    Completed: Zoning Overlays
    Processed: 93 row(s) in Zoning Overlays.


    Starting: Trash Day
    Completed: Trash Day
    Processed: 93 row(s) in Trash Day.


    Starting: Recycle Day
    Completed: Recycle Day
    Processed: 93 row(s) in Recycle Day.


    Starting: Remove Blanks
    Completed: Remove Blanks
    Processed: 1961 row(s) in Remove Blanks.


    Starting: Crime
    Completed: Crime
    Processed: 400 row(s) in Crime.

      Finished Batch Processing 100 Locations.
      Batch Processing Next 100 Locations.
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
