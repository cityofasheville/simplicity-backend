#Process data for our new simplicity app

##generates data structure for simplicty app
This process data and creates a data cache so all spatial queries are completed in advance. 

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

##Requires 
* that the database exists and scehma is in place
* Place all scripts in directory /home/ubuntu/job or change in cron job
* postgresql/postgis installed 
* Some external process to push source data into stagging tables

##To Do
- [ ] Add Schema Create Scripts 
- [ ] Add ETL transfers (maybe OGR)
- [ ] Data Integrity Tests
- [ ] Add enviroment creation scripts
- [ ] Add cron job creation script
- [ ] Add automated path to scripts and bins 
- [ ] Change data cache table [coa_overlay_data_cache] and comma delimited field [data] hash [datajason]?
- [ ] Add install scripts or vagrantfile


###cron job add 
/bin/bash /home/ubuntu/job/create-overlays.sh >  /home/ubuntu/job/overlays.log &
