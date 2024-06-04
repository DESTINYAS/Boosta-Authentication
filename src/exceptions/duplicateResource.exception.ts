import { ConflictException } from "@nestjs/common"

export default class DuplicateResourceException extends ConflictException {
    constructor(resourceName: string, duplicatedItemTitle: string, whatWasDuplicated: string = 'title') {
        super(`${resourceName} with the ${whatWasDuplicated} ${duplicatedItemTitle} already exist, try with another ${whatWasDuplicated}.`)
    }
}