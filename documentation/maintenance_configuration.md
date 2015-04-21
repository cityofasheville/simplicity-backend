#Maintenance Configuration
[Back to main](../readme.md)

####maintenance configuration
```sh
$ cp config/maintenance-sample.yml config/maintenance.yml
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

####running:

```sh
$ node simplicity-backend.js -d config/db.yml -m config/maintenance.yml
```

####returns:

```
Starting the Running of Maintenance job.

    Starting: reindex postgres.table1
    Completed: reindex postgres.table1

    Starting: VACUUM postgres.table1
    Completed: VACUUM postgres.table1

Completed Maintenance in 00:01:14.134227.
```
