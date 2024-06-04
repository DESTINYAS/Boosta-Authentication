# Running Boosta Backend HTTP API

This documentation will explain in detail how each components of the API connects to each other and how you can deploy or connect to database from you local machine. It is not an extensive guide or how-to document on how to either write your code or use some tools. Google can be of help if you need more in-depth knowledge of how to use these tools, but I will not hesitate to list or suggests such tools that can be used

_____
_____

## Tools
1. Linux
2. Docker
3. Makefile
4. PgAdmin
5. RabbitMQ
6. PostGres Database
7. Messaging Platform (Termii)
8. S3 Bucket (MinIO)

_____
_____

## Required (Expected) Knowledge
1. How to SSH into a server
2. How to port forward a port to a server
3. How to run docker and docker compose.
4. How to configure Nginx

_____
_____

## How many services do we have?
It was agreed that the API be built in a micro-service fashion. Hence there are five services currently being served.

1. Auth Service
2. Onboarding Service
3. Store Service
4. Messaging (SMS) Service
5. Loan Service

_____
_____

## How do you run each service

### Docker Compose File
The docker compose file in the auth service contains important variables that each service needs to run in any environment it is deployed to.
If you will be using the docker approach, you need to create a network with the command `docker network create boosta-network`. For short you can run `make create-network` in the root of the project. If you run into issues running this command search how to use makefile in either windows, linux or mac. Each service's docker-compose files can be found in `docker/compose-files/`

#### - Nginx
____
Each service will have an nginx server that it uses to routes requests into the application. The configuration for this proxy server is located in side `nginx/nginx.dev.conf` in each service's folder.

In the nginx configuration, you can configure the limit of file upload using the `client_max_body_size`. While the `upstream api-server` contains the name of the container the main service code is being ran in. This name is more of like an IP address of that container, with it the port the application is running in. You can change this if you ever change the port you are running the application in.

#### - Database
____
Each service has it's own database, the data of these databases are persisted locally, the `volumes` in each docker-compose file declaration is used to control this. If you remove this line and you run the docker-compose file, when you later stop the containers, the database data will be lost. The port mapping `5449:5432` means that, on your machine, the database is accessible via port 5449. This port is mapped to the database port in the container, this allows you to connect your PgAdmin to that port.

**NOTE: Please never delete a user data from the database directly. Try to use the API to perform your deletion except in rare cases where you know what you are doing!**

#### - RabbitMQ
____
Only the auth service has a container for RabbitMQ. You can connect to the RabbitMQ server once it is up and running via `localhost:15672`. The login credentials are the ones you will be setting in the `.rabbitmq.env`

___

### Running Everything via Docker
If this is your first time using docker in this project, the system will need to download some images which would be cached so they would not be downloaded next time you try running this. Please ensure you have enough internet data plan at least for the first time and a reasonable good network.

`make run-locally`: will spin each service up, running the app, the database for that server, RabbitMQ if the service is the auth-service. 
If you update any code in the corresponding service, the application will auto-reload. This command is similar to running `docker compose -f docker/compose-files/docker-compose.yml up -d`

`make stop-app-locally`: will stop only the service API app (i.e. the nodejs app)

`make kill-locally`: will stop the service and it's dependencies together with removing the volumes of the service.

`make build-locally`: this will rebuild the service, i.e. it will try downloading and installing npm package, because `--no-cache` is in the command.

`make follow-logs`: if you would like to see the logs of the NodeJS. It is recommended you run you spin each service up this way `make run-locally && make follow-logs`. 

___
___


## What does each service do?

### - Auth Service
The auth service serves as the primary gateway into the backend API. It gives authorization access code in the form of a bearer token to each user that requests. A user can use this register to create a new account, change their password etc.

### - Onboarding Service
Handles the onboarding of all the user types, the merchant and the agent. The api documentation has endpoint that does this, please check them for more information.

###  - Loan Service
This service was not worked on with priority as the business requirements changed along the line.

### - Store Service
Handles the creation of products, purchase requests, sales etc. This service was a work-in-progress especially around the confirmation of requests and fulfillments.

### - Messaging Service / SMS Service
This service is used to send SMS to the user's phone number. For testing purposes, you can change the `SMS_PROVIDER` in the environment variable to `LOCAL` instead of `TERMII`. Please add `SMS_PROVIDER_API_URL_SEND_MESSAGE` and `SMS_PROVIDER_API_KEY` in to the .env file or docker-compose environment section. You can check the dashboard of Termii to confirm these values.

___
___

## How does each service talk to each other?
The main communication technique for each service to talk to another service is to use an event queue. This is the reason why we included RabbitMQ in the auth-service. The auth-service spin up the RabbitMQ in which each service talks to. If this RabbitMQ container is down, each service that depends on it will not be able to communicate and might as well fail. For e.g. the SMS Service depends on this to know when it should send SMS. You can spin up any RabbitMQ either as a stand-alone on your machine or together with the auth-service, you simply need to update the ports and host of the RabbitMQ in each service's .env file

___
___

## How do you connect to the database manually?
Connecting to each service's database is quite simple, first you need to know how to SSH into the production or staging server. When you are able to do this, port forward the port of the service's database you want to connect to, e.g. the auth-service's database port is `5449`. This means you need to port forward your computer port `5449` to the server's port `5449`. Once this is successful open your PgAdmin, supply the username and password you have set for the database's .env and make use of `localhost` as the host and then the port you just port-forwarded.

___
___

## How do you deploy each service
The same way you have been running each service is the same way the application is deployed on the Staging Server. The only subtle difference is that I had to map the domain name of each service to the containing running it. This can be found in the server's nginx config folder, `/etc/nginx`.

___
___

## Where do all files uploaded go?
Each file uploaded are stored in a local S3 Bucket provider called MinIO. There is a container named `boosta-minio` in the onboarding-service. It includes the image for this provider, You can access the dashboard to see all the files uploaded via `localhost:9000`. Use the `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` to login. Note each service that wants to upload will need these environment variables in their own .env or docker-compose file environment.


___
___

## Testings, why are they failing?
Yes, testing was really recommended and was being written when the project started, but feature releases with speed was prioritized hence the testing had to be kept on hold.


___
___

## Credentials
Note, no login access is with me, everything was being requested from those who have the access, from digital ocean access, Termii and WhoGoHost.
