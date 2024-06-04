import { ExcludeNullInterceptor } from './utils/excludeNullI.interceptors';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerDocumentOptions, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // * Removes undefined or null values from input and output data
  app.useGlobalPipes(new ValidationPipe({}))
  app.enableCors({
    "origin": "*",
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "preflightContinue": false,
    "optionsSuccessStatus": 204
  })

  const configService = app.get(ConfigService)
  const user = configService.get('RABBITMQ_USER');
  const password = configService.get('RABBITMQ_PASSWORD');
  const host = configService.get('RABBITMQ_HOST');
  const serviceQueue = configService.get('AUTH_SERVICE_QUEUE_NAME');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://${user}:${password}@${host}`],
      queue: serviceQueue,
      noAck: false,
      prefetchCount: 1,
      queueOptions: {
        // durable or transient, transient will be deleted on boot/restart, durable stores it on disk
        // performance does not differ in most cases
        durable: true
      }
    }
  })
  await app.startAllMicroservices()

  // Do not return null values to the user
  // ! Must come before the ClassSerializerInterceptor
  // app.useGlobalInterceptors(new ExcludeNullInterceptor())

  // * enables the use of class-transformer
  app.useGlobalInterceptors(new ClassSerializerInterceptor(
    app.get(Reflector))
  );

  const config = new DocumentBuilder()
    .setTitle('Boosta B2B Auth HTTP API')
    .setDescription('This API handles all the logic around authentication in the product.')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build()

  const options: SwaggerDocumentOptions = {
    operationIdFactory: (
      controllerKey: string,
      methodKey: string
    ) => methodKey
  };
  const document = SwaggerModule.createDocument(app, config, options)
  SwaggerModule.setup('api', app, document)

  await app.listen(process.env.PORT);
}
bootstrap();
