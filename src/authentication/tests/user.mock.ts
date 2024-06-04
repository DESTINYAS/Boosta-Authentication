import User from "../../users/entities/user.entity";
import BoostaRoles from '../../roles/roles.enum';
import Gender from "../../users/entities/gender.enum";
import Profile from "../../users/entities/profile.entity";

export const MOCKED_USER_PASSWORD = "strongUserPASSWORD"
export const MOCKED_ADMIN_USER_PASSWORD = "strongAdminPASSWORD"
export const MOCKED_PASSWORD = "strongAdminPASSWORD"

export const mockProfile: Profile = {
    id: "1",
    homeAddress: "",
    isOnboarded: false,
    isPhoneVerified: false
}

const mockedUser: User = {
    id: "1",
    phoneNumber: '08008293921',
    firstName: 'John',
    lastName: 'John',
    middleName: 'John',
    isSuperUser: false,
    isActive: true,
    gender: Gender.Male,
    hashedPassword: '$2b$10$yDKeHUhKwm3QjmdcB3KmGeX40/poZ2G5ksITtY1bKFIAkc2D9QbuG', //MOCKED_USER_PASSWORD
    token: "token",
    hashedPurchasePin:"1234",
    email:"boosta@gmail.com",
    role: BoostaRoles.Merchant,
    profile: {
        id: "1",
        homeAddress: "",
        isOnboarded: false,
        isPhoneVerified: false
    },
    createdBy: new User,
    createdAt: new Date(),
    updatedAt: new Date()
}

export const mockedAdminUser: User = {
    id: "1",
    phoneNumber: '08008293922',
    firstName: 'Admin Felix',
    lastName: 'Akpan',
    middleName: 'F',
    isSuperUser: true,
    isActive: true,
    gender: Gender.Male,
    hashedPassword: '$2b$10$tYhyQO945w1V3EmcO5yo1el2oOdmNrBJVzYXHwoofEfYZsaOgzx1W', //MOCKED_ADMIN_USER_PASSWORD
    token: "token",
    hashedPurchasePin:"1234",
    email:"boosta@gmail.com",
    role: BoostaRoles.Admin,
    profile: {
        id: "1",
        homeAddress: "",
        isOnboarded: true,
        isPhoneVerified: true
    },
    createdBy: new User,
    createdAt: new Date(),
    updatedAt: new Date()
}

export const mockedAgentUser: User = {
    id: "3",
    phoneNumber: '08008293922',
    firstName: 'Agent Felix',
    lastName: 'Akpan',
    middleName: 'F',
    isSuperUser: false,
    isActive: true,
    gender: Gender.Male,
    hashedPassword: '$2b$10$tYhyQO945w1V3EmcO5yo1el2oOdmNrBJVzYXHwoofEfYZsaOgzx1W',
    token: "token",
    hashedPurchasePin:"1234",
    email:"boosta@gmail.com",
    role: BoostaRoles.Agent,
    profile: {
        id: "1",
        homeAddress: "",
        isOnboarded: false,
        isPhoneVerified: false
    },
    createdBy: new User,
    createdAt: new Date(),
    updatedAt: new Date()
}


export default mockedUser