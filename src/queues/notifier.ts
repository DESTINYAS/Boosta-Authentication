import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import ConfirmationCode from '../confiramtionCode/entities/confirmationCode.entity';
import User from '../users/entities/user.entity';

export default class QueuesClientNotifier {

    constructor(
        @Inject("ONBOARDING_QUEUE_CONNECTION")
        private onboardingQueue: ClientProxy,
        @Inject("MESSAGING_QUEUE_CONNECTION")
        private messagingQueue: ClientProxy,
        @Inject("STORE_QUEUE_CONNECTION")
        private storeQueue: ClientProxy,
        private readonly configService: ConfigService
    ) { }

    notifyAllServicesOfNewUser(userData: User) {
        const data: any = {
            ...userData, userID: userData.id, id: undefined, hashedPassword: undefined
        }
        this.onboardingQueue.emit({ cmd: 'add-user' }, data)
        this.storeQueue.emit({ cmd: 'add-user' }, data)
    }

    notifyAllServicesOfPhoneVerified(userData: User) {
        const data: any = {
            ...userData, userID: userData.id, id: undefined, hashedPassword: undefined, profile: undefined
        }
        this.onboardingQueue.emit({ cmd: 'phone-verified' }, userData.id)
        this.storeQueue.emit({ cmd: 'phone-verified' }, userData.id)
    }

    notifyAllServicesOfDeletedUser(userData: User) {
        this.onboardingQueue.emit({ cmd: 'delete-user' }, {
            ...userData, userID: userData.id, id: undefined, hashedPassword: undefined
        })
        this.storeQueue.emit({ cmd: 'delete-user' }, {
            ...userData, userID: userData.id, id: undefined, hashedPassword: undefined
        })
    }

    notifyAllServicesOfUpdatedToken(userData: User) {
        this.onboardingQueue.emit({ cmd: 'update-user' }, {
            ...userData, userID: userData.id, id: undefined, hashedPassword: undefined
        })
        this.storeQueue.emit({ cmd: 'update-user' }, {
            ...userData, userID: userData.id, id: undefined, hashedPassword: undefined
        })
    }
    notifyAllServicesOfUpdatedPin(userData: User) {
        this.onboardingQueue.emit({ cmd: 'update-pin' }, {
            ...userData, userID: userData.id, id: undefined, hashedPassword: undefined
        })
        this.storeQueue.emit({ cmd: 'update-pin' }, {
            ...userData, userID: userData.id, id: undefined, hashedPassword: undefined
        })
    }
    notifyAllServicesOfChangePin(userData: User) {
        this.onboardingQueue.emit({ cmd: 'change-pin' }, {
            ...userData, userID: userData.id, id: undefined, hashedPassword: undefined
        })
        this.storeQueue.emit({ cmd: 'change-pin' }, {
            ...userData, userID: userData.id, id: undefined, hashedPassword: undefined
        })
    }
    notifyAllServicesOfChangePinWithCode(userData: User) {
        this.onboardingQueue.emit({ cmd: 'change-pin-with-code' }, {
            ...userData, userID: userData.id, id: undefined, hashedPassword: undefined
        })
        this.storeQueue.emit({ cmd: 'change-pin-with-code' }, {
            ...userData, userID: userData.id, id: undefined, hashedPassword: undefined
        })
    }

    sendConfirmationCode(data: ConfirmationCode) {
        this.messagingQueue.emit({ id: data.id, cmd: 'send-message', }, { ...data, reply_to_queue: this.configService.get("AUTH_SERVICE_QUEUE_NAME"), extras: { confirmationCodeID: data.id } })
    }
}