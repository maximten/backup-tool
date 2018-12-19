# Backup automation tool

## Usage
```
Usage: node index.js

Options:
  --help, -h        Show help                                          [boolean]
  --version, -v     Show version number                                [boolean]
  --file, -f        Specify config file  [string] [default: "backup-config.yml"]
  --sequential, -s  Turn on sequential order of execution [boolean] [default: false]
```
## Config file example
```
version: "0.0.1"
cron: "0 07 * * 1,3,5"
targets:
  dir1:
    type: "directory"
    src: "./foo" 
    dest: "./backups/foo"
    filename: "dir1_${datetime}.tar.gz"
    datetimeFormat: "ddd"
  dir2: 
    type: "directory"
    src: "/absolute/path/bar" 
    dest: "/absolute/path/backups/bar"
    filename: "dir2_${datetime}.tar.gz"
    datetimeFormat: "ddd"
  dir3: 
    type: "directory"
    src: "user@remote_host:/path/" 
    dest: "../backups/remote"
    filename: "dir3_${datetime}.tar.gz"
    datetimeFormat: "ddd"
    ssh: 
      port: 22
      password: "secret"
      privateKeyPath: "/home/user/.ssh/id_rsa"
  db1: 
    type: "mysql"
    dest: "../backups/db/db1/"
    host: "127.0.0.1" 
    mysql:
      port: 3306
      user: "root" 
      password: "root" 
      database: "default"  
    filename: "db1_${datetime}.sql"
    datetimeFormat: "ddd"
  db2: 
    type: "mysql"
    dest: "../backups/db/db2/"
    host: "user@remote_host" 
    ssh: 
      port: 22
      privateKeyPath: "/home/user/.ssh/id_rsa"
    mysql:
      port: 3306 
      user: "root" 
      password: "password" 
      database: "db2" 
    filename: "db2_${datetime}.sql"
    datetimeFormat: "ddd"
```