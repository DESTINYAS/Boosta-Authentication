import { ForbiddenException } from "@nestjs/common";

export default class BoostaForbiddenException extends ForbiddenException {
    constructor(message: string = "You are not allowed to perform this action.") {
        super(message)
    }
}