export const mockedConfigService = {
    get(key: string) {
        switch (key) {
            case 'JWT_EXPIRATION_TIME':
                return '3600'
            case 'JWT_SECRET':
                return 'big-secret'
            case 'ADMIN_SIGN_UP_TOKEN':
                return 'big-secret'
            case 'PHONE_VERIFICATION_SECONDS_TO_EXPIRE':
                return "30"
            case 'NUMBER_OF_ROUNDS':
                return "5"
        }
    }
}