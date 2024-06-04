
import { HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';


/**
 * A method that hashes the plain password supplied by the user.
 * @param plainPassword The plain password supplied by the user
 * @returns The user's database record if there is a user that matches the will be hashed password.
 */
export async function hashPassword(plainPassword: string, rounds: number) {
    return await bcrypt.hash(plainPassword, Number.parseInt(rounds.toString()));
}


/**
 * A method that compares the hashed password and the plain password provided.
 * @param plainTextPassword The plain password to hash and compare for verification.
 * @param hashedPassword The hashed password stored in the database
 */
export async function verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
) {
    const isPasswordMatching = await bcrypt.compare(
        plainTextPassword,
        hashedPassword,
    );
    if (!isPasswordMatching) {
        throw new HttpException(
            'Wrong credentials provided',
            HttpStatus.BAD_REQUEST,
        );
    }
}