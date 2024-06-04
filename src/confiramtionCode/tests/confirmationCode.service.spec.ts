import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockMessagingQueueConnectionProvider, MockQueuesClientProvider, MockStoreQueueConnectionProvider, MockOnboardingQueueConnectionProvider } from '../../utils/mocks/microservice.mock';
import { ConfirmationCodeService } from '../confirmationCodeService';
import ConfirmationCode from '../entities/confirmationCode.entity';
import { mockedAgentUser } from '../../authentication/tests/user.mock';
import ConfirmationCodeTypes from '../entities/confirmationCodeTypes';
import QueuesClientNotifier from '../../queues/notifier';
import { ConfigService } from '@nestjs/config';
import { mockedConfigService } from '../../utils/mocks/config.service';

export const mockConfirmationCodeData: ConfirmationCode = {
    id: "1234",
    phoneNumber: "08020202020",
    value: "1234",
    secondsToExpire: 30,
    confirmationCodeType: ConfirmationCodeTypes.PHONE_NUMBER,
    createdAt: new Date(),
    updatedAt: new Date(),
    dateSent: null,
    messageSent: false,
    messagingID: "1234"
}
describe('ConfirmationCodeService', () => {
    let confirmationCodeService: ConfirmationCodeService;
    let findOne: jest.Mock;
    let createConfirmationCode: jest.Mock;
    let findOneBy: jest.Mock;
    let findConfirmationCodes: jest.Mock;
    let deleteConfirmationCode: jest.Mock;
    let markUsed: jest.Mock;
    let saveConfirmationCode: jest.Mock;
    let queuesClientsNotifier: QueuesClientNotifier;
    let mockConfCodeData: ConfirmationCode

    const userData = mockedAgentUser;

    beforeEach(async () => {
        findOne = jest.fn();
        findOneBy = jest.fn();
        findConfirmationCodes = jest.fn();
        createConfirmationCode = jest.fn();
        markUsed = jest.fn();
        deleteConfirmationCode = jest.fn();
        saveConfirmationCode = jest.fn().mockResolvedValue(Promise.resolve())
        mockConfCodeData = {
            ...mockConfirmationCodeData, phoneNumber: userData.phoneNumber
        }


        const module = await Test.createTestingModule({
            providers: [ConfirmationCodeService,
                {
                    provide: getRepositoryToken(ConfirmationCode), useValue: {
                        findOne, create: createConfirmationCode, save: saveConfirmationCode, findOneBy: findOneBy, find: findConfirmationCodes, delete: markUsed, update: jest.fn().mockResolvedValue(Promise.resolve())
                    }
                },
                {
                    provide: ConfigService,
                    useValue: mockedConfigService,
                },
                MockQueuesClientProvider,
                MockOnboardingQueueConnectionProvider,
                MockMessagingQueueConnectionProvider,
                MockStoreQueueConnectionProvider,
            ]
        }).compile()
        confirmationCodeService = await module.get(ConfirmationCodeService)
        queuesClientsNotifier = await module.get(QueuesClientNotifier);
    })

    describe('user should be able to create confirmation code', () => {
        beforeEach(() => {
            createConfirmationCode.mockReturnValue(mockConfCodeData)
            findConfirmationCodes.mockResolvedValue(undefined)
            saveConfirmationCode.mockReturnValue(mockConfCodeData)
        })
        it('should be able to create the confirmation code', async () => {
            const confCode = await confirmationCodeService.createConfirmationCode(userData, ConfirmationCodeTypes.PHONE_NUMBER);
            expect(confCode).toBe(mockConfCodeData);
        });

    });

    describe('when confirmation is sent to the queue', () => {
        it('should attempt to emit the message to the messaging queue', async () => {
            const sendConfirmationCode = jest.spyOn(queuesClientsNotifier, 'sendConfirmationCode');
            await confirmationCodeService.sendConfirmationCode(mockConfCodeData);
            expect(sendConfirmationCode).toBeCalledTimes(1);
        })
    })

    describe('when confirmation is actually sent by the messaging service', () => {
        beforeEach(() => {
            findOne.mockResolvedValue(mockConfCodeData)
        })
        it('should update the confirmation code sent field and the messaging ID', async () => {
            const messageSentData: MessageSentData = {
                "extras": {
                    "confirmationCodeID": "1234"
                },
                "messageID": "12345",
                "timeSent": new Date(),
                "messageSent": true
            }
            const confCode = await confirmationCodeService.updateConfirmationCodeSentDetails(messageSentData);
            expect(confCode).toBe(mockConfCodeData);
        })
    })

    describe('when a user has used a confirmation code ', () => {
        beforeEach(() => {
            markUsed.mockResolvedValue({
                affected: 1
            })
            findOne.mockResolvedValue(undefined)
        })
        it('should be deleted', async () => {
            await confirmationCodeService.markUsed(mockConfCodeData.id);
            await expect(confirmationCodeService.getConfirmationCode("1234")).rejects.toThrow()
        })
    });

    describe('when a user tries retrieving the confirmation code', () => {
        describe('and the confirmation code exists', () => {
            beforeEach(() => {
                findOne.mockReturnValue(mockConfCodeData)
            })
            it('should return the confirmation code', async () => {
                const confCode = await confirmationCodeService.getConfirmationCode("12345");
                expect(confCode).toBe(mockConfCodeData);
            })
        })

        describe('and the confirmation code does not exists', () => {
            beforeEach(() => {
                findOne.mockReturnValue(undefined)
            })
            it('should throw an error', async () => {
                await expect(confirmationCodeService.getConfirmationCode("12345")).rejects.toThrow()
            })
        })

        describe('and the confirmation expires time has elapsed', () => {
            beforeEach(() => {
                findOne.mockReturnValue({
                    ...mockConfCodeData, createdAt: new Date(2021, 12, 12)
                })
            })
            it('should throw an error', async () => {
                await expect(confirmationCodeService.throwExceptionIfNotValid("12345")).rejects.toThrow()
            })
        })
    });


    describe('when a user wants to re-request a confirmation code', () => {
        describe('and the code expiring seconds has indeed expired ', () => {
            beforeEach(() => {
                findOne.mockReturnValue({
                    ...mockConfCodeData, createdAt: new Date(2021, 12, 12)
                })
                // for recreation method
                findOneBy.mockReturnValue(undefined)
                createConfirmationCode.mockReturnValue(mockConfCodeData)
                findConfirmationCodes.mockResolvedValue(undefined)
                saveConfirmationCode.mockReturnValue(mockConfCodeData)
                // being used for delete
                markUsed.mockResolvedValue({
                    affected: 1
                })
            })
            it('should generate a new one for the user', async () => {
                const confCode = await confirmationCodeService.regenerateConfirmationCodeIfExpired(userData, "12345");
                expect(confCode).toBe(mockConfCodeData);
            })
        })
        describe('and the code expiring seconds has not expired ', () => {
            beforeEach(() => {
                findOne.mockReturnValue({
                    ...mockConfCodeData, createdAt: new Date()
                })
            })
            it('should throw an error', async () => {
                await expect(confirmationCodeService.regenerateConfirmationCodeIfExpired(userData, "12345")).rejects.toThrow()
            })
        })
    })

});