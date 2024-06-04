import QueuesClientNotifier from "../../queues/notifier"

export const mockINestMicroservice = {
    connect: jest.fn(),
    emit: jest.fn(),
    send: jest.fn()
}

export const mockQueuesClient = {
    notifyAllServicesOfNewUser: jest.fn(),
    notifyAllServicesOfDeletedUser: jest.fn(),
    sendConfirmationCode: jest.fn(),
    notifyAllServicesOfPhoneVerified: jest.fn(),
}


export const MockQueuesClientProvider = {
    provide: QueuesClientNotifier, useValue: mockQueuesClient,
}

export const MockOnboardingQueueConnectionProvider = {
    provide: 'ONBOARDING_QUEUE_CONNECTION', useValue: mockINestMicroservice,
}
export const MockMessagingQueueConnectionProvider = {
    provide: 'MESSAGING_QUEUE_CONNECTION', useValue: mockINestMicroservice,
}
export const MockStoreQueueConnectionProvider = {
    provide: 'STORE_QUEUE_CONNECTION', useValue: mockINestMicroservice,
}