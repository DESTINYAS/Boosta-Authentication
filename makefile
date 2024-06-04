# local 
refresh-db:
	rm -rf dist
	rm -r docker/compose-files/dev-data
	docker compose -f docker/compose-files/docker-compose.local.yml kill down
	docker compose -f docker/compose-files/docker-compose.local.yml rm -vf --remove-orphans
	
# run db and rabbitmq only
start-local: 
	docker compose -f docker/compose-files/docker-compose.local.yml up
	# docker compose -f docker/compose-files/docker-compose.local.yml logs -f boosta-auth-db
	
kill-local:
	docker compose -f docker/compose-files/docker-compose.local.yml down
	
create-network:
	docker network create boosta-network

# * Local:  development
run-locally:
	docker compose -f docker/compose-files/docker-compose.yml up -d

build-locally:
	docker compose -f docker/compose-files/docker-compose.yml build --no-cache

# * start app
build-app-locally:
	docker compose -f docker/compose-files/docker-compose.yml build boosta-auth-app
	
stop-app-locally:
	docker compose -f docker/compose-files/docker-compose.yml stop boosta-auth-app

# * end app

stop-locally:
	docker compose -f docker/compose-files/docker-compose.yml stop

kill-locally:
	docker compose -f docker/compose-files/docker-compose.yml down
	docker compose -f docker/compose-files/docker-compose.yml rm -vf

follow-logs:
	docker compose -f docker/compose-files/docker-compose.yml logs -f boosta-auth-app
