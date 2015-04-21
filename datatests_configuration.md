#Data Tests Configuration
[Back to main](readme.md)

####Data Tests Configuration
```sh
$ cp datatests-sample.yml config/datatests.yml
```

edit `config/maintenance.yml` and update with your settings.

###*Rule:*  
* The SQL statement must have one field that returns a boolean named exactly "check".
* The SQL statement must return one row.

#####Example Data Tests Configuration
```yaml
testname: test name
onsuccess:
- name: Truncate Table1
  text: TRUNCATE TABLE table1;
  values:
- name: Insert into table1
  text: INSERT INTO table1 (SELECT * FROM table1_stagging);
  values:
tests:
- name: count table1
  text: SELECT count(*) > $1 as check FROM table1;
  values: [1000000]
- name: type table1
  text: SELECT DISTINCT COUNT(type) OVER() > $1 as check FROM table1 GROUP BY type HAVING COUNT(type) > 0 ;
  values: [5]
```

####running:

```sh
$ node simplicity-backend.js -d config/db.yml -t config/datatests.yml
```

####returns:

```
Running Test(s) for  test name

    Starting: count table1
    Completed: count table1
    PASSED

    Starting: type table1
    Completed: type table1
    PASSED

    Starting: location type
    Completed: location type
    PASSED

Tests Complete.
PASSED all tests for: test name

Running Data Push for test name

    Starting: Truncate Table1
    Completed: Truncate Table1

    Starting: Insert into table1
    Completed: Insert into table1

completed Data Test in 00:00:02.2881
```
