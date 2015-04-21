#Database Configuration
[Back to main](readme.md)

###database connection
```sh
$ cp config/db_sample.yml config/db.yml
```
**Warning:** naming this file anything but db.yml will push the database configuration including the password to github on a git push.

edit `config/db.yml` and update with your settings.

```sh
$ cp datatests_sample.yml config/db.yml
```

#####example database configuration
of course change to match your postgres settings.
```yaml
host: 192.162.0.1
database: postgres
user: postgres
password: postgres
```
