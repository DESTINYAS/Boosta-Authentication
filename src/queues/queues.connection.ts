import { ConfigService } from "@nestjs/config";
import { ClientProxyFactory, Transport } from "@nestjs/microservices";

export const OnboardingQueueConnectionProvider = {
    // connect to the queue
    provide: 'ONBOARDING_QUEUE_CONNECTION', useFactory: (configService: ConfigService) => {

        const user = configService.get('RABBITMQ_USER');
        const password = configService.get('RABBITMQ_PASSWORD');
        const host = configService.get('RABBITMQ_HOST');
        const queueName = configService.get('ONBOARDING_SERVICE_QUEUE_NAME');

        return ClientProxyFactory.create({
            transport: Transport.RMQ,
            options: {
                urls: [`amqps://${user}:${password}@${host}`],
                queue: queueName, noAck: false,
                queueOptions: {
                    // durable or transient, transient will be deleted on boot/restart
                    // performance does not differ in most cases
                    durable: true
                }
            }
        })

    },
    inject: [ConfigService]
}

export const MessagingQueueConnectionProvider = {
    // connect to the queue
    provide: 'MESSAGING_QUEUE_CONNECTION', useFactory: (configService: ConfigService) => {

        const user = configService.get('RABBITMQ_USER');
        const password = configService.get('RABBITMQ_PASSWORD');
        const host = configService.get('RABBITMQ_HOST');
        const queueName = configService.get('MESSAGING_SERVICE_QUEUE_NAME');

        return ClientProxyFactory.create({
            transport: Transport.RMQ,
            options: {
                urls: [`amqps://${user}:${password}@${host}`],
                queue: queueName, noAck: false,
                queueOptions: {
                    // durable or transient, transient will be deleted on boot/restart
                    // performance does not differ in most cases
                    durable: true
                }
            }
        })

    },
    inject: [ConfigService]
}

export const StoreQueueConnectionProvider = {
    // connect to the queue
    provide: 'STORE_QUEUE_CONNECTION', useFactory: (configService: ConfigService) => {

        const user = configService.get('RABBITMQ_USER');
        const password = configService.get('RABBITMQ_PASSWORD');
        const host = configService.get('RABBITMQ_HOST');
        const queueName = configService.get('STORE_SERVICE_QUEUE_NAME');

        return ClientProxyFactory.create({
            transport: Transport.RMQ,
            options: {
                urls: [`amqps://${user}:${password}@${host}`],
                queue: queueName, noAck: false,
                queueOptions: {
                    // durable or transient, transient will be deleted on boot/restart
                    // performance does not differ in most cases
                    durable: true
                }
            }
        })

    },
    inject: [ConfigService]
}