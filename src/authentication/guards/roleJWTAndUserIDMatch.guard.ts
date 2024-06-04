import BoostaRoles from "../../roles/roles.enum";
import { CanActivate, ExecutionContext, mixin, Type } from "@nestjs/common";
import RequestWithUser from "../requestWithUser.interface";
import { Observable } from "rxjs";
import JwtAuthenticationGuard from "./jwt-authentication.guard";

/**
 * A guard that checks if the user's role equate to the given one 
 * or checks if the user id matches the one in the url
 * @param role 
 * @returns 
 */
const RoleMatchOrUserIdMatchWithJWTGuard = (role: BoostaRoles): Type<CanActivate> => {
    class RoleGuardMixin extends JwtAuthenticationGuard {
        async canActivate(context: ExecutionContext) {
            await super.canActivate(context);
            const request = context.switchToHttp().getRequest<RequestWithUser>();
            const user = request.user
            return user?.role.includes(role) || user.id.includes(request.url);
        }
    }
    return mixin(RoleGuardMixin)
}
export default RoleMatchOrUserIdMatchWithJWTGuard;
