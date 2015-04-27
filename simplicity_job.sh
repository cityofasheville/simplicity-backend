date=`date +%d-%m-%Y`
export date=`date +%d-%m-%Y`

node simplicity-backend.js -d config/db.yml -m config/maintenance.yml >> log/maintenance_$date.log
node simplicity-backend.js -d config/db.yml -c config/buildcache.yml >> log/buildcache_$date.log
node simplicity-backend.js -d config/db.yml -m config/maintenance_afterbuild.yml >> log/maintenance_$date.log
node simplicity-backend.js -d config/db.yml -t config/datatests_all.yml>> log/datatest_$date.log


#remove files over a week old.
find /home/ubuntu/simplicity-backend/log/*.log -mtime +14  -exec rm {} \;

#this will only work with s3cmd setup and working.
#change the apporpiate s3 bucket
/usr/bin/s3cmd put /home/ubuntu/simplicity-backend/log/*_$date.log s3://simplicity-backups/logs/
