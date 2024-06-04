
# HTTP NestJS Application for BoostaB2B - Authentication
## Description

This repository holds all the logic for the auth services of all users.

The service communicates with other services using the event queue, rabbitmq.


## Installation

```bash
$ npm install
```

## Running the app 
You can run the app as a standalone and configure the .env to connect to the right systems and dependencies. You can use docker to spin up these dependencies separately, check the Docker section below.

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Docker

```bash
# The first and most important script to run if you will using docker 
make create-network
```

```bash
# Erase all data of the database and start all over again
# Be careful, this will also remove the dist folder
make refresh-db
```

### Use these to spin up and manage database, rabbitmq and pgadmin containers
This will then allow you to run the node app with npm run without worrying about 
creating databases, pg admin, rabbitmq or installing their dependencies

### Your Laptop
```bash
# Starts the database, rabbitmq and the pgadmin containers
make start-local
```

```bash
# Stops the database, rabbitmq and the pgadmin containers
make stop-local
```

### Local Environment (> your laptop locally < staging)
```bash
# Builds the whole app with db, rabbitmq and pgadmin but for local environment
make build-locally
```

```bash
# Stops the whole app in local environment
make stop-locally
```

```bash
# Kills the whole app in local environment
make kill-locally
```

```bash
# Runs the whole app in local environment
make run-locally
```

```bash
# Follow the logs of the node app
make follow-logs
```